import { useId, useState, type ReactNode } from 'react';

/**
 * A button that stands in for a link which would contact someone (email, phone, WhatsApp) or
 * leave for another website (a social profile). On a demo it explains what would happen instead
 * of doing it (D-014), so nobody is ever contacted from a demo.
 */
export function DemoAction({
  children,
  note,
  className,
  label,
}: {
  children: ReactNode;
  /** A fuller name for screen readers; it starts with the visible words. */
  label?: string;
  /** What would happen on the real website. */
  note: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const noteId = useId();
  return (
    <span className="ps-demo-action">
      <button
        type="button"
        className={className}
        aria-label={label}
        aria-expanded={open}
        aria-controls={noteId}
        onClick={() => setOpen((value) => !value)}
      >
        {children}
      </button>
      <span id={noteId} role="status" className="ps-demo-note" hidden={!open}>
        {open ? `${note} This is a demo, so nothing happens.` : ''}
      </span>
    </span>
  );
}
