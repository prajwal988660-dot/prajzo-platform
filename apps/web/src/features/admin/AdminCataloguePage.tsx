import {
  adminCategoryListSchema,
  adminPackageListSchema,
  deliveryTierLabels,
  type AdminCategory,
  type AdminPackage,
} from '@prajzo/shared';
import { Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { Container } from '../../components/layout/Container';
import { Alert } from '../../components/ui/Alert';
import { Badge } from '../../components/ui/Badge';
import { ButtonLink } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { LoadError, LoadingBlock } from '../../components/ui/LoadStates';
import { describePrice } from '../../lib/format';
import { useApi } from '../../lib/use-api';
import { usePageTitle } from '../../lib/use-page-title';
import { CategoryIcon } from '../marketing/components/CategoryIcon';

/** The kinds of website Prajzo builds and the packages with their prices. Both are editable here. */
export function AdminCataloguePage() {
  usePageTitle('Catalogue');
  const categories = useApi('/v1/admin/categories', adminCategoryListSchema);
  const packages = useApi('/v1/admin/packages', adminPackageListSchema);
  // A form that has just saved sends the admin back here with a message. It is kept in this
  // page and removed from the address, so reloading the page does not show it again.
  const location = useLocation();
  const navigate = useNavigate();
  const [saved] = useState(() => (location.state as { saved?: string } | null)?.saved);
  useEffect(() => {
    if (saved) void navigate('.', { replace: true, state: null });
  }, [saved, navigate]);

  return (
    <Container className="py-10 sm:py-14">
      <h1 className="text-3xl font-semibold tracking-tight">Catalogue</h1>
      <p className="mt-2 max-w-2xl text-slate-600">
        What visitors see on the Services and Pricing pages and in the project form. Changes reach
        the website within about a minute. Items you hide disappear from the website but stay here,
        and projects that already use them are not affected.
      </p>

      {saved && (
        <Alert tone="success" title="Saved" className="mt-6">
          {saved}
        </Alert>
      )}

      <section aria-labelledby="categories-heading" className="mt-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="categories-heading" className="text-xl font-semibold tracking-tight">
            Website types
          </h2>
          <ButtonLink to="/admin/catalogue/categories/new" variant="secondary" size="sm">
            <Plus aria-hidden="true" className="size-4" />
            Add a website type
          </ButtonLink>
        </div>
        <div className="mt-4">
          {categories.status === 'loading' && <LoadingBlock label="Loading the website types" />}
          {categories.status === 'error' && (
            <LoadError message={categories.error.message} onRetry={categories.retry} />
          )}
          {categories.status === 'success' &&
            (categories.data.items.length === 0 ? (
              <EmptyState
                title="No website types yet"
                description="Add the first kind of website you build."
              />
            ) : (
              <ul aria-label="Website types" className="grid gap-4">
                {categories.data.items.map((category) => (
                  <CategoryRow key={category.key} category={category} />
                ))}
              </ul>
            ))}
        </div>
      </section>

      <section aria-labelledby="packages-heading" className="mt-12">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="packages-heading" className="text-xl font-semibold tracking-tight">
            Packages and prices
          </h2>
          <ButtonLink to="/admin/catalogue/packages/new" variant="secondary" size="sm">
            <Plus aria-hidden="true" className="size-4" />
            Add a package
          </ButtonLink>
        </div>
        <div className="mt-4">
          {packages.status === 'loading' && <LoadingBlock label="Loading the packages" />}
          {packages.status === 'error' && (
            <LoadError message={packages.error.message} onRetry={packages.retry} />
          )}
          {packages.status === 'success' &&
            (packages.data.items.length === 0 ? (
              <EmptyState
                title="No packages yet"
                description="Add the first package, with its price."
              />
            ) : (
              <ul aria-label="Packages" className="grid gap-4">
                {packages.data.items.map((servicePackage) => (
                  <PackageRow key={servicePackage.key} servicePackage={servicePackage} />
                ))}
              </ul>
            ))}
        </div>
      </section>
    </Container>
  );
}

function CategoryRow({ category }: { category: AdminCategory }) {
  return (
    <li>
      <Card className="flex flex-wrap items-start justify-between gap-4 p-5">
        <div className="flex min-w-0 items-start gap-4">
          <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-indigo-50 text-brand-indigo">
            <CategoryIcon name={category.icon} className="size-5" />
          </span>
          <div className="min-w-0">
            <p className="text-base font-semibold text-ink">{category.title}</p>
            <p className="mt-1 text-sm text-slate-600">{category.description}</p>
            <p className="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-600">
              <span className="font-mono">{category.key}</span>
              <Badge tone="brand">{deliveryTierLabels[category.deliveryTier].name}</Badge>
              {!category.active && <Badge tone="warning">Hidden</Badge>}
            </p>
          </div>
        </div>
        <Link
          to={`/admin/catalogue/categories/${category.key}`}
          className="shrink-0 text-sm font-semibold text-brand-indigo underline underline-offset-2"
        >
          Edit <span className="sr-only">{category.title}</span>
        </Link>
      </Card>
    </li>
  );
}

function PackageRow({ servicePackage }: { servicePackage: AdminPackage }) {
  const price = describePrice(servicePackage);
  return (
    <li>
      <Card className="flex flex-wrap items-start justify-between gap-4 p-5">
        <div className="min-w-0">
          <p className="text-base font-semibold text-ink">{servicePackage.name}</p>
          <p className="mt-1 text-sm text-slate-600">{servicePackage.summary}</p>
          <p className="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-600">
            <span className="font-mono">{servicePackage.key}</span>
            <Badge tone="brand">
              {price.amount ? `${price.label}: ${price.amount}` : price.label}
            </Badge>
            {!servicePackage.active && <Badge tone="warning">Hidden</Badge>}
          </p>
        </div>
        <Link
          to={`/admin/catalogue/packages/${servicePackage.key}`}
          className="shrink-0 text-sm font-semibold text-brand-indigo underline underline-offset-2"
        >
          Edit <span className="sr-only">{servicePackage.name}</span>
        </Link>
      </Card>
    </li>
  );
}
