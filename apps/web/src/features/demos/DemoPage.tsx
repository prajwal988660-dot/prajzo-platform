import type { SitePagePath, TemplateKey } from '@prajzo/shared';
import { templateFor } from '@prajzo/shared/templates';
import { Link } from 'react-router';
import { SkipLink } from '../../components/layout/SkipLink';
import { usePageMeta } from '../../lib/use-page-meta';
import { SiteRenderer } from '../../site-renderer/SiteRenderer';
import './demo-bar.css';

/**
 * A live demo (D-007, D-014): the template's own default design, drawn by the site renderer,
 * under a bar that says it is a demo and that everyone in it is made up. The bar stays at the
 * top as the visitor scrolls.
 */
export function DemoPage({ templateKey }: { templateKey: TemplateKey }) {
  usePageMeta(`/demo/${templateKey}` as SitePagePath);
  const template = templateFor(templateKey);
  if (!template) throw new Error(`No template called ${templateKey}`);
  return (
    <div className="demo-page">
      <SkipLink target="site-main" />
      <aside className="demo-bar" aria-label="About this demo">
        <p>
          <strong>Demo website by Prajzo, for evaluation only.</strong>{' '}
          <span>Everyone and everything in it is made up.</span>
        </p>
        <nav aria-label="Demo" className="demo-bar-links">
          <Link to="/start-project">Start a project like this</Link>
          <Link to="/">Back to Prajzo</Link>
        </nav>
      </aside>
      <SiteRenderer config={template.parsedDefault} mode="demo" />
    </div>
  );
}
