import { zodResolver } from '@hookform/resolvers/zod';
import {
  categoryListSchema,
  contactRequestSchema,
  contactResponseSchema,
  servicePackageListSchema,
  type Category,
  type ContactFormValues,
  type ContactRequest,
  type ServicePackage,
} from '@prajzo/shared';
import { Send } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useSearchParams } from 'react-router';
import { Container } from '../../components/layout/Container';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { CheckboxField, SelectField, TextAreaField, TextField } from '../../components/ui/Field';
import { LoadingBlock } from '../../components/ui/LoadStates';
import { ApiError, apiRequest } from '../../lib/api';
import { describePrice } from '../../lib/format';
import { usePageTitle } from '../../lib/use-page-title';
import { useApi } from '../../lib/use-api';
import { ContactOptions } from './components/ContactOptions';
import { PageIntro } from './components/PageIntro';

export function ContactPage() {
  usePageTitle('Contact Us');
  const [searchParams] = useSearchParams();
  const categories = useApi('/v1/categories', categoryListSchema);
  const packages = useApi('/v1/packages', servicePackageListSchema);
  const listsReady = categories.status !== 'loading' && packages.status !== 'loading';

  return (
    <>
      <PageIntro eyebrow="Contact us" title="Talk to us">
        <p>
          Have a question, or want to chat before you decide? Send us a message and we&apos;ll
          reply. Ready to tell us about a project?{' '}
          <Link
            to="/start-project"
            className="font-medium text-brand-indigo underline underline-offset-2"
          >
            Start a project
          </Link>
          .
        </p>
      </PageIntro>

      <section className="py-14 sm:py-20">
        <Container className="grid gap-12 lg:grid-cols-[1.5fr_1fr]">
          <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-card sm:p-8">
            <h2 className="text-2xl font-semibold tracking-tight">Send us a message</h2>
            <p className="mt-2 text-sm text-slate-600">
              Fields marked{' '}
              <span aria-hidden="true" className="text-rose-600">
                *
              </span>
              <span className="sr-only">with a star</span> are required.
            </p>
            {listsReady ? (
              <ContactForm
                categories={categories.data?.items ?? []}
                packages={packages.data?.items ?? []}
                initialType={searchParams.get('type') ?? ''}
                initialPackage={searchParams.get('package') ?? ''}
              />
            ) : (
              <LoadingBlock label="Loading the form" />
            )}
          </div>

          <aside aria-labelledby="direct-heading" className="grid content-start gap-8">
            <div>
              <h2 id="direct-heading" className="text-xl font-semibold">
                Prefer to talk directly?
              </h2>
              <p className="mt-2 text-slate-600">Message, call or email us.</p>
              <ContactOptions className="mt-5" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">What happens next</h2>
              <ol className="mt-4 grid gap-3 text-slate-700">
                {[
                  'We read your message and check what you need.',
                  'We reply with any questions, or a quote with scope, price and delivery date.',
                  "You decide. Nothing starts until you're happy with the quote.",
                ].map((step, index) => (
                  <li key={step} className="flex gap-3">
                    <span className="grid size-7 shrink-0 place-items-center rounded-full bg-indigo-50 text-sm font-semibold text-brand-indigo">
                      {index + 1}
                    </span>
                    {step}
                  </li>
                ))}
              </ol>
            </div>
          </aside>
        </Container>
      </section>
    </>
  );
}

type Outcome =
  { kind: 'idle' } | { kind: 'sent'; message: string } | { kind: 'failed'; message: string };

const emptyForm: ContactFormValues = {
  name: '',
  email: '',
  phone: '',
  websiteType: '',
  packageKey: '',
  message: '',
  consent: false,
  company: '',
};

function ContactForm({
  categories,
  packages,
  initialType,
  initialPackage,
}: {
  categories: Category[];
  packages: ServicePackage[];
  initialType: string;
  initialPackage: string;
}) {
  const [outcome, setOutcome] = useState<Outcome>({ kind: 'idle' });
  const outcomeRef = useRef<HTMLDivElement>(null);
  const knownType =
    initialType === 'other' || categories.some((category) => category.key === initialType);
  const knownPackage =
    initialPackage === 'not-sure' || packages.some((item) => item.key === initialPackage);

  const form = useForm<ContactFormValues, unknown, ContactRequest>({
    resolver: zodResolver(contactRequestSchema),
    defaultValues: {
      ...emptyForm,
      websiteType: knownType ? initialType : '',
      packageKey: knownPackage ? initialPackage : '',
    },
  });
  const { errors, isSubmitting } = form.formState;

  // Bring the success or error message into view once it appears.
  useEffect(() => {
    if (outcome.kind !== 'idle') outcomeRef.current?.scrollIntoView?.({ block: 'nearest' });
  }, [outcome]);

  const send = async (values: ContactRequest) => {
    setOutcome({ kind: 'idle' });
    try {
      const response = await apiRequest('/v1/contact', contactResponseSchema, {
        method: 'POST',
        body: JSON.stringify(values),
      });
      form.reset(emptyForm);
      setOutcome({ kind: 'sent', message: response.message });
    } catch (error) {
      if (error instanceof ApiError && error.fields) {
        for (const [field, message] of Object.entries(error.fields)) {
          if (field in emptyForm) form.setError(field as keyof ContactFormValues, { message });
        }
      }
      setOutcome({
        kind: 'failed',
        message:
          error instanceof ApiError
            ? error.message
            : 'Something went wrong. Please try again, or contact us on WhatsApp.',
      });
    }
  };

  if (outcome.kind === 'sent') {
    return (
      <div ref={outcomeRef} className="mt-8 grid gap-4">
        <Alert tone="success" title="Message sent">
          {outcome.message}
        </Alert>
        <Button
          variant="secondary"
          className="justify-self-start"
          onClick={() => setOutcome({ kind: 'idle' })}
        >
          Send another message
        </Button>
      </div>
    );
  }

  return (
    <form
      noValidate
      onSubmit={(event) => void form.handleSubmit(send)(event)}
      className="mt-8 grid gap-5"
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <TextField
          label="Your name"
          autoComplete="name"
          required
          error={errors.name?.message}
          {...form.register('name')}
        />
        <TextField
          label="Email"
          type="email"
          autoComplete="email"
          inputMode="email"
          required
          error={errors.email?.message}
          {...form.register('email')}
        />
      </div>
      <TextField
        label="Phone or WhatsApp"
        type="tel"
        autoComplete="tel"
        inputMode="tel"
        hint="Optional. Add it if you'd like a call or a WhatsApp message."
        error={errors.phone?.message}
        {...form.register('phone')}
      />
      <div className="grid gap-5 sm:grid-cols-2">
        <SelectField
          label="Type of website"
          error={errors.websiteType?.message}
          {...form.register('websiteType')}
        >
          <option value="">Choose one (optional)</option>
          {categories.map((category) => (
            <option key={category.key} value={category.key}>
              {category.title}
            </option>
          ))}
          <option value="other">Something else</option>
        </SelectField>
        <SelectField
          label="Package"
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
        hint="What you need, who it's for, and any deadline. A few sentences is enough."
        error={errors.message?.message}
        {...form.register('message')}
      />
      <CheckboxField
        label="I agree that Prajzo may contact me about this request."
        hint={
          <>
            Read how we use your details in our{' '}
            <Link
              to="/privacy"
              className="font-medium text-brand-indigo underline underline-offset-2"
            >
              Privacy Policy
            </Link>
            .
          </>
        }
        error={errors.consent?.message}
        {...form.register('consent')}
      />

      {/* Spam trap: hidden from people; automated bots tend to fill it in. */}
      <div
        aria-hidden="true"
        className="absolute -left-[10000px] top-auto h-px w-px overflow-hidden"
      >
        <label>
          Company (leave this empty)
          <input type="text" tabIndex={-1} autoComplete="off" {...form.register('company')} />
        </label>
      </div>

      <div ref={outcomeRef}>
        {outcome.kind === 'failed' && (
          <Alert tone="error" title="Your message wasn't sent">
            {outcome.message}
          </Alert>
        )}
      </div>

      <Button type="submit" size="lg" loading={isSubmitting} className="justify-self-start">
        <Send aria-hidden="true" className="size-4" />
        {isSubmitting ? 'Sending…' : 'Send message'}
      </Button>
    </form>
  );
}
