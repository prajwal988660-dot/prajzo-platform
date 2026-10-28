import { zodResolver } from '@hookform/resolvers/zod';
import {
  adminCategoryListSchema,
  adminTemplateInputSchema,
  adminTemplateListSchema,
  adminTemplateResponseSchema,
  type AdminCategory,
  type AdminTemplateEntry,
} from '@prajzo/shared';
import { ArrowLeft, FolderSearch } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useParams } from 'react-router';
import { z } from 'zod';
import { Container } from '../../components/layout/Container';
import { Alert } from '../../components/ui/Alert';
import { Button, ButtonLink } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { CheckboxField, TextAreaField, TextField } from '../../components/ui/Field';
import { LoadError, LoadingBlock } from '../../components/ui/LoadStates';
import { apiRequest } from '../../lib/api';
import { applyServerFieldErrors, submitErrorMessage } from '../../lib/form-errors';
import { useApi } from '../../lib/use-api';
import { usePageTitle } from '../../lib/use-page-title';
import { linesOf, toLines, wholeNumber } from './form-fields';

const shape = adminTemplateInputSchema.shape;

/** What the form holds is text; each field becomes what the server expects, then is checked. */
const templateFormSchema = z.object({
  name: shape.name,
  tagline: shape.tagline,
  description: shape.description,
  categories: z.array(z.string()).pipe(shape.categories),
  features: linesOf(shape.features),
  featured: z.boolean(),
  published: z.boolean(),
  order: wholeNumber(z.number().int().min(0).max(999, 'Use 999 or less')),
  previewAlt: shape.previewAlt,
});
type Values = z.input<typeof templateFormSchema>;
type Parsed = z.output<typeof templateFormSchema>;

const serverFields = [
  'name',
  'tagline',
  'description',
  'categories',
  'features',
  'featured',
  'published',
  'order',
  'previewAlt',
] as const;

/**
 * Edits a template's catalogue listing (D-005): the words, categories and whether it is shown.
 * The design itself is in code, so it is changed by a developer, not here.
 */
export function AdminTemplateFormPage() {
  const { key = '' } = useParams();
  const templates = useApi('/v1/admin/templates', adminTemplateListSchema);
  const categories = useApi('/v1/admin/categories', adminCategoryListSchema);
  const template = templates.data?.items.find((item) => item.key === key);
  usePageTitle(template ? `Edit ${template.name}` : 'Edit template');

  if (templates.status === 'loading' || categories.status === 'loading') {
    return (
      <Container className="py-16">
        <LoadingBlock label="Loading the template" />
      </Container>
    );
  }
  const failed =
    templates.status === 'error' ? templates : categories.status === 'error' ? categories : null;
  if (failed?.status === 'error') {
    return (
      <Container className="py-16">
        <LoadError message={failed.error.message} onRetry={failed.retry} />
      </Container>
    );
  }
  if (!template || categories.status !== 'success') {
    return (
      <Container className="py-16 sm:py-24">
        <EmptyState
          icon={FolderSearch}
          title="We couldn't find that template"
          headingLevel={1}
          description="The link may be wrong."
          action={<ButtonLink to="/admin/templates">Back to templates</ButtonLink>}
        />
      </Container>
    );
  }
  return (
    <Container className="py-8 sm:py-12">
      <Link
        to="/admin/templates"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-indigo underline underline-offset-2"
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        Templates
      </Link>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight">Edit {template.name}</h1>
      <p className="mt-2 max-w-2xl text-slate-600">
        What the Templates pages say about this design. The design itself is changed by a developer.
      </p>
      <div className="mt-8 max-w-3xl">
        <TemplateForm template={template} categories={categories.data.items} />
      </div>
    </Container>
  );
}

function TemplateForm({
  template,
  categories,
}: {
  template: AdminTemplateEntry;
  categories: AdminCategory[];
}) {
  const navigate = useNavigate();
  const [failure, setFailure] = useState<string | null>(null);
  const form = useForm<Values, unknown, Parsed>({
    resolver: zodResolver(templateFormSchema),
    defaultValues: {
      name: template.name,
      tagline: template.tagline,
      description: template.description,
      categories: template.categories.map((category) => category.key),
      features: toLines(template.features),
      featured: template.featured,
      published: template.published,
      order: String(template.order),
      previewAlt: template.previewImage.alt,
    },
  });
  const { errors, isSubmitting } = form.formState;

  const submit = async (values: Parsed) => {
    setFailure(null);
    try {
      await apiRequest(
        `/v1/admin/templates/${encodeURIComponent(template.key)}`,
        adminTemplateResponseSchema,
        { method: 'PATCH', body: JSON.stringify(values) },
      );
      void navigate('/admin/templates', { state: { saved: `“${values.name}” was saved.` } });
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
        <TextField label="Name" required error={errors.name?.message} {...form.register('name')} />
        <TextField
          label="Short line"
          required
          hint="Shown under the name on the Templates page."
          error={errors.tagline?.message}
          {...form.register('tagline')}
        />
        <TextAreaField
          label="Description"
          required
          rows={4}
          hint="Shown on the template's own page."
          error={errors.description?.message}
          {...form.register('description')}
        />
        <fieldset
          className="grid gap-2"
          aria-describedby={errors.categories ? 'categories-error' : 'categories-hint'}
        >
          <legend className="text-sm font-semibold text-ink">Suits these kinds of website</legend>
          <p id="categories-hint" className="text-sm text-slate-600">
            One to four. Hidden website types are left off the public page.
          </p>
          <div className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
            {categories.map((category) => (
              <label key={category.key} className="flex items-start gap-2.5 text-sm">
                <input
                  type="checkbox"
                  value={category.key}
                  className="mt-0.5 size-4 shrink-0 accent-brand-indigo"
                  {...form.register('categories')}
                />
                <span>
                  {category.title}
                  {category.active ? '' : ' (hidden)'}
                </span>
              </label>
            ))}
          </div>
          {errors.categories ? (
            <p id="categories-error" className="text-sm font-medium text-red-700">
              {errors.categories.message}
            </p>
          ) : null}
        </fieldset>
        <TextAreaField
          label="What it includes"
          required
          rows={6}
          hint="One feature per line, up to 8. The first four show on the Templates page."
          error={errors.features?.message}
          {...form.register('features')}
        />
        <TextAreaField
          label="Description of the preview picture"
          required
          rows={2}
          hint="For people who can't see the picture."
          error={errors.previewAlt?.message}
          {...form.register('previewAlt')}
        />
        <TextField
          label="Display order"
          required
          inputMode="numeric"
          autoComplete="off"
          hint="Lower numbers come first, after the featured templates."
          error={errors.order?.message}
          {...form.register('order')}
        />
        <CheckboxField
          label="Featured"
          hint="Featured templates come first, and show on the home page."
          {...form.register('featured')}
        />
        <CheckboxField
          label="Show on the website"
          hint="Untick to hide the template and its page. Its live demo address keeps working."
          {...form.register('published')}
        />
        {failure && (
          <Alert tone="error" title="This wasn't saved">
            {failure}
          </Alert>
        )}
        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" loading={isSubmitting}>
            {isSubmitting ? 'Saving…' : 'Save changes'}
          </Button>
          <ButtonLink to="/admin/templates" variant="ghost">
            Cancel
          </ButtonLink>
        </div>
      </form>
    </Card>
  );
}
