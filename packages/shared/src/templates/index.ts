import type { TemplateKey } from '../site-config/config';
import type { DefinedTemplate } from '../site-config/template';
import { businessTemplate } from './business';
import { portfolioTemplate } from './portfolio';

/**
 * Every template whose design exists in code (D-005). Event, Catalogue and Forms are added here as
 * each one is built (Phases 11 to 13).
 */
export const templates: Partial<Record<TemplateKey, DefinedTemplate>> = {
  portfolio: portfolioTemplate,
  business: businessTemplate,
};

export function templateFor(key: string): DefinedTemplate | undefined {
  return Object.hasOwn(templates, key) ? templates[key as TemplateKey] : undefined;
}

export { businessTemplate, portfolioTemplate };
