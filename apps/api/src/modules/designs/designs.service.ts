import {
  configSchemaFor,
  MAX_SAVED_DESIGNS,
  websiteConfigSchema,
  type SavedDesign,
  type SavedDesignSummary,
  type WebsiteConfig,
} from '@prajzo/shared';
import { templateFor } from '@prajzo/shared/templates';
import type { HydratedDocument } from 'mongoose';
import { z } from 'zod';
import { AppError } from '../../lib/errors';
import type { UserDocument } from '../auth/user.model';
import { SavedDesignModel, type SavedDesignRecord } from './saved-design.model';

type DesignDocument = HydratedDocument<SavedDesignRecord> & { createdAt: Date; updatedAt: Date };

/** Someone else's design, or one that doesn't exist, look the same: not found. */
const notFound = () => new AppError(404, 'NOT_FOUND', "We couldn't find that design.");

/**
 * Checks a configuration against its own template (both layers, architecture 5.3). Problems are
 * reported with their place in the design, such as config.pages.0.sections.1.content.heading.
 */
export function checkedConfig(config: unknown): WebsiteConfig {
  const key = (config as { template?: { key?: unknown } } | null)?.template?.key;
  const template = typeof key === 'string' ? templateFor(key) : undefined;
  if (!template) {
    throw new AppError(
      400,
      'VALIDATION_FAILED',
      'This design is for a template that does not exist.',
      {
        'config.template.key': 'Choose one of the templates',
      },
    );
  }
  return z.object({ config: configSchemaFor(template) }).parse({ config }).config;
}

function toSummary(design: DesignDocument): SavedDesignSummary {
  const key = design.templateKey;
  return {
    id: design.id,
    name: design.name,
    templateKey: key,
    templateName: templateFor(key)?.name ?? key,
    createdAt: design.createdAt.toISOString(),
    updatedAt: design.updatedAt.toISOString(),
  };
}

function toDesign(design: DesignDocument): SavedDesign {
  // Stored designs were checked when saved; reading them back through the schema keeps the
  // answer honest even if a template's rules have since changed.
  return { ...toSummary(design), config: websiteConfigSchema.parse(design.config) };
}

async function ownDesign(owner: UserDocument, id: string): Promise<DesignDocument> {
  if (!/^[0-9a-f]{24}$/i.test(id)) throw notFound();
  const design = await SavedDesignModel.findOne({ _id: id, owner: owner._id });
  if (!design) throw notFound();
  return design;
}

async function makeRoom(owner: UserDocument): Promise<void> {
  if ((await SavedDesignModel.countDocuments({ owner: owner._id })) >= MAX_SAVED_DESIGNS) {
    throw new AppError(
      409,
      'CONFLICT',
      `You can keep up to ${String(MAX_SAVED_DESIGNS)} designs. Delete one you no longer need first.`,
    );
  }
}

export async function listDesigns(owner: UserDocument): Promise<SavedDesignSummary[]> {
  const designs = await SavedDesignModel.find({ owner: owner._id })
    .sort({ updatedAt: -1, _id: -1 })
    .select('-config');
  return designs.map(toSummary);
}

export async function getDesign(owner: UserDocument, id: string): Promise<SavedDesign> {
  return toDesign(await ownDesign(owner, id));
}

export async function createDesign(
  owner: UserDocument,
  input: { name: string; config: unknown },
): Promise<SavedDesign> {
  const config = checkedConfig(input.config);
  await makeRoom(owner);
  const design = await SavedDesignModel.create({
    owner: owner._id,
    name: input.name,
    templateKey: config.template.key,
    templateVersion: config.template.version,
    config,
  });
  return toDesign(design);
}

export async function updateDesign(
  owner: UserDocument,
  id: string,
  change: { name?: string | undefined; config?: unknown },
): Promise<SavedDesign> {
  const design = await ownDesign(owner, id);
  const set: Record<string, unknown> = {};
  if (change.name !== undefined) set.name = change.name;
  if (change.config !== undefined) {
    const config = checkedConfig(change.config);
    if (config.template.key !== design.templateKey) {
      throw new AppError(400, 'VALIDATION_FAILED', 'A design keeps its template.', {
        'config.template.key': 'A design keeps its template',
      });
    }
    set.config = config;
    set.templateVersion = config.template.version;
  }
  const updated = await SavedDesignModel.findOneAndUpdate(
    { _id: design._id, owner: owner._id },
    { $set: set },
    { returnDocument: 'after' },
  );
  if (!updated) throw notFound();
  return toDesign(updated);
}

export async function duplicateDesign(owner: UserDocument, id: string): Promise<SavedDesign> {
  const design = await ownDesign(owner, id);
  await makeRoom(owner);
  const copy = await SavedDesignModel.create({
    owner: owner._id,
    name: `${design.name.slice(0, 52)} (copy)`,
    templateKey: design.templateKey,
    templateVersion: design.templateVersion,
    config: design.config as unknown,
  });
  return toDesign(copy);
}

export async function deleteDesign(owner: UserDocument, id: string): Promise<void> {
  const result = await SavedDesignModel.deleteOne({
    _id: (await ownDesign(owner, id))._id,
    owner: owner._id,
  });
  if (result.deletedCount !== 1) throw notFound();
}
