import type {
  AdminDemoSubmission,
  AdminDemoSubmissionList,
  AdminTemplateEntry,
  AdminTemplateInput,
  DemoSubmissionStatus,
  PaginationQuery,
  TemplateEntry,
  TemplateKey,
} from '@prajzo/shared';
import { templateFor } from '@prajzo/shared/templates';
import mongoose from 'mongoose';
import { AppError } from '../../lib/errors';
import { CategoryModel } from '../catalogue/catalogue.models';
import { DemoSubmissionModel, type DemoSubmissionRecord } from '../demos/demo-submission.model';
import { defaultTemplateEntries } from './template-catalogue.defaults';
import { TemplateEntryModel, type TemplateEntryRecord } from './template-entry.model';

const templateNotFound = () => new AppError(404, 'NOT_FOUND', "We couldn't find that template.");

type EntryDocument = TemplateEntryRecord & { updatedAt: Date };

/** Adds the catalogue listing of any template that has none yet; never changes existing ones. */
export async function ensureTemplateEntries(): Promise<number> {
  const operations = (Object.entries(defaultTemplateEntries) as [TemplateKey, unknown][]).map(
    ([key, entry]) => ({
      updateOne: {
        filter: { key },
        update: { $setOnInsert: { key, ...(entry as object) } },
        upsert: true,
      },
    }),
  );
  if (operations.length) await TemplateEntryModel.bulkWrite(operations);
  return TemplateEntryModel.countDocuments();
}

/** The names of the categories now, so a renamed category shows its new name everywhere. */
async function categoryTitles(keys: string[]): Promise<Map<string, string>> {
  if (!keys.length) return new Map();
  const categories = await CategoryModel.find({
    key: mongoose.trusted({ $in: [...new Set(keys)] }),
  }).select('key title active');
  return new Map(categories.filter((c) => c.active).map((c) => [c.key, c.title]));
}

function toEntry(entry: EntryDocument, titles: Map<string, string>): TemplateEntry {
  const key = entry.key;
  return {
    key,
    name: entry.name,
    tagline: entry.tagline,
    description: entry.description,
    categories: entry.categories.flatMap((category) => {
      const title = titles.get(category);
      return title ? [{ key: category, title }] : [];
    }),
    features: [...entry.features],
    featured: entry.featured,
    previewImage: { src: `/demo/${key}/preview.webp`, alt: entry.previewAlt },
    demoPath: `/demo/${key}`,
  };
}

function toAdminEntry(entry: EntryDocument, titles: Map<string, string>): AdminTemplateEntry {
  return {
    ...toEntry(entry, titles),
    published: entry.published,
    order: entry.order,
    updatedAt: entry.updatedAt.toISOString(),
  };
}

const catalogueOrder = { featured: -1, order: 1, name: 1 } as const;

/** Published templates whose design exists in code, featured first, then in the admins' order. */
export async function listPublishedTemplates(): Promise<TemplateEntry[]> {
  const entries = (await TemplateEntryModel.find({ published: true }).sort(catalogueOrder)).filter(
    (entry) => templateFor(entry.key),
  );
  const titles = await categoryTitles(entries.flatMap((entry) => entry.categories));
  return entries.map((entry) => toEntry(entry, titles));
}

export async function getPublishedTemplate(requested: string): Promise<TemplateEntry> {
  if (!templateFor(requested)) throw templateNotFound();
  const key = requested as TemplateKey;
  const entry = await TemplateEntryModel.findOne({ key, published: true });
  if (!entry) throw templateNotFound();
  return toEntry(entry, await categoryTitles(entry.categories));
}

export async function listAdminTemplates(): Promise<AdminTemplateEntry[]> {
  const entries = await TemplateEntryModel.find().sort(catalogueOrder);
  const titles = await categoryTitles(entries.flatMap((entry) => entry.categories));
  return entries.map((entry) => toAdminEntry(entry, titles));
}

/** Changes a template's listing. Returns it, and a one-line summary for the activity log. */
export async function updateTemplate(
  requested: string,
  input: AdminTemplateInput,
): Promise<{ template: AdminTemplateEntry; summary: string }> {
  if (!templateFor(requested)) throw templateNotFound();
  const key = requested as TemplateKey;
  const existing = await CategoryModel.find({
    key: mongoose.trusted({ $in: input.categories }),
  }).select('key');
  const known = new Set(existing.map((category) => category.key));
  const missing = input.categories.filter((category) => !known.has(category));
  if (missing.length) {
    throw new AppError(400, 'VALIDATION_FAILED', 'Some details need fixing.', {
      categories: `These categories don't exist: ${missing.join(', ')}`,
    });
  }

  const before = await TemplateEntryModel.findOne({ key });
  if (!before) throw templateNotFound();
  const updated = await TemplateEntryModel.findOneAndUpdate(
    { key },
    {
      $set: {
        name: input.name,
        tagline: input.tagline,
        description: input.description,
        categories: [...new Set(input.categories)],
        features: input.features,
        featured: input.featured,
        published: input.published,
        order: input.order,
        previewAlt: input.previewAlt,
      },
    },
    { returnDocument: 'after' },
  );
  if (!updated) throw templateNotFound();

  const changes: string[] = [];
  if (before.published !== updated.published) {
    changes.push(updated.published ? 'published it' : 'hid it');
  }
  if (before.featured !== updated.featured) {
    changes.push(updated.featured ? 'featured it' : 'stopped featuring it');
  }
  if (before.order !== updated.order) changes.push(`moved it to position ${String(updated.order)}`);
  const textChanged =
    before.name !== updated.name ||
    before.tagline !== updated.tagline ||
    before.description !== updated.description ||
    before.previewAlt !== updated.previewAlt ||
    before.categories.join() !== updated.categories.join() ||
    before.features.join('\n') !== updated.features.join('\n');
  if (textChanged) changes.push('edited its listing');
  const summary = changes.length
    ? `${updated.name} template: ${changes.join(', ')}`
    : `${updated.name} template: saved without changes`;

  return {
    template: toAdminEntry(updated, await categoryTitles(updated.categories)),
    summary,
  };
}

// ---------- The demo inbox

type SubmissionDocument = DemoSubmissionRecord & { id: string; createdAt: Date };

function toSubmission(submission: SubmissionDocument): AdminDemoSubmission {
  return {
    id: submission.id,
    form: submission.form,
    template: submission.template,
    name: submission.name,
    email: submission.email,
    message: submission.message ?? null,
    phone: submission.phone ?? null,
    organisation: submission.organisation ?? null,
    choice: submission.choice ?? null,
    quantity: submission.quantity ?? null,
    status: submission.status,
    createdAt: submission.createdAt.toISOString(),
    expiresAt: submission.expiresAt.toISOString(),
  };
}

/** Messages from the live demos, newest first. They delete themselves after 7 days. */
export async function listDemoSubmissions({
  status,
  template,
  page,
  limit,
}: PaginationQuery & {
  status: 'all' | DemoSubmissionStatus;
  template?: TemplateKey | undefined;
}): Promise<AdminDemoSubmissionList> {
  const filter: Record<string, unknown> = {};
  if (status !== 'all') filter.status = status;
  if (template) filter.template = template;
  const [items, total] = await Promise.all([
    DemoSubmissionModel.find(filter)
      .sort({ createdAt: -1, _id: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    DemoSubmissionModel.countDocuments(filter),
  ]);
  return { items: items.map(toSubmission), page, limit, total };
}

export async function updateDemoSubmissionStatus(
  id: string,
  status: DemoSubmissionStatus,
): Promise<{ submission: AdminDemoSubmission; before: DemoSubmissionStatus }> {
  const notFound = new AppError(404, 'NOT_FOUND', "We couldn't find that message.");
  if (!/^[0-9a-f]{24}$/i.test(id)) throw notFound;
  const before = await DemoSubmissionModel.findById(id);
  if (!before) throw notFound;
  const updated = await DemoSubmissionModel.findOneAndUpdate(
    { _id: id },
    { $set: { status } },
    { returnDocument: 'after' },
  );
  if (!updated) throw notFound;
  return { submission: toSubmission(updated), before: before.status };
}
