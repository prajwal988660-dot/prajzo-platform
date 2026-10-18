import { siteLinks } from '@prajzo/shared';
import { MessageCircle } from 'lucide-react';

/** Floating "chat on WhatsApp" button, shown on public pages. */
export function WhatsAppButton() {
  return (
    <a
      href={siteLinks.whatsapp("Hi Prajzo! I'd like to talk about a website.")}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-5 right-5 z-30 inline-flex size-14 items-center justify-center rounded-full bg-emerald-600 text-white shadow-lift transition hover:bg-emerald-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue sm:bottom-6 sm:right-6"
    >
      <MessageCircle aria-hidden="true" className="size-6" />
      <span className="sr-only">Chat with Prajzo on WhatsApp (opens in a new tab)</span>
    </a>
  );
}
