import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import type { NavItem } from '../../app/navigation';
import { SiteHeader } from './SiteHeader';

const items: NavItem[] = [
  { label: 'Home', to: '/', available: true },
  { label: 'Services', to: '/services', available: true },
  { label: 'Contact', to: '/contact', available: true },
];

function renderHeader(props: Parameters<typeof SiteHeader>[0] = {}, path = '/') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <SiteHeader {...props} />
    </MemoryRouter>,
  );
}

describe('SiteHeader', () => {
  it('always links the logo to the home page', () => {
    renderHeader({ items: [] });
    expect(screen.getByRole('link', { name: 'Prajzo home' })).toHaveAttribute('href', '/');
  });

  it('shows no navigation or menu button while there is only one page', () => {
    renderHeader({ items: [items[0]!], callToAction: null });
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /menu/i })).not.toBeInTheDocument();
  });

  it('lists the available pages and marks the current one', () => {
    renderHeader({ items, callToAction: null }, '/services');
    const nav = screen.getByRole('navigation', { name: 'Main' });
    expect(
      within(nav)
        .getAllByRole('link')
        .map((link) => link.textContent),
    ).toEqual(['Home', 'Services', 'Contact']);
    expect(within(nav).getByRole('link', { name: 'Services' })).toHaveAttribute(
      'aria-current',
      'page',
    );
  });

  it('opens and closes the mobile menu with its button', async () => {
    const user = userEvent.setup();
    renderHeader({ items, callToAction: null });

    const button = screen.getByRole('button', { name: 'Open menu' });
    expect(button).toHaveAttribute('aria-expanded', 'false');

    await user.click(button);
    expect(button).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('button', { name: 'Close menu' })).toBeInTheDocument();
    expect(screen.getAllByRole('navigation', { name: 'Main' })).toHaveLength(2);

    await user.click(button);
    expect(button).toHaveAttribute('aria-expanded', 'false');
  });

  it('moves focus into the open menu, and Escape closes it and returns focus to the button', async () => {
    const user = userEvent.setup();
    renderHeader({ items, callToAction: null });
    const button = screen.getByRole('button', { name: 'Open menu' });

    await user.click(button);
    const menuLinks = within(screen.getAllByRole('navigation', { name: 'Main' })[1]!).getAllByRole(
      'link',
    );
    expect(menuLinks[0]).toHaveFocus();

    await user.keyboard('{Escape}');
    expect(button).toHaveAttribute('aria-expanded', 'false');
    expect(button).toHaveFocus();
  });

  it('closes the mobile menu after a link is chosen', async () => {
    const user = userEvent.setup();
    renderHeader({ items, callToAction: null });
    await user.click(screen.getByRole('button', { name: 'Open menu' }));

    const menu = screen.getAllByRole('navigation', { name: 'Main' })[1]!;
    await user.click(within(menu).getByRole('link', { name: 'Contact' }));
    expect(screen.getByRole('button', { name: 'Open menu' })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
  });

  it('shows the call-to-action button when one is given', () => {
    renderHeader({
      items,
      callToAction: { label: 'Start a Project', to: '/start', available: true },
    });
    expect(screen.getByRole('link', { name: 'Start a Project' })).toHaveAttribute('href', '/start');
  });
});
