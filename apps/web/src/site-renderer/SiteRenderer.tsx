import type { WebsiteConfig } from '@prajzo/shared';
import './site.css';
import { SiteContext, type RenderMode } from './context';
import { useFonts } from './fonts';
import { SiteSection } from './sections';
import { designVariables } from './theme';

/**
 * Draws any website design (architecture 5.4). The live demos, the builder's preview and the
 * admin review all use this, so what a customer designs is exactly what they get.
 */
export function SiteRenderer({
  config,
  mode,
  pageSlug = '',
}: {
  config: WebsiteConfig;
  mode: RenderMode;
  /** Which page to show: "" is the home page. */
  pageSlug?: string;
}) {
  const { design } = config;
  useFonts(design.fonts.heading, design.fonts.body);
  const page =
    config.pages.find((candidate) => candidate.enabled && candidate.slug === pageSlug) ??
    config.pages.find((candidate) => candidate.enabled && candidate.type === 'home');
  if (!page) return null;

  const sections = page.sections.filter((section) => section.enabled);
  const header = sections.filter((section) => section.type === 'header');
  const footer = sections.filter((section) => section.type === 'footer');
  const body = sections.filter((section) => section.type !== 'header' && section.type !== 'footer');

  return (
    <SiteContext.Provider value={{ config, mode }}>
      <div
        id="top"
        className="ps-site"
        data-template={config.template.key}
        data-buttons={design.buttonStyle}
        data-spacing={design.spacing}
        style={designVariables(design)}
      >
        {header.map((section) => (
          <SiteSection key={section.id} section={section} config={config} />
        ))}
        <main id="site-main" tabIndex={-1} className="ps-main">
          {body.map((section) => (
            <SiteSection key={section.id} section={section} config={config} />
          ))}
        </main>
        {footer.map((section) => (
          <SiteSection key={section.id} section={section} config={config} />
        ))}
      </div>
    </SiteContext.Provider>
  );
}
