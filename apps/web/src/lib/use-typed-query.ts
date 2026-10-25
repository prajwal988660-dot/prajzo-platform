import { useState } from 'react';

/**
 * The text in a search box. It starts as what the address says and follows the address when that
 * changes (the back button, a "show everything" link), but is the person's own while they type.
 *
 * Giving the form a new `key` whenever the address changes would also reset the box, but it would
 * replace the element the person is using and drop their keyboard focus. This keeps the same box.
 */
export function useTypedQuery(fromAddress: string): [string, (value: string) => void] {
  const [typed, setTyped] = useState(fromAddress);
  const [seen, setSeen] = useState(fromAddress);
  // Adjusting state while rendering is the documented way to react to a changed input.
  if (seen !== fromAddress) {
    setSeen(fromAddress);
    setTyped(fromAddress);
  }
  return [typed, setTyped];
}
