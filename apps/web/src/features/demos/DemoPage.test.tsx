import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { vi } from 'vitest';
import { jsonResponse, mockApi } from '../../test/mock-api';
import { renderApp } from '../../test/render-app';

afterEach(() => {
  vi.unstubAllGlobals();
});

async function openDemo(routes: Parameters<typeof mockApi>[0] = {}) {
  const fetchMock = mockApi(routes);
  renderApp('/demo/portfolio');
  await screen.findByRole('heading', {
    level: 1,
    name: 'I design calm, useful apps for busy people.',
  });
  return fetchMock;
}

const demoPosts = (fetchMock: ReturnType<typeof mockApi>) =>
  fetchMock.mock.calls.filter(([url]) => url === '/api/v1/demo-submissions');

describe('the Portfolio live demo (/demo/portfolio)', () => {
  it('says it is a demo, and that everyone in it is made up', async () => {
    await openDemo();
    const bar = screen.getByRole('complementary', { name: 'About this demo' });
    expect(bar).toHaveTextContent('Demo website by Prajzo, for evaluation only.');
    expect(bar).toHaveTextContent('Everyone and everything in it is made up.');
    expect(within(bar).getByRole('link', { name: 'Back to Prajzo' })).toHaveAttribute('href', '/');
    await waitFor(() => expect(document.title).toBe('Portfolio demo · Prajzo'));
  });

  it('shows every section of the design, in order, with one main heading', async () => {
    await openDemo();
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(
      screen.getAllByRole('heading', { level: 2 }).map((heading) => heading.textContent),
    ).toEqual([
      'About me',
      'Skills',
      'Selected work',
      'Experience',
      'Education',
      'Let’s work together',
    ]);
    expect(screen.getByRole('heading', { level: 3, name: 'Kirana Ledger' })).toBeInTheDocument();
  });

  it('links the navigation to the sections on the page', async () => {
    await openDemo();
    const nav = screen.getByRole('navigation', { name: 'Site' });
    const links = within(nav).getAllByRole('link');
    expect(links.map((link) => [link.textContent, link.getAttribute('href')])).toEqual([
      ['About', '#about'],
      ['Skills', '#skills'],
      ['Work', '#work'],
      ['Experience', '#experience'],
      ['Contact', '#contact'],
    ]);
    for (const link of links) {
      expect(document.getElementById(link.getAttribute('href')!.slice(1))).not.toBeNull();
    }
  });

  it('opens and closes the phone menu', async () => {
    await openDemo();
    const user = userEvent.setup();
    const menu = screen.getByRole('button', { name: 'Menu' });
    expect(menu).toHaveAttribute('aria-expanded', 'false');
    await user.click(menu);
    expect(screen.getByRole('button', { name: 'Close' })).toHaveAttribute('aria-expanded', 'true');
  });

  it('describes every picture', async () => {
    await openDemo();
    const images = screen.getAllByRole('img').filter((image) => image.tagName === 'IMG');
    expect(images.length).toBe(5);
    for (const image of images)
      expect(image.getAttribute('alt')).toMatch(/^Illustration|^An illustrated/);
  });

  it('never contacts anyone: email, phone, WhatsApp and social links explain instead', async () => {
    await openDemo();
    expect(
      document.querySelector('a[href^="mailto:"], a[href^="tel:"], a[href*="wa.me"]'),
    ).toBeNull();
    expect(document.querySelector('.ps-site a[href^="http"]')).toBeNull();

    const user = userEvent.setup();
    const email = screen.getByRole('button', { name: 'tara@example.com' });
    await user.click(email);
    expect(email).toHaveAttribute('aria-expanded', 'true');
    expect(
      screen.getByText(/this opens your email app to write to tara@example\.com/),
    ).toHaveTextContent('This is a demo, so nothing happens.');
    await user.click(screen.getByRole('button', { name: 'LinkedIn' }));
    expect(screen.getByText(/opens the LinkedIn profile/)).toBeInTheDocument();
  });

  it('checks the form before sending anything', async () => {
    const fetchMock = await openDemo();
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Send message' }));
    expect(await screen.findByText('Enter your name')).toBeInTheDocument();
    expect(screen.getByText('Enter an email address like name@example.com')).toBeInTheDocument();
    expect(screen.getByLabelText('Name')).toHaveAttribute('aria-invalid', 'true');
    expect(demoPosts(fetchMock)).toHaveLength(0);
  });

  it('sends the message to the demo inbox, and says so only after the server confirms', async () => {
    let answer: (response: Response) => void = () => undefined;
    const fetchMock = await openDemo({
      'POST /api/v1/demo-submissions': () =>
        new Promise<Response>((resolve) => {
          answer = resolve;
        }),
    });
    const user = userEvent.setup();
    await user.type(screen.getByLabelText('Name'), 'Kiran Test');
    await user.type(screen.getByLabelText('Email'), 'kiran@example.com');
    await user.type(screen.getByLabelText('Message'), 'Could my portfolio look like this one?');
    await user.click(screen.getByRole('button', { name: 'Send message' }));

    expect(await screen.findByRole('button', { name: 'Sending…' })).toBeDisabled();
    expect(screen.queryByText('Thank you. Your message was received.')).not.toBeInTheDocument();
    expect(JSON.parse(demoPosts(fetchMock)[0]?.[1]?.body as string)).toEqual({
      template: 'portfolio',
      name: 'Kiran Test',
      email: 'kiran@example.com',
      message: 'Could my portfolio look like this one?',
      company: '',
    });

    answer(jsonResponse(201, { received: true, deleteAfter: '2026-11-04T10:00:00.000Z' }));
    expect(await screen.findByRole('status', { name: '' })).toHaveTextContent(
      'Thank you. Your message was received.',
    );
    expect(screen.getByLabelText('Name')).toHaveValue('');
  });

  it('keeps what was typed and explains when sending fails', async () => {
    await openDemo({
      'POST /api/v1/demo-submissions': () =>
        jsonResponse(429, {
          error: { code: 'RATE_LIMITED', message: 'Too many messages from your connection.' },
        }),
    });
    const user = userEvent.setup();
    await user.type(screen.getByLabelText('Name'), 'Kiran Test');
    await user.type(screen.getByLabelText('Email'), 'kiran@example.com');
    await user.type(screen.getByLabelText('Message'), 'Could my portfolio look like this one?');
    await user.click(screen.getByRole('button', { name: 'Send message' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Too many messages from your connection.',
    );
    expect(screen.getByLabelText('Name')).toHaveValue('Kiran Test');
  });

  it('applies the design’s colours, typefaces and button shape', async () => {
    await openDemo();
    const site = document.querySelector<HTMLElement>('.ps-site')!;
    expect(site.style.getPropertyValue('--site-primary')).toBe('#2b50d8');
    expect(site.style.getPropertyValue('--site-on-primary')).toBe('#ffffff');
    expect(site.style.getPropertyValue('--site-font-heading')).toContain('Bricolage Grotesque');
    expect(site.dataset.buttons).toBe('rounded');
  });
});

describe('the Business live demo (/demo/business)', () => {
  it('shows its services with prices, labels every review as a sample, and links its navigation', async () => {
    mockApi({});
    renderApp('/demo/business');
    await screen.findByRole('heading', {
      level: 1,
      name: 'Signs, cards and banners, printed by Friday.',
    });
    expect(
      screen.getAllByRole('heading', { level: 2 }).map((heading) => heading.textContent),
    ).toEqual([
      'What we do',
      'Why shops choose us',
      'Recent work',
      'About the studio',
      'What customers say',
      'Need something printed this week?',
      'Visit or write to us',
    ]);
    expect(screen.getByText('From ₹2,500')).toBeInTheDocument();
    expect(screen.getAllByText('Sample review')).toHaveLength(3);
    const nav = screen.getByRole('navigation', { name: 'Site' });
    expect(
      within(nav)
        .getAllByRole('link')
        .map((link) => link.getAttribute('href')),
    ).toEqual(['#services', '#why-us', '#work', '#about', '#reviews', '#contact']);
    await waitFor(() => expect(document.title).toBe('Business demo · Prajzo'));
  });
});
