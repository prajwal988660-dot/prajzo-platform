import { zodResolver } from '@hookform/resolvers/zod';
import {
  contactPreferenceLabels,
  contactPreferences,
  projectFeatureLabels,
  projectFeatures,
  projectIntegrationLabels,
  projectIntegrations,
  projectRequestSchema,
  projectResponseSchema,
  todayInIndia,
  type Category,
  type ProjectDetail,
  type ProjectRequest,
  type ProjectRequestFormValues,
  type PublicUser,
  type ServicePackage,
} from '@prajzo/shared';
import { Send } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { Alert } from '../../components/ui/Alert';
import { Button, ButtonLink } from '../../components/ui/Button';
import {
  CheckboxField,
  FieldGroup,
  SelectField,
  TextAreaField,
  TextField,
} from '../../components/ui/Field';
import { apiRequest } from '../../lib/api';
import { applyServerFieldErrors, submitErrorMessage } from '../../lib/form-errors';
import { describePrice } from '../../lib/format';

type Outcome =
  { kind: 'idle' } | { kind: 'sent'; project: ProjectDetail } | { kind: 'failed'; message: string };

const fieldNames = [
  'title',
  'categoryKey',
  'packageKey',
  'description',
  'features',
  'integrations',
  'preferredDate',
  'contactPreference',
  'phone',
  'notes',
] as const;

function emptyForm(user: PublicUser): ProjectRequestFormValues {
  return {
    title: '',
    categoryKey: '',
    packageKey: '',
    description: '',
    features: [],
    integrations: [],
    preferredDate: '',
    contactPreference: 'email',
    phone: user.phone ?? '',
    notes: '',
  };
}

/** The form a signed-in customer fills in to send Prajzo a project. */
export function StartProjectForm({
  user,
  categories,
  packages,
  initialType,
  initialPackage,
}: {
  user: PublicUser;
  categories: Category[];
  packages: ServicePackage[];
  /** From the address (`?type=`), when the visitor arrived from a service or package card. */
  initialType: string;
  initialPackage: string;
}) {
  const [outcome, setOutcome] = useState<Outcome>({ kind: 'idle' });
  const outcomeRef = useRef<HTMLDivElement>(null);
  const knownType =
    initialType === 'other' || categories.some((category) => category.key === initialType);
  const knownPackage =
    initialPackage === 'not-sure' || packages.some((item) => item.key === initialPackage);

  const form = useForm<ProjectRequestFormValues, unknown, ProjectRequest>({
    resolver: zodResolver(projectRequestSchema),
    defaultValues: {
      ...emptyForm(user),
      categoryKey: knownType ? initialType : '',
      packageKey: knownPackage ? initialPackage : '',
    },
  });
  const { errors, isSubmitting } = form.formState;
  const wantsCall = useWatch({ control: form.control, name: 'contactPreference' }) !== 'email';

  // Bring the confirmation or the error into view once it appears.
  useEffect(() => {
    if (outcome.kind !== 'idle') outcomeRef.current?.scrollIntoView?.({ block: 'nearest' });
  }, [outcome]);

  const send = async (values: ProjectRequest) => {
    setOutcome({ kind: 'idle' });
    try {
      const { project } = await apiRequest('/v1/project-requests', projectResponseSchema, {
        method: 'POST',
        body: JSON.stringify(values),
      });
      form.reset(emptyForm(user));
      setOutcome({ kind: 'sent', project });
    } catch (error) {
      applyServerFieldErrors(form.setError, error, fieldNames);
      setOutcome({
        kind: 'failed',
        message: submitErrorMessage(
          error,
          'Something went wrong. Please try again, or contact us on WhatsApp.',
        ),
      });
    }
  };

  if (outcome.kind === 'sent') {
    const { reference } = outcome.project;
    return (
      <div ref={outcomeRef} className="grid gap-5">
        <Alert tone="success" title="Your project request has been sent">
          <p>
            Your reference number is{' '}
            <strong className="font-mono text-base font-semibold">{reference}</strong>. Please keep
            it, and quote it whenever you contact us about this project.
          </p>
        </Alert>
        <p className="text-slate-600">
          We&apos;ll read your request and reply with questions or a quote. You can follow its
          progress any time in My projects.
        </p>
        <div className="flex flex-wrap gap-3">
          <ButtonLink to={`/account/projects/${reference}`}>View this project</ButtonLink>
          <ButtonLink to="/account/projects" variant="secondary">
            All my projects
          </ButtonLink>
          <Button variant="ghost" onClick={() => setOutcome({ kind: 'idle' })}>
            Send another project
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form
      noValidate
      onSubmit={(event) => void form.handleSubmit(send)(event)}
      className="grid gap-6"
    >
      <p className="text-sm text-slate-600">
        Fields marked{' '}
        <span aria-hidden="true" className="text-rose-600">
          *
        </span>
        <span className="sr-only">with a star</span> are required. Sending as{' '}
        <strong className="font-semibold text-ink">{user.name}</strong> ({user.email}).
      </p>

      <TextField
        label="Project name"
        required
        hint="A short name so we can tell your projects apart, for example “Website for my studio”."
        error={errors.title?.message}
        {...form.register('title')}
      />

      <div className="grid gap-5 sm:grid-cols-2">
        <SelectField
          label="Type of website"
          required
          error={errors.categoryKey?.message}
          {...form.register('categoryKey')}
        >
          <option value="">Choose one</option>
          {categories.map((category) => (
            <option key={category.key} value={category.key}>
              {category.title}
            </option>
          ))}
          <option value="other">Something else</option>
        </SelectField>
        <SelectField
          label="Package"
          hint="Optional. The final price is always confirmed in a written quote."
          error={errors.packageKey?.message}
          {...form.register('packageKey')}
        >
          <option value="">Choose one (optional)</option>
          {packages.map((item) => {
            const price = describePrice(item);
            return (
              <option key={item.key} value={item.key}>
                {price.amount ? `${item.name} (from ${price.amount})` : item.name}
              </option>
            );
          })}
          <option value="not-sure">Not sure yet</option>
        </SelectField>
      </div>

      <TextAreaField
        label="About your project"
        required
        rows={6}
        hint="What you need, who it's for, and anything we should know. A few sentences is enough."
        error={errors.description?.message}
        {...form.register('description')}
      />

      <FieldGroup legend="Features you'd like" hint="Optional. Tick anything that applies.">
        {projectFeatures.map((feature) => (
          <CheckboxField
            key={feature}
            label={projectFeatureLabels[feature]}
            value={feature}
            {...form.register('features')}
          />
        ))}
      </FieldGroup>

      <FieldGroup
        legend="Services to connect"
        hint="Optional. Outside services your project may need."
      >
        {projectIntegrations.map((integration) => (
          <CheckboxField
            key={integration}
            label={projectIntegrationLabels[integration]}
            value={integration}
            {...form.register('integrations')}
          />
        ))}
      </FieldGroup>

      <div className="grid gap-5 sm:grid-cols-2">
        <TextField
          label="Preferred date"
          type="date"
          min={todayInIndia()}
          hint="Optional. This is a wish, not a promise: we confirm a real delivery date only after reviewing your project."
          error={errors.preferredDate?.message}
          {...form.register('preferredDate')}
        />
        <SelectField
          label="How should we contact you?"
          error={errors.contactPreference?.message}
          {...form.register('contactPreference')}
        >
          {contactPreferences.map((preference) => (
            <option key={preference} value={preference}>
              {contactPreferenceLabels[preference]}
            </option>
          ))}
        </SelectField>
      </div>

      <TextField
        label="Phone or WhatsApp number"
        type="tel"
        autoComplete="tel"
        inputMode="tel"
        required={wantsCall}
        hint={wantsCall ? 'We need it to reach you this way.' : 'Optional.'}
        error={errors.phone?.message}
        {...form.register('phone')}
      />

      <TextAreaField
        label="Anything else?"
        rows={3}
        hint="Optional. Links to websites you like, deadlines, or questions."
        error={errors.notes?.message}
        {...form.register('notes')}
      />

      <div ref={outcomeRef}>
        {outcome.kind === 'failed' && (
          <Alert tone="error" title="Your project request wasn't sent">
            {outcome.message}
          </Alert>
        )}
      </div>

      <Button type="submit" size="lg" loading={isSubmitting} className="justify-self-start">
        <Send aria-hidden="true" className="size-4" />
        {isSubmitting ? 'Sending…' : 'Send project request'}
      </Button>
    </form>
  );
}
