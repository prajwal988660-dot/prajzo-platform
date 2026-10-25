import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { EmptyState } from './EmptyState';

describe('EmptyState', () => {
  it('shows its title, description and action', () => {
    render(
      <EmptyState
        title="Nothing here"
        description="Come back later."
        action={<button type="button">Go back</button>}
      />,
    );
    expect(screen.getByRole('heading', { name: 'Nothing here' })).toBeVisible();
    expect(screen.getByText('Come back later.')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Go back' })).toBeVisible();
  });

  it('makes its title a level 3 heading by default, for use inside a section', () => {
    render(<EmptyState title="Nothing here" />);
    expect(screen.getByRole('heading', { level: 3, name: 'Nothing here' })).toBeVisible();
  });

  it.each([1, 2, 3] as const)('can make its title a level %i heading', (level) => {
    render(<EmptyState title="Nothing here" headingLevel={level} />);
    expect(screen.getByRole('heading', { level, name: 'Nothing here' })).toBeVisible();
  });
});
