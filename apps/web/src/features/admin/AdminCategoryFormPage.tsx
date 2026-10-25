import { zodResolver } from '@hookform/resolvers/zod';
import {
  adminCategoryListSchema,
  adminCategoryResponseSchema,
  categoryIcons,
  categoryInputSchema,
  deliveryTierLabels,
  deliveryTiers,
  keySchema,
  type AdminCategory,
} from '@prajzo/shared';
import { ArrowLeft, FolderSearch } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { Link, useNavigate, useParams } from 'react-router';
import { z } from 'zod';
import { Container } from '../../components/layout/Container';
import { Alert } from '../../components/ui/Alert';
import { Button, ButtonLink } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { CheckboxField, SelectField, TextAreaField, TextField } from '../../components/ui/Field';
import { LoadError, LoadingBlock } from '../../components/ui/LoadStates';
import { apiRequest } from '../../lib/api';
import { applyServerFieldErrors, submitErrorMessage } from '../../lib/form-errors';
import { useApi } from '../../lib/use-api';
import { usePageTitle } from '../../lib/use-page-title';
import { CategoryIcon } from '../marketing/components/CategoryIcon';
import { deliveryTierHint, linesOf, toLines, wholeNumber } from './form-fields';

const shape = categoryInputSchema.shape;

/** What the form holds is text; each field is turned into what the server expects, then checked. */
const categoryFields = z.object({
  title: shape.title,
  description: shape.description,
  icon: z.string().pipe(shape.icon),
  useCases: linesOf(shape.useCases),
  deliveryTier: z.string().pipe(shape.deliveryTier),
  sortOrder: wholeNumber(shape.sortOrder),
  active: z.boolean(),
});
/** Editing leaves the key alone, so an existing key is never checked again. */
const categoryFormSchema = categoryFields.extend({ key: z.string().trim() });
/** A new key must follow the rules for keys. */
const categoryCreateFormSchema = categoryFields.extend({ key: keySchema });
type Values = z.input<typeof categoryFormSchema>;
type Parsed = z.output<typeof categoryFormSchema>;

const serverFields = [
  'key',
  'title',
  'description',
  'icon',
  'useCases',
  'deliveryTier',
  'sortOrder',
  'active',
] as const;

/** Adds a website type, or edits one that exists. */
export function AdminCategoryFormPage() {
  const { key } = useParams();
  // Moving between "new" and an existing type starts a fresh form.
  return key === undefined ? (
    <PageFrame title="Add a website type">
      <CategoryForm key="new" />
    </PageFrame>
  ) : (
    <EditCategory key={key} categoryKey={key} />
  );
}

function EditCategory({ categoryKey }: { categoryKey: string }) {
  const categories = useApi('/v1/admin/categories', adminCategoryListSchema);
  const category = categories.data?.items.find((item) => item.key === categoryKey);
  usePageTitle(category ? `Edit ${category.title}` : 'Edit website type');

  if (categories.status === 'loading') {
    return (
      <Container className="py-16">
        <LoadingBlock label="Loading the website type" />
      </Container>
    );
  }
  if (categories.status === 'error') {
    return (
      <Container className="py-16">
        <LoadError message={categories.error.message} onRetry={categories.retry} />
      </Container>
    );
  }
  if (!category) {
    return (
      <Container className="py-16 sm:py-24">
        <EmptyState
          icon={FolderSearch}
          title="We couldn't find that website type"
          headingLevel={1}
          description="It may have been renamed, or the link is wrong."
          action={<ButtonLink to="/admin/catalogue">Back to the catalogue</ButtonLink>}
        />
      </Container>
    );
  }
  return (
    <PageFrame title={`Edit ${category.title}`}>
      <CategoryForm category={category} />
    </PageFrame>
  );
}

function PageFrame({ title, children }: { title: string; children: ReactNode }) {
  usePageTitle(title);
  return (
    <Container className="py-8 sm:py-12">
      <Link
        to="/admin/catalogue"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-indigo underline underline-offset-2"
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        Catalogue
      </Link>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight">{title}</h1>
      <div className="mt-8 max-w-3xl">{children}</div>
    </Container>
  );
}

function CategoryForm({ category }: { category?: AdminCategory }) {
  const creating = category === undefined;
  const navigate = useNavigate();
  const [failure, setFailure] = useState<string | null>(null);
  const form = useForm<Values, unknown, Parsed>({
    resolver: zodResolver(creating ? categoryCreateFormSchema : categoryFormSchema),
    defaultValues: {
      key: category?.key ?? '',
      title: category?.title ?? '',
      description: category?.description ?? '',
      icon: category?.icon ?? '',
      useCases: toLines(category?.useCases ?? []),
      deliveryTier: category?.deliveryTier ?? '',
      sortOrder: category ? String(category.sortOrder) : '',
      active: category?.active ?? true,
    },
  });
  const { errors, isSubmitting } = form.formState;
  const icon = useWatch({ control: form.control, name: 'icon' });
  const tier = useWatch({ control: form.control, name: 'deliveryTier' });

  const submit = async ({ key, ...fields }: Parsed) => {
    setFailure(null);
    try {
      await apiRequest(
        creating
          ? '/v1/admin/categories'
          : `/v1/admin/categories/${encodeURIComponent(category.key)}`,
        adminCategoryResponseSchema,
        {
          method: creating ? 'POST' : 'PATCH',
          body: JSON.stringify(creating ? { key, ...fields } : fields),
        },
      );
      void navigate('/admin/catalogue', {
        state: { saved: `“${fields.title}” was ${creating ? 'added' : 'saved'}.` },
      });
    } catch (error) {
      applyServerFieldErrors(form.setError, error, serverFields);
      setFailure(submitErrorMessage(error, 'Something went wrong. Please try again.'));
    }
  };

  return (
    <Card>
      <form
        noValidate
        onSubmit={(event) => void form.handleSubmit(submit)(event)}
        className="grid gap-5"
      >
        {creating ? (
          <TextField
            label="Key"
            required
            autoComplete="off"
            spellCheck={false}
            hint="Lower-case letters and numbers joined by dashes, for example online-shop. It can't be changed later."
            error={errors.key?.message}
            {...form.register('key')}
          />
        ) : (
          <p className="text-sm text-slate-600">
            Key: <span className="font-mono text-ink">{category.key}</span> (it can&apos;t be
            changed)
          </p>
        )}
        <TextField
          label="Title"
          required
          error={errors.title?.message}
          {...form.register('title')}
        />
        <TextAreaField
          label="Description"
          required
          rows={3}
          hint="One or two sentences visitors see on the Services page."
          error={errors.description?.message}
          {...form.register('description')}
        />
        <div className="grid items-start gap-4 sm:grid-cols-[1fr_auto]">
          <SelectField
            label="Icon"
            required
            error={errors.icon?.message}
            {...form.register('icon')}
          >
            <option value="">Choose an icon…</option>
            {categoryIcons.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </SelectField>
          <span
            aria-hidden="true"
            className="grid size-11 place-items-center rounded-xl bg-indigo-50 text-brand-indigo sm:mt-7"
          >
            {icon ? <CategoryIcon name={icon} className="size-5" /> : null}
          </span>
        </div>
        <TextAreaField
          label="Examples"
          rows={4}
          hint="What this kind of website is used for, one example per line (up to 8)."
          error={errors.useCases?.message}
          {...form.register('useCases')}
        />
        <SelectField
          label="How quickly it is usually delivered"
          required
          hint={deliveryTierHint(tier)}
          error={errors.deliveryTier?.message}
          {...form.register('deliveryTier')}
        >
          <option value="">Choose…</option>
          {deliveryTiers.map((tier) => (
            <option key={tier} value={tier}>
              {deliveryTierLabels[tier].name}
            </option>
          ))}
        </SelectField>
        <TextField
          label="Display order"
          required
          inputMode="numeric"
          autoComplete="off"
          hint="Lower numbers come first. Use 10, 20, 30… to leave room for new items."
          error={errors.sortOrder?.message}
          {...form.register('sortOrder')}
        />
        <CheckboxField
          label="Show on the website"
          hint="Untick to hide it from visitors. Projects that already use it are not affected."
          {...form.register('active')}
        />

        {failure && (
          <Alert tone="error" title="This wasn't saved">
            {failure}
          </Alert>
        )}
        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" loading={isSubmitting}>
            {isSubmitting ? 'Saving…' : creating ? 'Add website type' : 'Save changes'}
          </Button>
          <ButtonLink to="/admin/catalogue" variant="ghost">
            Cancel
          </ButtonLink>
        </div>
      </form>
    </Card>
  );
}
