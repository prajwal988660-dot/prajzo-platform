import { act, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import {
  catalogueRoutes,
  jsonBody,
  jsonResponse,
  mockApi,
  pageOf,
  requestedUrls,
  sampleAdmin,
  sampleContactMessage,
  signedInAs,
} from '../../test/mock-api';
import { currentAddress, renderApp } from '../../test/render-app';

type Routes = Parameters<typeof mockApi>[0];
const inbox = '/api/v1/admin/contact-messages?status=inbox&page=1&limit=20';

function openInbox(
  items = [sampleContactMessage()],
  extra: Routes = {},
  path = '/admin/messages',
  total = items.length,
) {
  const fetchMock = mockApi({
    ...catalogueRoutes(),
    ...signedInAs(sampleAdmin),
    [`GET ${inbox}`]: () => jsonResponse(200, pageOf(items, total)),
    ...extra,
  });
  const user = userEvent.setup();
  const router = renderApp(path);
  return { fetchMock, user, router };
}

const card = async (name: string) => {
  const list = within(await screen.findByRole('list', { name: 'Messages' }));
  return within(list.getAllByRole('listitem').find((item) => within(item).queryByText(name))!);
};

describe('the message inbox', () => {
  it('shows who wrote, how to reach them, what they are interested in, and what they said', async () => {
    openInbox();
    const message = await card('Ravi Kumar');

    expect(message.getByText('23 Oct 2026, 7:00 pm')).toBeVisible();
    expect(message.getByText('New')).toBeVisible();
    expect(message.getByRole('link', { name: 'ravi@example.com' })).toHaveAttribute(
      'href',
      'mailto:ravi@example.com',
    );
    expect(message.getByRole('link', { name: '98866 07720' })).toHaveAttribute(
      'href',
      'tel:+919886607720',
    );
    expect(message.getByRole('link', { name: /WhatsApp/ })).toHaveAttribute(
      'href',
      'https://wa.me/919886607720?text=Hi%20Ravi%20Kumar%2C%20thanks%20for%20contacting%20Prajzo.',
    );
    expect(message.getByText(/Business Websites · Professional Website/)).toBeVisible();
    // The message keeps its line breaks.
    const text = message.getByText(/I would like a website for my sweet shop/);
    expect(text).toHaveTextContent('Can you share the cost?');
    expect(text).toHaveClass('whitespace-pre-line');
  });

  it('leaves out what was not given', async () => {
    openInbox([
      sampleContactMessage({
        phone: null,
        websiteType: null,
        websiteTypeTitle: null,
        packageKey: null,
        packageName: null,
      }),
    ]);
    const message = await card('Ravi Kumar');
    expect(message.queryByText(/Interested in/)).not.toBeInTheDocument();
    expect(message.queryByRole('link', { name: /WhatsApp/ })).not.toBeInTheDocument();
    expect(message.queryByRole('link', { name: /tel:/ })).not.toBeInTheDocument();
  });

  it("opens the admin's own email app to reply, with the sender filled in", async () => {
    openInbox();
    const message = await card('Ravi Kumar');
    const reply = message.getByRole('link', { name: /Reply by email/ });
    expect(reply).toHaveAttribute(
      'href',
      'mailto:ravi@example.com?subject=Re%3A%20your%20message%20to%20Prajzo&body=Hi%20Ravi%20Kumar%2C%0A%0A',
    );
  });

  it('shows the inbox by default, with a filter for each folder, and counts the messages', async () => {
    const { fetchMock } = openInbox();
    expect(await screen.findByText('1 message')).toBeVisible();
    expect(requestedUrls(fetchMock)).toContain(inbox);

    const filters = within(screen.getByRole('navigation', { name: 'Filter the messages' }));
    expect(filters.getAllByRole('link').map((link) => link.textContent)).toEqual([
      'Inbox',
      'New',
      'Read',
      'Archived',
      'All',
    ]);
    expect(filters.getByRole('link', { name: 'Inbox' })).toHaveAttribute('aria-current', 'page');
    expect(filters.getByRole('link', { name: 'New' })).toHaveAttribute(
      'href',
      '/admin/messages?status=new',
    );
    expect(filters.getByRole('link', { name: 'New' })).not.toHaveAttribute('aria-current');
  });

  it('loads a folder when its filter is chosen, and marks it as the current one', async () => {
    const archived = '/api/v1/admin/contact-messages?status=archived&page=1&limit=20';
    const { user, router } = openInbox([sampleContactMessage()], {
      [`GET ${archived}`]: () =>
        jsonResponse(
          200,
          pageOf([sampleContactMessage({ name: 'Old Sender', status: 'archived' })]),
        ),
    });
    await card('Ravi Kumar');

    await user.click(
      within(screen.getByRole('navigation', { name: 'Filter the messages' })).getByRole('link', {
        name: 'Archived',
      }),
    );

    expect(await screen.findByText('Old Sender')).toBeVisible();
    expect(currentAddress(router)).toBe('/admin/messages?status=archived');
    expect(
      within(screen.getByRole('navigation', { name: 'Filter the messages' })).getByRole('link', {
        name: 'Archived',
      }),
    ).toHaveAttribute('aria-current', 'page');
  });

  it('searches, keeping the folder, and says what was searched for', async () => {
    const found = '/api/v1/admin/contact-messages?status=read&page=1&limit=20&q=sweet';
    const { fetchMock, user, router } = openInbox(
      [sampleContactMessage()],
      {
        'GET /api/v1/admin/contact-messages?status=read&page=1&limit=20': () =>
          jsonResponse(200, pageOf([sampleContactMessage({ status: 'read' })])),
        [`GET ${found}`]: () =>
          jsonResponse(200, pageOf([sampleContactMessage({ name: 'Sweet Seller' })])),
      },
      '/admin/messages?status=read',
    );
    await screen.findByRole('list', { name: 'Messages' });

    await user.type(screen.getByLabelText('Search'), 'sweet');
    await user.click(screen.getByRole('button', { name: 'Search' }));

    expect(await screen.findByText('Sweet Seller')).toBeVisible();
    expect(requestedUrls(fetchMock)).toContain(found);
    expect(currentAddress(router)).toBe('/admin/messages?status=read&q=sweet');
    // The folder links keep the search.
    expect(
      within(screen.getByRole('navigation', { name: 'Filter the messages' })).getByRole('link', {
        name: 'New',
      }),
    ).toHaveAttribute('href', '/admin/messages?status=new&q=sweet');
  });

  it('keeps the same search box when it is used, and follows the back button', async () => {
    const found = '/api/v1/admin/contact-messages?status=inbox&page=1&limit=20&q=sweet';
    const { user, router } = openInbox([sampleContactMessage()], {
      [`GET ${found}`]: () =>
        jsonResponse(200, pageOf([sampleContactMessage({ name: 'Sweet Seller' })])),
    });
    await screen.findByRole('list', { name: 'Messages' });
    const box = screen.getByLabelText('Search');

    await user.type(box, 'sweet');
    await user.click(screen.getByRole('button', { name: 'Search' }));
    await screen.findByText('Sweet Seller');
    expect(screen.getByLabelText('Search')).toBe(box);

    await act(() => router.navigate(-1));
    await screen.findByText('Ravi Kumar');
    expect(screen.getByLabelText('Search')).toHaveValue('');
  });

  it('pages through the messages', async () => {
    openInbox(
      [],
      {
        'GET /api/v1/admin/contact-messages?status=inbox&page=2&limit=20': () =>
          jsonResponse(200, pageOf([sampleContactMessage()], 45, 2)),
      },
      '/admin/messages?page=2',
    );
    const pages = within(await screen.findByRole('navigation', { name: 'Pages of messages' }));
    expect(pages.getByText('Page 2 of 3')).toBeVisible();
    expect(pages.getByRole('link', { name: 'Previous' })).toBeVisible();
  });

  it('says so when the inbox is empty', async () => {
    openInbox([]);
    expect(
      await screen.findByRole('heading', { level: 2, name: 'Your inbox is empty' }),
    ).toBeVisible();
  });

  it('says so when nothing matches, and goes back to the inbox', async () => {
    openInbox(
      [],
      {
        'GET /api/v1/admin/contact-messages?status=new&page=1&limit=20': () =>
          jsonResponse(200, pageOf([])),
      },
      '/admin/messages?status=new',
    );
    expect(await screen.findByRole('heading', { name: 'No messages match' })).toBeVisible();
    expect(screen.getByRole('link', { name: 'Back to the inbox' })).toHaveAttribute(
      'href',
      '/admin/messages',
    );
  });

  it('says so, and tries again on request, when the messages cannot be loaded', async () => {
    let calls = 0;
    const { user } = openInbox([], {
      [`GET ${inbox}`]: () => {
        calls += 1;
        return calls === 1
          ? jsonResponse(503, {
              error: {
                code: 'SERVICE_UNAVAILABLE',
                message: 'This part of the site is temporarily unavailable.',
              },
            })
          : jsonResponse(200, pageOf([sampleContactMessage({ name: 'Back again' })]));
      },
    });
    expect(await screen.findByRole('alert')).toHaveTextContent('temporarily unavailable');
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('Back again')).toBeVisible();
  });
});

describe('dealing with a message', () => {
  const patchUrl = 'PATCH /api/v1/admin/contact-messages/message-1';

  it('marks a new message as read only once the server has said so', async () => {
    let sent: unknown;
    const { user } = openInbox([sampleContactMessage()], {
      [patchUrl]: (init) => {
        sent = jsonBody(init);
        return jsonResponse(200, { message: sampleContactMessage({ status: 'read' }) });
      },
    });
    const message = await card('Ravi Kumar');
    expect(message.getByText('New')).toBeVisible();

    await user.click(message.getByRole('button', { name: 'Mark as read' }));

    expect(await message.findByText('Marked as read.')).toBeVisible();
    expect(sent).toEqual({ status: 'read' });
    expect(message.getByText('Read')).toBeVisible();
    expect(message.queryByText('New')).not.toBeInTheDocument();
    // The choices now fit a message that has been read.
    expect(message.queryByRole('button', { name: 'Mark as read' })).not.toBeInTheDocument();
    expect(message.getByRole('button', { name: 'Mark as new' })).toBeVisible();
  });

  it('can mark a read message as new again', async () => {
    let sent: unknown;
    const { user } = openInbox([sampleContactMessage({ status: 'read' })], {
      [patchUrl]: (init) => {
        sent = jsonBody(init);
        return jsonResponse(200, { message: sampleContactMessage({ status: 'new' }) });
      },
    });
    const message = await card('Ravi Kumar');

    await user.click(message.getByRole('button', { name: 'Mark as new' }));

    expect(await message.findByText('Marked as new.')).toBeVisible();
    expect(sent).toEqual({ status: 'new' });
    expect(message.getByText('New')).toBeVisible();
  });

  it('archives a message, and offers to move it back', async () => {
    let sent: unknown;
    const { user } = openInbox([sampleContactMessage()], {
      [patchUrl]: (init) => {
        sent = jsonBody(init);
        return jsonResponse(200, { message: sampleContactMessage({ status: 'archived' }) });
      },
    });
    const message = await card('Ravi Kumar');

    await user.click(message.getByRole('button', { name: 'Archive' }));

    expect(await message.findByText('Archived.')).toBeVisible();
    expect(sent).toEqual({ status: 'archived' });
    expect(message.getAllByText('Archived').length).toBeGreaterThan(0);
    expect(message.queryByRole('button', { name: 'Archive' })).not.toBeInTheDocument();
    expect(message.getByRole('button', { name: 'Move to inbox' })).toBeVisible();
  });

  it('moves an archived message back to the inbox as a read message', async () => {
    let sent: unknown;
    const { user } = openInbox(
      [],
      {
        [patchUrl]: (init) => {
          sent = jsonBody(init);
          return jsonResponse(200, { message: sampleContactMessage({ status: 'read' }) });
        },
        'GET /api/v1/admin/contact-messages?status=archived&page=1&limit=20': () =>
          jsonResponse(200, pageOf([sampleContactMessage({ status: 'archived' })])),
      },
      '/admin/messages?status=archived',
    );
    const message = await card('Ravi Kumar');

    await user.click(message.getByRole('button', { name: 'Move to inbox' }));

    expect(await message.findByText('Moved back to the inbox.')).toBeVisible();
    expect(sent).toEqual({ status: 'read' });
  });

  it('changes nothing on screen, and says so, when the server could not make the change', async () => {
    const { user } = openInbox([sampleContactMessage()], {
      [patchUrl]: () =>
        jsonResponse(503, {
          error: {
            code: 'SERVICE_UNAVAILABLE',
            message: 'This part of the site is temporarily unavailable.',
          },
        }),
    });
    const message = await card('Ravi Kumar');

    await user.click(message.getByRole('button', { name: 'Mark as read' }));

    expect(await message.findByRole('alert')).toHaveTextContent("The message wasn't changed");
    expect(message.getByRole('alert')).toHaveTextContent('temporarily unavailable');
    expect(message.getByText('New')).toBeVisible();
    expect(message.queryByText('Marked as read.')).not.toBeInTheDocument();
    expect(message.getByRole('button', { name: 'Mark as read' })).toBeEnabled();
  });
});
