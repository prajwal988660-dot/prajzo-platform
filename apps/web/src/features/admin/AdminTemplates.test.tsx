import type { AdminDemoSubmission, AdminTemplateEntry } from '@prajzo/shared';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import {
  catalogueRoutes,
  jsonBody,
  jsonResponse,
  mockApi,
  sampleAdmin,
  sampleAdminCategory,
  sampleTemplate,
  signedInAs,
} from '../../test/mock-api';
import { currentAddress, renderApp } from '../../test/render-app';

type Routes = Parameters<typeof mockApi>[0];

const adminTemplate: AdminTemplateEntry = {
  ...sampleTemplate,
  published: true,
  order: 1,
  updatedAt: '2026-10-28T10:00:00.000Z',
};
const categories = [
  sampleAdminCategory({ key: 'personal-portfolio', title: 'Personal Portfolio Websites' }),
  sampleAdminCategory({ key: 'resume-cv', title: 'Resume and CV Websites', active: false }),
];

function open(path: string, extra: Routes = {}) {
  const fetchMock = mockApi({
    ...catalogueRoutes(),
    ...signedInAs(sampleAdmin),
    'GET /api/v1/admin/templates': () => jsonResponse(200, { items: [adminTemplate] }),
    'GET /api/v1/admin/categories': () => jsonResponse(200, { items: categories }),
    ...extra,
  });
  return { fetchMock, user: userEvent.setup(), router: renderApp(path) };
}

describe('admin: templates', () => {
  it('lists each template, whether it is shown or featured, with links to edit it and open its demo', async () => {
    open('/admin/templates');
    const card = (await screen.findByRole('heading', { level: 2, name: 'Portfolio' })).closest(
      'li',
    )!;
    expect(within(card).getByText('Shown')).toBeInTheDocument();
    expect(within(card).getByText('Featured')).toBeInTheDocument();
    expect(within(card).getByRole('link', { name: 'Edit the Portfolio listing' })).toHaveAttribute(
      'href',
      '/admin/templates/portfolio',
    );
    expect(
      within(card).getByRole('link', { name: 'Open the Portfolio live demo' }),
    ).toHaveAttribute('href', '/demo/portfolio');
    expect(screen.getByRole('link', { name: 'Templates' })).toHaveAttribute('aria-current', 'page');
  });

  it('saves a changed listing and goes back to the list saying so', async () => {
    const { fetchMock, user, router } = open('/admin/templates/portfolio', {
      'PATCH /api/v1/admin/templates/portfolio': () =>
        jsonResponse(200, {
          template: {
            ...adminTemplate,
            tagline: 'Show your best work on one page.',
            featured: false,
          },
        }),
    });
    const tagline = await screen.findByLabelText(/Short line/);
    await user.clear(tagline);
    await user.type(tagline, 'Show your best work on one page.');
    await user.click(screen.getByLabelText('Featured'));
    await user.click(screen.getByLabelText(/Resume and CV Websites \(hidden\)/));
    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    expect(await screen.findByText('“Portfolio” was saved.')).toBeInTheDocument();
    expect(currentAddress(router)).toBe('/admin/templates');
    const sent = fetchMock.mock.calls.find(([, init]) => init?.method === 'PATCH');
    expect(jsonBody(sent?.[1])).toEqual({
      name: 'Portfolio',
      tagline: 'Show your best work on one page.',
      description: sampleTemplate.description,
      categories: ['personal-portfolio', 'resume-cv'],
      features: sampleTemplate.features,
      featured: false,
      published: true,
      order: 1,
      previewAlt: sampleTemplate.previewImage.alt,
    });
  });

  it('checks the form before sending, and shows the server’s own words when it refuses', async () => {
    const { fetchMock, user } = open('/admin/templates/portfolio', {
      'PATCH /api/v1/admin/templates/portfolio': () =>
        jsonResponse(400, {
          error: {
            code: 'VALIDATION_FAILED',
            message: 'Some details need fixing.',
            fields: { categories: "These categories don't exist: resume-cv" },
          },
        }),
    });
    await user.click(await screen.findByLabelText('Personal Portfolio Websites'));
    await user.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(await screen.findByText('Choose at least one category')).toBeInTheDocument();
    expect(fetchMock.mock.calls.some(([, init]) => init?.method === 'PATCH')).toBe(false);

    await user.click(screen.getByLabelText(/Resume and CV Websites/));
    await user.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(await screen.findByText("These categories don't exist: resume-cv")).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('Some details need fixing.');
  });

  it('says so when the template is not one there is', async () => {
    open('/admin/templates/business');
    expect(
      await screen.findByRole('heading', { level: 1, name: "We couldn't find that template" }),
    ).toBeInTheDocument();
  });
});

describe('admin: demo messages', () => {
  const message: AdminDemoSubmission = {
    id: 'a'.repeat(24),
    form: 'contact',
    template: 'portfolio',
    name: 'Kiran Test',
    email: 'kiran@example.com',
    message: 'Could my portfolio look like this one?',
    phone: null,
    organisation: null,
    choice: null,
    status: 'new',
    createdAt: '2026-10-28T10:00:00.000Z',
    expiresAt: '2026-11-04T10:00:00.000Z',
  };
  const list = (items: AdminDemoSubmission[]) =>
    jsonResponse(200, { items, page: 1, limit: 20, total: items.length });

  it('shows each message, which demo it came from, and when it deletes itself', async () => {
    open('/admin/demo-messages', {
      'GET /api/v1/admin/demo-submissions?status=all&page=1&limit=20': () => list([message]),
    });
    const card = (await screen.findByText('Kiran Test')).closest('li')!;
    expect(card).toHaveTextContent('From the Portfolio demo');
    expect(card).toHaveTextContent('Could my portfolio look like this one?');
    expect(card).toHaveTextContent('Deleted by itself on');
    expect(
      within(card).getByRole('link', { name: 'Reply by email to Kiran Test' }),
    ).toHaveAttribute(
      'href',
      expect.stringMatching(/^mailto:kiran@example\.com\?subject=/) as string,
    );
  });

  it('marks a message read only once the server has', async () => {
    const { user } = open('/admin/demo-messages', {
      'GET /api/v1/admin/demo-submissions?status=all&page=1&limit=20': () => list([message]),
      [`PATCH /api/v1/admin/demo-submissions/${message.id}`]: () =>
        jsonResponse(200, { submission: { ...message, status: 'read' } }),
    });
    await user.click(await screen.findByRole('button', { name: 'Mark as read' }));
    expect(await screen.findByRole('status')).toHaveTextContent('Marked as read.');
    expect(screen.getByRole('button', { name: 'Mark as new' })).toBeInTheDocument();
  });

  it('is honest when there are none', async () => {
    open('/admin/demo-messages?status=new', {
      'GET /api/v1/admin/demo-submissions?status=new&page=1&limit=20': () => list([]),
    });
    expect(await screen.findByText('No new demo messages')).toBeInTheDocument();
  });
});
