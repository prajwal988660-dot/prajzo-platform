import { zodResolver } from '@hookform/resolvers/zod';
import {
  adminPackageListSchema,
  adminPackageResponseSchema,
  deliveryTierLabels,
  deliveryTiers,
  keySchema,
  packageInputSchema,
  priceModes,
  type AdminPackage,
  type PriceMode,
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
import { ApiError, apiRequest } from '../../lib/api';
import { applyServerFieldErrors, submitErrorMessage } from '../../lib/form-errors';
import { useApi } from '../../lib/use-api';
import { usePageTitle } from '../../lib/use-page-title';
import {
  deliveryTierHint,
  linesOf,
  rupeesFromPaise,
  rupeesText,
  toLines,
  wholeNumber,
} from './form-fields';

const shape = packageInputSchema.shape;

const priceModeLabels: Record<PriceMode, string> = {
  quote: 'Request a quote',
  from: 'Starting from',
  fixed: 'Fixed price',
};

/** What visitors will see for each way of showing the price. */
const priceModeHints: Record<PriceMode, string> = {
  quote: 'Visitors see “Request a quote”, with no price.',
  from: 'Visitors see “Starting from” and the price.',
  fixed: 'Visitors see the price.',
};

/**
 * What the form holds is text; each field is turned into what the server expects, then checked.
 * The price is typed in rupees. It must be empty for "Request a quote" and filled in otherwise.
 */
function packageFormSchemaWith(key: z.ZodString) {
  return z
    .object({
      key,
      name: shape.name,
      summary: shape.summary,
      deliveryTier: z.string().pipe(shape.deliveryTier),
      scope: linesOf(shape.scope),
      priceMode: z.string().pipe(shape.priceMode),
      price: z
        .string()
        .trim()
        .superRefine((value, context) => {
          if (value === '') return;
          const checked = rupeesText.safeParse(value);
          if (checked.success) return;
          for (const issue of checked.error.issues) {
            context.addIssue({ code: 'custom', message: issue.message });
          }
        }),
      sortOrder: wholeNumber(shape.sortOrder),
      active: z.boolean(),
    })
    .refine((value) => value.priceMode !== 'quote' || value.price === '', {
      path: ['price'],
      error: 'Leave the price empty when it is shown as "Request a quote"',
      when: (payload) => !payload.issues.some((issue) => issue.path?.[0] === 'priceMode'),
    })
    .refine((value) => value.priceMode === 'quote' || value.price !== '', {
      path: ['price'],
      error: 'Enter the price',
      when: (payload) => !payload.issues.some((issue) => issue.path?.[0] === 'priceMode'),
    });
}
/** Editing leaves the key alone, so an existing key is never checked again. */
const packageFormSchema = packageFormSchemaWith(z.string().trim());
/** A new key must follow the rules for keys. */
const packageCreateFormSchema = packageFormSchemaWith(keySchema);
type Values = z.input<typeof packageFormSchema>;
type Parsed = z.output<typeof packageFormSchema>;

const serverFields = [
  'key',
  'name',
  'summary',
  'deliveryTier',
  'scope',
  'priceMode',
  'priceAmountPaise',
  'sortOrder',
  'active',
] as const;

/** Adds a package, or edits one that exists, including its price. */
export function AdminPackageFormPage() {
  const { key } = useParams();
  // Moving between "new" and an existing package starts a fresh form.
  return key === undefined ? (
    <PageFrame title="Add a package">
      <PackageForm key="new" />
    </PageFrame>
  ) : (
    <EditPackage key={key} packageKey={key} />
  );
}

function EditPackage({ packageKey }: { packageKey: string }) {
  const packages = useApi('/v1/admin/packages', adminPackageListSchema);
  const servicePackage = packages.data?.items.find((item) => item.key === packageKey);
  usePageTitle(servicePackage ? `Edit ${servicePackage.name}` : 'Edit package');

  if (packages.status === 'loading') {
    return (
      <Container className="py-16">
        <LoadingBlock label="Loading the package" />
      </Container>
    );
  }
  if (packages.status === 'error') {
    return (
      <Container className="py-16">
        <LoadError message={packages.error.message} onRetry={packages.retry} />
      </Container>
    );
  }
  if (!servicePackage) {
    return (
      <Container className="py-16 sm:py-24">
        <EmptyState
          icon={FolderSearch}
          title="We couldn't find that package"
          headingLevel={1}
          description="It may have been renamed, or the link is wrong."
          action={<ButtonLink to="/admin/catalogue">Back to the catalogue</ButtonLink>}
        />
      </Container>
    );
  }
  return (
    <PageFrame title={`Edit ${servicePackage.name}`}>
      <PackageForm servicePackage={servicePackage} />
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

function PackageForm({ servicePackage }: { servicePackage?: AdminPackage }) {
  const creating = servicePackage === undefined;
  const navigate = useNavigate();
  const [failure, setFailure] = useState<string | null>(null);
  const form = useForm<Values, unknown, Parsed>({
    resolver: zodResolver(creating ? packageCreateFormSchema : packageFormSchema),
    defaultValues: {
      key: servicePackage?.key ?? '',
      name: servicePackage?.name ?? '',
      summary: servicePackage?.summary ?? '',
      deliveryTier: servicePackage?.deliveryTier ?? '',
      scope: toLines(servicePackage?.scope ?? []),
      priceMode: servicePackage?.priceMode ?? '',
      price:
        servicePackage?.priceAmountPaise != null
          ? rupeesFromPaise(servicePackage.priceAmountPaise)
          : '',
      sortOrder: servicePackage ? String(servicePackage.sortOrder) : '',
      active: servicePackage?.active ?? true,
    },
  });
  const { errors, isSubmitting } = form.formState;
  const priceMode = useWatch({ control: form.control, name: 'priceMode' });
  const tier = useWatch({ control: form.control, name: 'deliveryTier' });

  const submit = async ({ key, price, ...fields }: Parsed) => {
    setFailure(null);
    const body = { ...fields, priceAmountPaise: price === '' ? null : rupeesText.parse(price) };
    try {
      await apiRequest(
        creating
          ? '/v1/admin/packages'
          : `/v1/admin/packages/${encodeURIComponent(servicePackage.key)}`,
        adminPackageResponseSchema,
        {
          method: creating ? 'POST' : 'PATCH',
          body: JSON.stringify(creating ? { key, ...body } : body),
        },
      );
      void navigate('/admin/catalogue', {
        state: { saved: `“${fields.name}” was ${creating ? 'added' : 'saved'}.` },
      });
    } catch (error) {
      applyServerFieldErrors(form.setError, error, serverFields);
      // The server names the price by its stored name; show it beside the box people type in.
      const priceError = error instanceof ApiError ? error.fields?.priceAmountPaise : undefined;
      if (priceError) form.setError('price', { message: priceError });
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
            hint="Lower-case letters and numbers joined by dashes, for example business-plus. It can't be changed later."
            error={errors.key?.message}
            {...form.register('key')}
          />
        ) : (
          <p className="text-sm text-slate-600">
            Key: <span className="font-mono text-ink">{servicePackage.key}</span> (it can&apos;t be
            changed)
          </p>
        )}
        <TextField label="Name" required error={errors.name?.message} {...form.register('name')} />
        <TextAreaField
          label="Summary"
          required
          rows={3}
          hint="One or two sentences visitors see on the Pricing page."
          error={errors.summary?.message}
          {...form.register('summary')}
        />
        <TextAreaField
          label="What it includes"
          rows={5}
          hint="One item per line (up to 12)."
          error={errors.scope?.message}
          {...form.register('scope')}
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
        <div className="grid items-start gap-4 sm:grid-cols-2">
          <SelectField
            label="How the price is shown"
            required
            hint={
              (priceModes as readonly string[]).includes(priceMode)
                ? priceModeHints[priceMode as PriceMode]
                : undefined
            }
            error={errors.priceMode?.message}
            {...form.register('priceMode')}
          >
            <option value="">Choose…</option>
            {priceModes.map((mode) => (
              <option key={mode} value={mode}>
                {priceModeLabels[mode]}
              </option>
            ))}
          </SelectField>
          <TextField
            label="Price (₹)"
            required={priceMode !== 'quote'}
            inputMode="decimal"
            autoComplete="off"
            hint={
              priceMode === 'quote'
                ? 'Leave empty. Visitors see “Request a quote”.'
                : 'In rupees, for example 7999.'
            }
            error={errors.price?.message}
            {...form.register('price')}
          />
        </div>
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
            {isSubmitting ? 'Saving…' : creating ? 'Add package' : 'Save changes'}
          </Button>
          <ButtonLink to="/admin/catalogue" variant="ghost">
            Cancel
          </ButtonLink>
        </div>
      </form>
    </Card>
  );
}
