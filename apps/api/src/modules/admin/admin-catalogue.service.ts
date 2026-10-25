import {
  formatRupees,
  type AdminCategory,
  type AdminPackage,
  type CategoryCreate,
  type CategoryInput,
  type PackageCreate,
  type PackageInput,
} from '@prajzo/shared';
import { isDuplicateKeyError } from '../../db/errors';
import { AppError } from '../../lib/errors';
import { CategoryModel, ServicePackageModel } from '../catalogue/catalogue.models';

const notFound = (what: string) => new AppError(404, 'NOT_FOUND', `We couldn't find that ${what}.`);
const keyTaken = (what: string) =>
  new AppError(409, 'CONFLICT', `A ${what} with this key already exists.`, {
    key: `Choose a different key: this one is already used`,
  });

type CategoryRecord = Awaited<ReturnType<typeof CategoryModel.findOne>>;
type PackageRecord = Awaited<ReturnType<typeof ServicePackageModel.findOne>>;

function toAdminCategory(record: NonNullable<CategoryRecord>): AdminCategory {
  return {
    key: record.key,
    title: record.title,
    description: record.description,
    icon: record.icon,
    useCases: record.useCases,
    deliveryTier: record.deliveryTier,
    sortOrder: record.sortOrder ?? 0,
    active: record.active ?? true,
  };
}

function toAdminPackage(record: NonNullable<PackageRecord>): AdminPackage {
  return {
    key: record.key,
    name: record.name,
    summary: record.summary,
    deliveryTier: record.deliveryTier,
    scope: record.scope,
    priceMode: record.priceMode,
    priceAmountPaise: record.priceAmountPaise ?? null,
    currency: 'INR',
    sortOrder: record.sortOrder ?? 0,
    active: record.active ?? true,
  };
}

/** The names of the fields whose values differ, for the activity log ("title, description"). */
function changedFields<T extends object>(before: T, after: T): string[] {
  return (Object.keys(after) as (keyof T)[])
    .filter((field) => JSON.stringify(before[field]) !== JSON.stringify(after[field]))
    .map(String);
}

// ---------- Categories

/** Every category, including the ones that are switched off. */
export async function listAdminCategories(): Promise<AdminCategory[]> {
  const records = await CategoryModel.find({}).sort({ sortOrder: 1, title: 1 });
  return records.map(toAdminCategory);
}

export async function createCategory(
  input: CategoryCreate,
): Promise<{ category: AdminCategory; summary: string }> {
  try {
    const record = await CategoryModel.create(input);
    return {
      category: toAdminCategory(record),
      summary: `Added the category "${record.title}"`,
    };
  } catch (error) {
    if (isDuplicateKeyError(error)) throw keyTaken('category');
    throw error;
  }
}

export async function updateCategory(
  key: string,
  input: CategoryInput,
): Promise<{ category: AdminCategory; summary: string }> {
  const before = await CategoryModel.findOne({ key });
  if (!before) throw notFound('category');
  const previous = toAdminCategory(before);
  const record = await CategoryModel.findOneAndUpdate(
    { key },
    { $set: input },
    { returnDocument: 'after' },
  );
  if (!record) throw notFound('category');
  const category = toAdminCategory(record);

  const changed = changedFields(previous, category);
  const summary =
    changed.length === 1 && changed[0] === 'active'
      ? `${category.active ? 'Switched on' : 'Switched off'} the category "${category.title}"`
      : `Edited the category "${category.title}"${changed.length > 0 ? ` (${changed.join(', ')})` : ''}`;
  return { category, summary };
}

// ---------- Packages

export async function listAdminPackages(): Promise<AdminPackage[]> {
  const records = await ServicePackageModel.find({}).sort({ sortOrder: 1, name: 1 });
  return records.map(toAdminPackage);
}

export async function createPackage(
  input: PackageCreate,
): Promise<{ package: AdminPackage; summary: string }> {
  try {
    const record = await ServicePackageModel.create({ ...input, currency: 'INR' });
    return { package: toAdminPackage(record), summary: `Added the package "${record.name}"` };
  } catch (error) {
    if (isDuplicateKeyError(error)) throw keyTaken('package');
    throw error;
  }
}

export async function updatePackage(
  key: string,
  input: PackageInput,
): Promise<{ package: AdminPackage; summary: string }> {
  const before = await ServicePackageModel.findOne({ key });
  if (!before) throw notFound('package');
  const previous = toAdminPackage(before);
  const record = await ServicePackageModel.findOneAndUpdate(
    { key },
    { $set: input },
    { returnDocument: 'after' },
  );
  if (!record) throw notFound('package');
  const servicePackage = toAdminPackage(record);

  const changed = changedFields(previous, servicePackage);
  const price = (item: AdminPackage) =>
    item.priceAmountPaise === null ? 'a quote' : formatRupees(item.priceAmountPaise);
  let summary = `Edited the package "${servicePackage.name}"${changed.length > 0 ? ` (${changed.join(', ')})` : ''}`;
  if (changed.length === 1 && changed[0] === 'active') {
    summary = `${servicePackage.active ? 'Switched on' : 'Switched off'} the package "${servicePackage.name}"`;
  } else if (changed.includes('priceAmountPaise') || changed.includes('priceMode')) {
    summary = `Changed the price of "${servicePackage.name}" from ${price(previous)} to ${price(servicePackage)}${changed.length > 1 ? ` (and ${changed.filter((f) => f !== 'priceAmountPaise' && f !== 'priceMode').join(', ') || 'price display'})` : ''}`;
  }
  return { package: servicePackage, summary };
}
