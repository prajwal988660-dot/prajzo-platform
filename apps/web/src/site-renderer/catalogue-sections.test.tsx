import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Section, WebsiteConfig } from '@prajzo/shared';
import { catalogueTemplate } from '@prajzo/shared/templates';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { describe, expect, it } from 'vitest';
import { SiteContext, type RenderMode } from './context';
import { ProductsSection } from './catalogue-sections';

/**
 * The product list of the Catalogue template: which products are shown, and where the chosen
 * category is kept. On a live demo it belongs in the address so a filtered page can be shared
 * (Phase 12); in the builder's preview the address belongs to the builder, so it must not change.
 */

type ProductsSectionType = Extract<Section, { type: 'products' }>;

const config: WebsiteConfig = catalogueTemplate.parsedDefault;
const productsSection = config.pages[0]!.sections.find(
  (section): section is ProductsSectionType => section.type === 'products',
)!;

/** One category's products, for building a section with a different list. */
const withItems = (items: ProductsSectionType['content']['items']): ProductsSectionType => ({
  ...productsSection,
  content: { ...productsSection.content, items },
});

/** The products section alone, at an address, in one of the renderer's modes. */
function renderProducts({
  at = '/demo/catalogue',
  mode = 'demo',
  section = productsSection,
}: { at?: string; mode?: RenderMode; section?: ProductsSectionType } = {}) {
  const router = createMemoryRouter(
    [
      {
        path: '*',
        element: (
          <SiteContext.Provider value={{ config, mode }}>
            <ProductsSection section={section} />
          </SiteContext.Provider>
        ),
      },
    ],
    { initialEntries: [at] },
  );
  render(<RouterProvider router={router} />);
  return router;
}

const address = (router: ReturnType<typeof renderProducts>) =>
  router.state.location.pathname + router.state.location.search;

const productNames = () =>
  screen
    .getAllByRole('article')
    .map((card) => within(card).getByRole('heading', { level: 3 }).textContent);

describe('the product list', () => {
  it('shows every product until a category is chosen', () => {
    renderProducts();
    expect(screen.getAllByRole('article')).toHaveLength(9);
    expect(screen.getByRole('status')).toHaveTextContent('Showing all 9');
  });

  it('shows only the chosen category, and says so', async () => {
    const user = userEvent.setup();
    renderProducts();

    await user.click(screen.getByRole('button', { name: 'Table linen' }));

    expect(productNames()).toEqual(['Striped table runner', 'Napkin set of 6', 'Ikat tablecloth']);
    expect(screen.getByRole('status')).toHaveTextContent('Showing 3 in Table linen');
    expect(screen.getByRole('button', { name: 'Table linen' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('keeps the chosen category in the address, so the page can be shared', async () => {
    const user = userEvent.setup();
    const router = renderProducts();

    await user.click(screen.getByRole('button', { name: 'Bedding' }));
    expect(address(router)).toBe('/demo/catalogue?category=Bedding');

    // "All" takes it back out again rather than leaving an empty value behind.
    await user.click(screen.getByRole('button', { name: 'All' }));
    expect(address(router)).toBe('/demo/catalogue');
  });

  it('starts filtered when the address asks for a category', () => {
    renderProducts({ at: '/demo/catalogue?category=Cushions' });
    expect(screen.getAllByRole('article')).toHaveLength(3);
    expect(screen.getByRole('button', { name: 'Cushions' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('shows everything when the address asks for a category that does not exist', () => {
    renderProducts({ at: '/demo/catalogue?category=Curtains' });
    expect(screen.getAllByRole('article')).toHaveLength(9);
    expect(screen.getByRole('button', { name: 'All' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('leaves the address alone in the builder preview, where it belongs to the builder', async () => {
    const user = userEvent.setup();
    const router = renderProducts({ at: '/preview', mode: 'preview' });

    await user.click(screen.getByRole('button', { name: 'Bedding' }));

    // The filter still works, it just is not written down.
    expect(screen.getAllByRole('article')).toHaveLength(3);
    expect(address(router)).toBe('/preview');
  });

  it('says there are no products when the catalogue is empty', () => {
    renderProducts({ section: withItems([]) });

    expect(screen.queryByRole('article')).not.toBeInTheDocument();
    expect(screen.getByText('No products yet.')).toBeVisible();
    // With nothing to filter there are no filters to show.
    expect(
      screen.queryByRole('group', { name: 'Show products by category' }),
    ).not.toBeInTheDocument();
  });
});
