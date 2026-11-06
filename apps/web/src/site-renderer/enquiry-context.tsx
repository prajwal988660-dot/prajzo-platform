import type { WebsiteConfig } from '@prajzo/shared';
import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

/** Which product someone pressed "Enquire" on, so the enquiry form can start with it. */
const EnquiryContext = createContext<{
  product: string;
  ask: (product: string) => void;
}>({ product: '', ask: () => undefined });

export function EnquiryProvider({ children }: { children: ReactNode }) {
  const [product, setProduct] = useState('');
  const value = useMemo(() => ({ product, ask: setProduct }), [product]);
  return <EnquiryContext.Provider value={value}>{children}</EnquiryContext.Provider>;
}

export const useEnquiry = () => useContext(EnquiryContext);

/** The products on a design's pages, for the enquiry form's list. */
export function productNames(config: WebsiteConfig): string[] {
  return config.pages.flatMap((page) =>
    page.sections.flatMap((section) =>
      section.type === 'products' && section.enabled
        ? section.content.items.map((product) => product.name)
        : [],
    ),
  );
}
