import type { SavedDesignSummary } from '@prajzo/shared';
import { startingConfig } from '@prajzo/shared';
import { portfolioTemplate } from '@prajzo/shared/templates';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  catalogueRoutes,
  jsonBody,
  jsonResponse,
  mockApi,
  sampleCustomer,
  signedInAs,
} from '../../test/mock-api';
import { renderApp } from '../../test/render-app';

afterEach(() => {
  vi.unstubAllGlobals();
});

const design: SavedDesignSummary = {
  id: 'a'.repeat(24),
  name: 'My portfolio',
  templateKey: 'portfolio',
  templateName: 'Portfolio',
  createdAt: '2026-10-29T10:00:00.000Z',
  updatedAt: '2026-10-29T11:00:00.000Z',
};
const full = (summary: SavedDesignSummary) => ({
  ...summary,
  config: startingConfig(portfolioTemplate),
});

function open(items: SavedDesignSummary[], extra: Parameters<typeof mockApi>[0] = {}) {
  const fetchMock = mockApi({
    ...catalogueRoutes(),
    ...signedInAs(sampleCustomer),
    'GET /api/v1/designs': () => jsonResponse(200, { items }),
    ...extra,
  });
  renderApp('/account/designs');
  return { fetchMock, user: userEvent.setup() };
}

describe('My saved designs (/account/designs)', () => {
  it('lists my designs, each opening in the builder', async () => {
    open([design]);
    const list = await screen.findByRole('list', { name: 'Saved designs' });
    expect(
      within(list).getByText('Portfolio template · Last saved', { exact: false }),
    ).toBeInTheDocument();
    expect(
      within(list).getByRole('link', { name: 'Open My portfolio in the builder' }),
    ).toHaveAttribute('href', `/build/${design.id}`);
  });

  it('renames a design, checking the name first', async () => {
    const { user, fetchMock } = open([design], {
      [`PATCH /api/v1/designs/${design.id}`]: () =>
        jsonResponse(200, { design: full({ ...design, name: 'Portfolio for clients' }) }),
    });
    await user.click(await screen.findByRole('button', { name: 'Rename My portfolio' }));
    const field = screen.getByLabelText('New name');
    await user.clear(field);
    await user.click(screen.getByRole('button', { name: 'Save name' }));
    expect(screen.getByText('Give the design a name')).toBeInTheDocument();

    await user.type(field, 'Portfolio for clients');
    await user.click(screen.getByRole('button', { name: 'Save name' }));
    expect(await screen.findByRole('link', { name: 'Portfolio for clients' })).toBeInTheDocument();
    const sent = fetchMock.mock.calls.find(([, init]) => init?.method === 'PATCH');
    expect(jsonBody(sent?.[1])).toEqual({ name: 'Portfolio for clients' });
  });

  it('duplicates a design and shows the copy', async () => {
    const copy = { ...design, id: 'b'.repeat(24), name: 'My portfolio (copy)' };
    const { user } = open([design], {
      [`POST /api/v1/designs/${design.id}/duplicate`]: () =>
        jsonResponse(201, { design: full(copy) }),
    });
    await user.click(await screen.findByRole('button', { name: 'Duplicate My portfolio' }));
    expect(await screen.findByText('“My portfolio (copy)” was made.')).toBeInTheDocument();
    expect(
      within(screen.getByRole('list', { name: 'Saved designs' })).getAllByRole('listitem'),
    ).toHaveLength(2);
  });

  it('asks before deleting, and deletes only when told to', async () => {
    const { user, fetchMock } = open([design], {
      [`DELETE /api/v1/designs/${design.id}`]: () => new Response(null, { status: 204 }),
    });
    await user.click(await screen.findByRole('button', { name: 'Delete My portfolio' }));
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Delete “My portfolio”? This can’t be undone.',
    );
    await user.click(screen.getByRole('button', { name: 'Keep it' }));
    expect(fetchMock.mock.calls.some(([, init]) => init?.method === 'DELETE')).toBe(false);

    await user.click(screen.getByRole('button', { name: 'Delete My portfolio' }));
    await user.click(screen.getByRole('button', { name: 'Delete' }));
    expect(await screen.findByText('“My portfolio” was deleted.')).toBeInTheDocument();
    expect(screen.getByText('No saved designs yet')).toBeInTheDocument();
  });

  it('shows the server’s own words when something fails', async () => {
    const { user } = open([design], {
      [`POST /api/v1/designs/${design.id}/duplicate`]: () =>
        jsonResponse(409, {
          error: {
            code: 'CONFLICT',
            message: 'You can keep up to 30 designs. Delete one you no longer need first.',
          },
        }),
    });
    await user.click(await screen.findByRole('button', { name: 'Duplicate My portfolio' }));
    expect(await screen.findByText(/You can keep up to 30 designs/)).toBeInTheDocument();
  });

  it('is honest when there are none, and offers the builder', async () => {
    open([]);
    expect(await screen.findByText('No saved designs yet')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Build your website' })).toHaveAttribute(
      'href',
      '/build',
    );
  });
});
