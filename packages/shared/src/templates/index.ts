import type { TemplateKey } from '../site-config/config';
import type { DefinedTemplate } from '../site-config/template';
import { portfolioTemplate } from './portfolio';

/**
 * Every template whose design exists in code (D-005). The other demo keys (business, event,
 * catalogue, forms) are added here as each one is built (Phases 10 to 13).
 */
export const templates: Partial<Record<TemplateKey, DefinedTemplate>> = {
  portfolio: portfolioTemplate,
};

export function templateFor(key: string): DefinedTemplate | undefined {
  return Object.hasOwn(templates, key) ? templates[key as TemplateKey] : undefined;
}

export { portfolioTemplate };
