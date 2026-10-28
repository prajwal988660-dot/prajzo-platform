import { startingConfig } from '@prajzo/shared';
import { portfolioTemplate } from '@prajzo/shared/templates';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  catalogueRoutes,
  jsonBody,
  jsonResponse,
  mockApi,
  sampleAdmin,
  sampleCustomer,
  signedInAs,
} from '../../test/mock-api';
import { currentAddress, renderApp } from '../../test/render-app';
import { readDraft, writeDraft } from './drafts';
import { PREVIEW_SHOW, readShowMessage } from './preview-messages';

const origin = window.location.origin;

beforeEach(() => {
  window.localStorage.clear();
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('the preview’s messages (D-006)', () => {
  const config = startingConfig(portfolioTemplate);
  const message = (data: unknown, from = origin) =>
    new MessageEvent('message', { data, origin: from });

  it('accepts a design sent from this website', () => {
    expect(
      readShowMessage(message({ type: PREVIEW_SHOW, config, page: '' }), origin)?.config,
    ).toEqual(config);
  });

  it('ignores messages from other websites, of other kinds, or with a malformed design', () => {
    expect(
      readShowMessage(message({ type: PREVIEW_SHOW, config }, 'https://evil.example'), origin),
    ).toBeNull();
    expect(readShowMessage(message({ type: 'something-else', config }), origin)).toBeNull();
    const broken = structuredClone(config) as unknown as { pages: unknown };
    broken.pages = 'not pages';
    expect(readShowMessage(message({ type: PREVIEW_SHOW, config: broken }), origin)).toBeNull();
  });
});

describe('drafts kept in this browser', () => {
  it('keep a design between visits, for its own template only', () => {
    const config = startingConfig(portfolioTemplate);
    config.site.name = 'My draft';
    writeDraft(config);
    expect(readDraft('portfolio')?.site.name).toBe('My draft');
    expect(readDraft('business')).toBeNull();
  });

  it('ignore a damaged draft, and never fail when storage is blocked', () => {
    window.localStorage.setItem('prajzo.builder.draft.portfolio', '{not json');
    expect(readDraft('portfolio')).toBeNull();
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });
    expect(() => writeDraft(startingConfig(portfolioTemplate))).not.toThrow();
  });
});

describe('the builder (/build)', () => {
  function open(path: string, extra: Parameters<typeof mockApi>[0] = {}) {
    const fetchMock = mockApi({ ...catalogueRoutes(), ...extra });
    const router = renderApp(path);
    return { fetchMock, router, user: userEvent.setup() };
  }

  it('starts from the template’s demo, with its content ready to edit', async () => {
    open('/build?template=portfolio');
    const content = await screen.findByRole('region', { name: 'Edit your website' });
    expect(within(content).getAllByLabelText('Heading', { selector: 'input' })[0]!).toHaveValue(
      'I design calm, useful apps for busy people.',
    );
    expect(screen.getByTitle(/Preview of your website on a computer/)).toHaveAttribute(
      'src',
      '/preview',
    );
    expect(screen.getByRole('button', { name: /Content/ })).toHaveAttribute('aria-current', 'step');
  });

  it('shows a problem beside its field, and lists it before saving', async () => {
    const { user } = open('/build?template=portfolio', signedInAs(sampleCustomer));
    const content = await screen.findByRole('region', { name: 'Edit your website' });
    const heading = within(content).getAllByLabelText('Heading', { selector: 'input' })[0]!;
    await user.clear(heading);
    expect(await within(content).findByText("The heading can't be empty")).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Save/ }));
    expect(await screen.findByText('1 thing to fix before saving')).toBeInTheDocument();
    expect(screen.getByText(/Content: Hero \(top of the page\):/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save to my account' })).toBeDisabled();
  });

  it('keeps the design in this browser for visitors, and offers an account to keep it', async () => {
    const { user } = open('/build?template=portfolio', {
      'GET /api/v1/auth/me': () => jsonResponse(200, { user: null }),
    });
    const content = await screen.findByRole('region', { name: 'Edit your website' });
    const heading = within(content).getAllByLabelText('Heading', { selector: 'input' })[0]!;
    await user.clear(heading);
    // Pasted, not typed key by key: every keystroke re-checks the whole design, slow in jsdom.
    await user.click(heading);
    await user.paste('My own heading');
    await waitFor(() => {
      const hero = readDraft('portfolio')?.pages[0]?.sections.find(
        (section) => section.type === 'hero',
      );
      expect(hero?.type === 'hero' && hero.content.heading).toBe('My own heading');
    });

    await user.click(screen.getByRole('button', { name: /Save/ }));
    expect(screen.getByRole('link', { name: 'Create a free account' })).toHaveAttribute(
      'href',
      `/register?next=${encodeURIComponent('/build?template=portfolio')}`,
    );
  });

  it('picks up the draft from an earlier visit, and can start again from the demo', async () => {
    const draft = startingConfig(portfolioTemplate);
    draft.site.name = 'Draft from before';
    writeDraft(draft);
    const { user } = open('/build?template=portfolio');
    expect(await screen.findByText('Your draft is back')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Your site/ }));
    expect(screen.getByLabelText('Site name')).toHaveValue('Draft from before');
    await user.click(screen.getByRole('button', { name: 'Start again from the demo' }));
    expect(screen.getByLabelText('Site name')).toHaveValue('Tara Vaidya');
  });

  it('saves to a customer’s account and opens the saved design', async () => {
    const saved = {
      id: 'a'.repeat(24),
      name: 'Tara Vaidya website',
      templateKey: 'portfolio',
      templateName: 'Portfolio',
      createdAt: '2026-10-29T10:00:00.000Z',
      updatedAt: '2026-10-29T10:00:00.000Z',
      config: startingConfig(portfolioTemplate),
    };
    const { user, fetchMock, router } = open('/build?template=portfolio', {
      ...signedInAs(sampleCustomer),
      'POST /api/v1/designs': () => jsonResponse(201, { design: saved }),
      [`GET /api/v1/designs/${saved.id}`]: () => jsonResponse(200, { design: saved }),
    });
    await screen.findByRole('region', { name: 'Edit your website' });
    await user.click(screen.getByRole('button', { name: /Save/ }));
    await user.click(await screen.findByRole('button', { name: 'Save to my account' }));

    await waitFor(() => expect(currentAddress(router)).toBe(`/build/${saved.id}`));
    const sent = fetchMock.mock.calls.find(
      ([url, init]) => url === '/api/v1/designs' && init?.method === 'POST',
    );
    expect(jsonBody(sent?.[1])).toEqual({ name: 'Tara Vaidya website', config: saved.config });
    expect(readDraft('portfolio')).toBeNull();
  });

  it('tells an administrator that saving is for customers', async () => {
    const { user } = open('/build?template=portfolio', signedInAs(sampleAdmin));
    await screen.findByRole('region', { name: 'Edit your website' });
    await user.click(screen.getByRole('button', { name: /Save/ }));
    expect(await screen.findByText('Saving is for customer accounts')).toBeInTheDocument();
  });

  it('says so when a saved design is not found', async () => {
    open(`/build/${'b'.repeat(24)}`, signedInAs(sampleCustomer));
    expect(
      await screen.findByRole('heading', { level: 1, name: "We couldn't find that design" }),
    ).toBeInTheDocument();
  });

  it('without a template, offers the templates there are', async () => {
    open('/build');
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Build your website' }),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole('link', { name: 'Customize This Design: Portfolio' }),
    ).toHaveAttribute('href', '/build?template=portfolio');
  });
});
