import type { TemplateKey } from '../site-config/config';
import type { DefinedTemplate } from '../site-config/template';
import { businessTemplate } from './business';
import { catalogueTemplate } from './catalogue';
import { eventTemplate } from './event';
import { portfolioTemplate } from './portfolio';

/**
 * Every template whose design exists in code (D-005). Forms is added here when it is built
 * (Phase 13).
 */
export const templates: Partial<Record<TemplateKey, DefinedTemplate>> = {
  portfolio: portfolioTemplate,
  business: businessTemplate,
  event: eventTemplate,
  catalogue: catalogueTemplate,
};

export function templateFor(key: string): DefinedTemplate | undefined {
  return Object.hasOwn(templates, key) ? templates[key as TemplateKey] : undefined;
}

export { businessTemplate, catalogueTemplate, eventTemplate, portfolioTemplate };
