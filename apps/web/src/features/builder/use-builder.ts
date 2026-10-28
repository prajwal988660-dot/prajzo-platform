import { configSchemaFor, type DefinedTemplate, type WebsiteConfig } from '@prajzo/shared';
import { useCallback, useMemo, useState } from 'react';

/** A problem in the design, at its place (such as pages.0.sections.1.content.heading). */
export type DesignIssue = { path: string; message: string };

/**
 * The design being edited. Every change is a small function that changes a copy, so the old
 * version is never touched (React sees each change, and "unsaved changes" can be compared).
 * The design is checked on every change with the same rules the server uses, so problems show
 * while typing, not only when saving.
 */
export function useBuilder(template: DefinedTemplate, initial: WebsiteConfig) {
  const [config, setConfig] = useState(initial);
  const [saved, setSaved] = useState(() => JSON.stringify(initial));

  const update = useCallback((change: (draft: WebsiteConfig) => void) => {
    setConfig((current) => {
      const draft = structuredClone(current);
      change(draft);
      return draft;
    });
  }, []);

  const schema = useMemo(() => configSchemaFor(template), [template]);
  const issues = useMemo<DesignIssue[]>(() => {
    const result = schema.safeParse(config);
    return result.success
      ? []
      : result.error.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        }));
  }, [schema, config]);

  /** The first problem at this place in the design, for showing beside its field. */
  const issueAt = useCallback(
    (path: string) => issues.find((issue) => issue.path === path)?.message,
    [issues],
  );

  const unsaved = JSON.stringify(config) !== saved;
  const markSaved = useCallback((savedConfig: WebsiteConfig) => {
    setSaved(JSON.stringify(savedConfig));
  }, []);

  return { config, setConfig, update, issues, issueAt, unsaved, markSaved };
}

export type Builder = ReturnType<typeof useBuilder>;
