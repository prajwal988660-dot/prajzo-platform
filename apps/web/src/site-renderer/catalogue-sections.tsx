import type { Section, WebsiteConfig } from '@prajzo/shared';
import { useId, useState } from 'react';
import { useSearchParams } from 'react-router';
import { useSite } from './context';
import { DemoAction } from './DemoAction';
import { useEnquiry } from './enquiry-context';
import { SectionShell, SiteImageTag } from './parts';
import { SiteEnquiryForm } from './SiteEnquiryForm';

/** Sections first used by the Product Catalogue demo (Phase 12); any template may use them. */

type Props<T extends Section['type']> = { section: Extract<Section, { type: T }> };

/** The enquiry form on the page, if there is one: "Enquire" takes people there. */
function enquiryTarget(config: WebsiteConfig): string | undefined {
  for (const page of config.pages) {
    const form = page.sections.find((section) => section.type === 'enquiry' && section.enabled);
    if (form) return form.id;
  }
  return undefined;
}

type Product = Extract<Section, { type: 'products' }>['content']['items'][number];

/**
 * The chosen category. On a live demo it is kept in the address (`?category=Bedding`), so a
 * filtered page can be shared and survives a reload. In the builder's preview and in review the
 * address belongs to the builder, not the design, so the choice is only remembered here.
 */
function useCategoryFilter(categories: string[]): [string | null, (next: string | null) => void] {
  const { mode } = useSite();
  const [searchParams, setSearchParams] = useSearchParams();
  const [remembered, setRemembered] = useState<string | null>(null);

  if (mode !== 'demo') return [remembered, setRemembered];

  // An unknown or misspelled category in the address shows everything rather than nothing.
  const asked = searchParams.get('category');
  const chosen = asked && categories.includes(asked) ? asked : null;

  return [
    chosen,
    (next: string | null) => {
      const params = new URLSearchParams(searchParams);
      if (next === null) params.delete('category');
      else params.set('category', next);
      // The filter is not a new page: Back should leave the demo, not undo each filter.
      setSearchParams(params, { replace: true, preventScrollReset: true });
    },
  ];
}

function ProductCard({ product, enquireAt }: { product: Product; enquireAt: string | undefined }) {
  const { config, mode } = useSite();
  const { ask } = useEnquiry();
  const [open, setOpen] = useState(false);
  const detailsId = useId();
  const message = `Hi, I'd like to know about the ${product.name}${product.priceNote ? ` (${product.priceNote})` : ''}.`;

  return (
    <article className="ps-product" aria-labelledby={`${detailsId}-name`}>
      <div className="ps-product-picture">
        <SiteImageTag image={product.image} className="ps-product-image" />
        {mode === 'demo' ? <span className="ps-product-sample">Sample</span> : null}
      </div>
      <div className="ps-product-body">
        <h3 id={`${detailsId}-name`}>{product.name}</h3>
        <p className="ps-product-category">{product.category}</p>
        {product.priceNote ? <p className="ps-price-note">{product.priceNote}</p> : null}
        <p>{product.summary}</p>
        {product.details.length ? (
          <>
            <button
              type="button"
              className="ps-link-button"
              aria-expanded={open}
              aria-controls={detailsId}
              onClick={() => setOpen((value) => !value)}
            >
              {open ? 'Hide details' : 'Details'}
            </button>
            <ul id={detailsId} className="ps-product-details" hidden={!open}>
              {product.details.map((detail) => (
                <li key={detail}>{detail}</li>
              ))}
            </ul>
          </>
        ) : null}
        <div className="ps-product-actions">
          {enquireAt ? (
            <a
              className="ps-button ps-button-primary"
              href={`#${enquireAt}`}
              aria-label={`Enquire about the ${product.name}`}
              onClick={() => ask(product.name)}
            >
              Enquire
            </a>
          ) : null}
          {config.contact.whatsapp ? (
            <DemoAction
              className="ps-button ps-button-secondary"
              label={`WhatsApp about the ${product.name}`}
              note={`On the real website, this opens WhatsApp to ${config.site.name} with the message: “${message}”`}
            >
              WhatsApp
            </DemoAction>
          ) : null}
        </div>
      </div>
    </article>
  );
}

export function ProductsSection({ section }: Props<'products'>) {
  const { config } = useSite();
  const { content } = section;
  const categories = [...new Set(content.items.map((product) => product.category))];
  const [filter, setFilter] = useCategoryFilter(categories);
  const shown = filter
    ? content.items.filter((product) => product.category === filter)
    : content.items;
  const enquireAt = enquiryTarget(config);

  return (
    <SectionShell section={section} heading={content.heading}>
      {content.intro ? <p className="ps-intro">{content.intro}</p> : null}
      {content.showFilters && categories.length > 1 ? (
        <div className="ps-filters" role="group" aria-label="Show products by category">
          {[null, ...categories].map((category) => (
            <button
              key={category ?? 'all'}
              type="button"
              aria-pressed={filter === category}
              onClick={() => setFilter(category)}
            >
              {category ?? 'All'}
            </button>
          ))}
        </div>
      ) : null}
      <p className="ps-visually-hidden" role="status">
        {filter
          ? `Showing ${String(shown.length)} in ${filter}`
          : `Showing all ${String(shown.length)}`}
      </p>
      {shown.length ? (
        <ul className="ps-products">
          {shown.map((product) => (
            <li key={product.id}>
              <ProductCard product={product} enquireAt={enquireAt} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="ps-empty">
          {filter ? `Nothing in ${filter} just now.` : 'No products yet.'}{' '}
          {filter ? (
            <button type="button" className="ps-link-button" onClick={() => setFilter(null)}>
              Show everything
            </button>
          ) : null}
        </p>
      )}
    </SectionShell>
  );
}

export function EnquirySection({ section }: Props<'enquiry'>) {
  const { content } = section;
  return (
    <section
      id={section.id}
      className="ps-section ps-inner"
      data-variant={section.variant}
      aria-labelledby={`${section.id}-heading`}
    >
      <div className="ps-contact">
        <div className="ps-contact-text">
          <h2 id={`${section.id}-heading`}>{content.heading}</h2>
          {content.intro ? <p className="ps-intro">{content.intro}</p> : null}
        </div>
        <SiteEnquiryForm content={content} />
      </div>
    </section>
  );
}
