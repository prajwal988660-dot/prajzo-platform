import type { Category, ServicePackage } from '@prajzo/shared';
import { defaultCategories, defaultPackages } from './catalogue.defaults';
import { CategoryModel, ServicePackageModel } from './catalogue.models';

export async function listCategories(): Promise<Category[]> {
  const records = await CategoryModel.find({ active: true })
    .sort({ sortOrder: 1, title: 1 })
    .lean();
  return records.map(({ key, title, description, icon, useCases, deliveryTier }) => ({
    key,
    title,
    description,
    icon,
    useCases,
    deliveryTier,
  }));
}

export async function listPackages(): Promise<ServicePackage[]> {
  const records = await ServicePackageModel.find({ active: true }).sort({ sortOrder: 1 }).lean();
  return records.map(
    ({ key, name, summary, deliveryTier, scope, priceMode, priceAmountPaise }) => ({
      key,
      name,
      summary,
      deliveryTier,
      scope,
      priceMode,
      priceAmountPaise: priceAmountPaise ?? null,
      currency: 'INR' as const,
    }),
  );
}

/** The title of an active category, or null when there is no such category. */
export async function findActiveCategoryTitle(key: string): Promise<string | null> {
  const category = await CategoryModel.findOne({ key, active: true }).select('title').lean();
  return category?.title ?? null;
}

/** The name of an active package, or null when there is no such package. */
export async function findActivePackageName(key: string): Promise<string | null> {
  const servicePackage = await ServicePackageModel.findOne({ key, active: true })
    .select('name')
    .lean();
  return servicePackage?.name ?? null;
}

export async function isActiveCategory(key: string): Promise<boolean> {
  return (await CategoryModel.exists({ key, active: true })) !== null;
}

export async function isActivePackage(key: string): Promise<boolean> {
  return (await ServicePackageModel.exists({ key, active: true })) !== null;
}

/**
 * Adds any missing default categories and packages. Existing records are left alone, so later
 * edits (by an admin, in Phase 5) are never overwritten, unless `overwrite` is set, which the
 * development seed script uses to refresh the defaults.
 */
export async function ensureCatalogueDefaults({ overwrite = false } = {}): Promise<{
  categories: number;
  packages: number;
}> {
  const operator = overwrite ? '$set' : '$setOnInsert';
  await CategoryModel.bulkWrite(
    defaultCategories.map((category) => ({
      updateOne: {
        filter: { key: category.key },
        update: { [operator]: category },
        upsert: true,
      },
    })),
  );
  await ServicePackageModel.bulkWrite(
    defaultPackages.map((servicePackage) => ({
      updateOne: {
        filter: { key: servicePackage.key },
        update: { [operator]: servicePackage },
        upsert: true,
      },
    })),
  );
  return {
    categories: await CategoryModel.countDocuments(),
    packages: await ServicePackageModel.countDocuments(),
  };
}
