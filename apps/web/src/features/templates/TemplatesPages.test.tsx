import { screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { catalogueRoutes, jsonResponse, mockApi, sampleTemplate } from '../../test/mock-api';
import { renderApp } from '../../test/render-app';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('Templates and Live Demos (/templates)', () => {
  it('shows each template with its preview, what it suits, and its live demo', async () => {
    mockApi(catalogueRoutes());
    renderApp('/templates');
    const card = (await screen.findByRole('heading', { level: 2, name: 'Portfolio' })).closest(
      'article',
    )!;
    expect(within(card).getByRole('img')).toHaveAttribute('alt', sampleTemplate.previewImage.alt);
    expect(within(card).getByText('Featured')).toBeInTheDocument();
    expect(card).toHaveTextContent('Suits: Personal Portfolio Websites');
    expect(within(card).getAllByRole('listitem')).toHaveLength(4);
    expect(
      within(card).getByRole('link', { name: 'View Live Demo of the Portfolio template' }),
    ).toHaveAttribute('href', '/demo/portfolio');
    expect(
      within(card).getByRole('link', { name: 'Details of the Portfolio template' }),
    ).toHaveAttribute('href', '/templates/portfolio');
    await waitFor(() => expect(document.title).toBe('Templates and Live Demos · Prajzo'));
  });

  it('says so honestly when no template is available', async () => {
    mockApi({
      ...catalogueRoutes(),
      'GET /api/v1/templates': () => jsonResponse(200, { items: [] }),
    });
    renderApp('/templates');
    expect(await screen.findByText('Templates are being updated')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Start a project' })).toHaveAttribute(
      'href',
      '/start-project',
    );
  });

  it('offers to try again when the list cannot be loaded', async () => {
    mockApi({
      ...catalogueRoutes(),
      'GET /api/v1/templates': () =>
        jsonResponse(503, {
          error: { code: 'DATABASE_UNAVAILABLE', message: 'Please try again shortly.' },
        }),
    });
    renderApp('/templates');
    expect(await screen.findByText('Please try again shortly.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
  });
});

describe('a template’s details page (/templates/portfolio)', () => {
  it('shows the description, every feature, and links to the demo and to start a project', async () => {
    mockApi({
      ...catalogueRoutes(),
      'GET /api/v1/templates/portfolio': () => jsonResponse(200, { template: sampleTemplate }),
    });
    renderApp('/templates/portfolio');
    expect(await screen.findByRole('heading', { level: 1, name: 'Portfolio' })).toBeInTheDocument();
    expect(screen.getByText(sampleTemplate.description)).toBeInTheDocument();
    for (const feature of sampleTemplate.features)
      expect(screen.getByText(feature)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'View Live Demo' })).toHaveAttribute(
      'href',
      '/demo/portfolio',
    );
    expect(screen.getByRole('link', { name: 'Personal Portfolio Websites' })).toHaveAttribute(
      'href',
      '/start-project?type=personal-portfolio',
    );
    await waitFor(() => expect(document.title).toBe('Portfolio template · Prajzo'));
  });

  it('shows the not-found page when the template is hidden', async () => {
    mockApi(catalogueRoutes());
    renderApp('/templates/portfolio');
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Page not found' }),
    ).toBeInTheDocument();
  });
});

describe('the home page', () => {
  it('shows the featured templates with their live demos, and an Explore Templates button', async () => {
    mockApi(catalogueRoutes());
    renderApp('/');
    const section = (
      await screen.findByRole('heading', { level: 2, name: 'Try a live demo' })
    ).closest('section')!;
    expect(
      within(section).getByRole('heading', { level: 3, name: 'Portfolio' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Explore Templates' })).toHaveAttribute(
      'href',
      '/templates',
    );
  });

  it('leaves the section out when there is nothing featured', async () => {
    mockApi({
      ...catalogueRoutes(),
      'GET /api/v1/templates': () =>
        jsonResponse(200, { items: [{ ...sampleTemplate, featured: false }] }),
    });
    renderApp('/');
    await screen.findByRole('heading', { name: 'Business Websites' });
    expect(screen.queryByRole('heading', { name: 'Try a live demo' })).not.toBeInTheDocument();
  });
});

describe('Our Projects (/projects)', () => {
  it('shows each demo as a case study, plainly labelled as a demonstration', async () => {
    mockApi(catalogueRoutes());
    renderApp('/projects');
    const project = (
      await screen.findByRole('heading', { level: 2, name: 'Portfolio website' })
    ).closest('article')!;
    expect(within(project).getByText('Demonstration project, not a client')).toBeInTheDocument();
    for (const feature of sampleTemplate.features) {
      expect(within(project).getByText(feature)).toBeInTheDocument();
    }
    expect(
      within(project).getByRole('link', { name: 'View Live Demo of the Portfolio website' }),
    ).toHaveAttribute('href', '/demo/portfolio');
    await waitFor(() => expect(document.title).toBe('Our Projects · Prajzo'));
  });
});
