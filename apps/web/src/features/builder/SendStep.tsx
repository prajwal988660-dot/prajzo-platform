import { zodResolver } from '@hookform/resolvers/zod';
import {
  categoryListSchema,
  contactPreferenceLabels,
  contactPreferences,
  designSubmissionSchema,
  fontCatalogue,
  projectResponseSchema,
  servicePackageListSchema,
  type DefinedTemplate,
  type DesignSubmissionFormValues,
} from '@prajzo/shared';
import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { useNavigate } from 'react-router';
import { Alert } from '../../components/ui/Alert';
import { Button, ButtonLink } from '../../components/ui/Button';
import { SelectField, TextAreaField, TextField } from '../../components/ui/Field';
import { LoadError, LoadingBlock } from '../../components/ui/LoadStates';
import { apiRequest } from '../../lib/api';
import { submitErrorMessage } from '../../lib/form-errors';
import { useApi } from '../../lib/use-api';
import { sectionNames } from './steps';
import type { Builder } from './use-builder';

/**
 * The last step (Phase 14): what the design says, then sending it to Prajzo as a project request.
 *
 * Only a design that has been saved can be sent, because the server reads the design from the
 * account rather than trusting anything the browser sends. Everything the design already answers
 * (the website, its pages, its look) is shown rather than asked for again.
 */

/** One line of the summary. */
function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-0.5 sm:grid-cols-[11rem_1fr] sm:gap-4">
      <dt className="text-sm font-semibold text-slate-700">{label}</dt>
      <dd className="text-sm text-slate-600">{children}</dd>
    </div>
  );
}

export function SendStep({
  builder,
  template,
  design,
}: {
  builder: Builder;
  template: DefinedTemplate;
  /** The saved design being edited. Sending needs one, so this step asks for a save first. */
  design: { id: string; name: string } | null;
}) {
  const navigate = useNavigate();
  const categories = useApi('/v1/categories', categoryListSchema);
  const packages = useApi('/v1/packages', servicePackageListSchema);
  const [failure, setFailure] = useState<string | null>(null);

  const form = useForm<DesignSubmissionFormValues>({
    resolver: zodResolver(designSubmissionSchema),
    defaultValues: {
      designId: design?.id ?? '',
      categoryKey: '',
      packageKey: 'not-sure',
      contactPreference: 'email',
      phone: '',
      notes: '',
    },
  });
  const { errors, isSubmitting } = form.formState;
  // useWatch, not form.watch: watch() returns a function the React Compiler cannot memoize.
  const wantsPhone = useWatch({ control: form.control, name: 'contactPreference' }) !== 'email';

  const { config } = builder;
  const pages = config.pages.filter((page) => page.enabled);

  if (!design || builder.unsaved) {
    return (
      <div className="grid gap-4">
        <h2 className="text-xl font-semibold">Send this design to us</h2>
        <Alert tone="info" title={design ? 'Save your changes first' : 'Save your design first'}>
          We read the design from your account when you send it, so it has to be saved first. Go
          back to <strong>Save</strong>, then come back here.
        </Alert>
      </div>
    );
  }

  if (categories.status === 'error' || packages.status === 'error') {
    const error = categories.error ?? packages.error;
    return (
      <LoadError
        message={error?.message ?? 'Something went wrong. Please try again.'}
        onRetry={() => {
          if (categories.status === 'error') categories.retry();
          if (packages.status === 'error') packages.retry();
        }}
      />
    );
  }
  if (categories.status === 'loading' || packages.status === 'loading') {
    return <LoadingBlock label="Loading the form" />;
  }

  const send = async (values: DesignSubmissionFormValues) => {
    setFailure(null);
    try {
      const { project } = await apiRequest(
        '/v1/project-requests/from-design',
        projectResponseSchema,
        { method: 'POST', body: JSON.stringify({ ...values, designId: design.id }) },
      );
      // The project page is the confirmation: the reference number, the status and the timeline.
      void navigate(`/account/projects/${project.reference}`);
    } catch (error) {
      setFailure(submitErrorMessage(error, 'Something went wrong. Please try again.'));
    }
  };

  return (
    <div className="grid gap-6">
      <div className="grid gap-2">
        <h2 className="text-xl font-semibold">Send this design to us</h2>
        <p className="text-slate-600">
          We read your saved design, keep a copy of it exactly as it is now, and start a project
          from it. You will get a reference number and a quote before anything is built or paid for.
        </p>
      </div>

      <section
        aria-labelledby="summary-heading"
        className="rounded-2xl border border-slate-200 p-5"
      >
        <h3 id="summary-heading" className="text-base font-semibold">
          What you are sending
        </h3>
        <dl className="mt-3 grid gap-2.5">
          <Fact label="Design">{design.name}</Fact>
          <Fact label="Template">{template.name}</Fact>
          <Fact label="Website name">{config.site.name}</Fact>
          {config.site.tagline ? <Fact label="Tagline">{config.site.tagline}</Fact> : null}
          <Fact label={`Pages (${String(pages.length)})`}>
            {pages.map((page) => page.title).join(', ')}
          </Fact>
          <Fact label="Sections">
            {pages
              .flatMap((page) =>
                page.sections
                  .filter((section) => section.enabled)
                  .map((section) => sectionNames[section.type]),
              )
              .join(', ')}
          </Fact>
          <Fact label="Colours">
            <span className="inline-flex items-center gap-2">
              <span
                aria-hidden="true"
                className="inline-block size-4 rounded-full border border-slate-300"
                style={{ background: config.design.colors.primary }}
              />
              {config.design.colors.primary}
              <span
                aria-hidden="true"
                className="ml-2 inline-block size-4 rounded-full border border-slate-300"
                style={{ background: config.design.colors.accent }}
              />
              {config.design.colors.accent}
            </span>
          </Fact>
          <Fact label="Typefaces">
            {fontCatalogue[config.design.fonts.heading].name} for headings,{' '}
            {fontCatalogue[config.design.fonts.body].name} for text
          </Fact>
        </dl>
        <p className="mt-4 text-sm text-slate-500">
          Changing or deleting this design later will not change what you sent us.
        </p>
      </section>

      <form
        className="grid gap-5"
        noValidate
        onSubmit={(event) => void form.handleSubmit(send)(event)}
      >
        <SelectField
          label="What kind of website is this?"
          hint="So we can quote it like any other project."
          error={errors.categoryKey?.message}
          {...form.register('categoryKey')}
        >
          <option value="">Choose one…</option>
          {categories.data.items.map((category) => (
            <option key={category.key} value={category.key}>
              {category.title}
            </option>
          ))}
          <option value="other">Something else</option>
        </SelectField>

        <SelectField
          label="Which package suits you?"
          hint="A guide only. We confirm the price in the quote."
          error={errors.packageKey?.message}
          {...form.register('packageKey')}
        >
          <option value="not-sure">Not sure yet</option>
          {packages.data.items.map((item) => (
            <option key={item.key} value={item.key}>
              {item.name}
            </option>
          ))}
        </SelectField>

        <TextField
          label="When would you like it? (optional)"
          type="date"
          hint="A wish, not a promise. We agree a date with you later."
          error={errors.preferredDate?.message}
          {...form.register('preferredDate')}
        />

        <SelectField
          label="How should we reach you?"
          error={errors.contactPreference?.message}
          {...form.register('contactPreference')}
        >
          {contactPreferences.map((preference) => (
            <option key={preference} value={preference}>
              {contactPreferenceLabels[preference]}
            </option>
          ))}
        </SelectField>

        {wantsPhone ? (
          <TextField
            label="Your phone number"
            type="tel"
            inputMode="tel"
            error={errors.phone?.message}
            {...form.register('phone')}
          />
        ) : null}

        <TextAreaField
          label="Anything else we should know? (optional)"
          rows={4}
          hint="Changes you want, content you already have, anything you are unsure about."
          error={errors.notes?.message}
          {...form.register('notes')}
        />

        {failure ? (
          <Alert tone="error" title="This wasn't sent">
            {failure}
          </Alert>
        ) : null}

        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" loading={isSubmitting}>
            {isSubmitting ? 'Sending…' : 'Send as a project'}
          </Button>
          <ButtonLink to="/account/designs" variant="ghost">
            My saved designs
          </ButtonLink>
        </div>
      </form>
    </div>
  );
}
