import type { WebsiteConfig } from '@prajzo/shared';
import { useEffect, useRef, useState } from 'react';
import { PREVIEW_READY, PREVIEW_SHOW, type PreviewShowMessage } from './preview-messages';

export const devices = {
  desktop: { label: 'Computer', width: 1280, height: 800 },
  tablet: { label: 'Tablet', width: 768, height: 1024 },
  mobile: { label: 'Phone', width: 390, height: 844 },
} as const;
export type Device = keyof typeof devices;

/**
 * The live preview (D-006): /preview in a frame that really is the device's width, scaled down to
 * fit, so a phone layout behaves exactly as on a phone. It is sent the design whenever it changes.
 */
export function PreviewFrame({ config, device }: { config: WebsiteConfig; device: Device }) {
  const frame = useRef<HTMLIFrameElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [available, setAvailable] = useState(0);
  const { width, height, label } = devices[device];

  // The frame says when it is listening; until then there is nobody to send to.
  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      const data = event.data as { type?: unknown } | null;
      if (
        event.origin === window.location.origin &&
        event.source === frame.current?.contentWindow &&
        data?.type === PREVIEW_READY
      ) {
        setReady(true);
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  useEffect(() => {
    if (!ready) return;
    const message: PreviewShowMessage = { type: PREVIEW_SHOW, config, page: '' };
    frame.current?.contentWindow?.postMessage(message, window.location.origin);
  }, [ready, config]);

  // Scale the frame to the space there is.
  useEffect(() => {
    const element = box.current;
    if (!element) return;
    // Very old browsers (and the test runner) have no ResizeObserver: measure once instead.
    if (typeof ResizeObserver === 'undefined') {
      setAvailable(element.clientWidth);
      return;
    }
    const observer = new ResizeObserver(([entry]) => setAvailable(entry?.contentRect.width ?? 0));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  const scale = available ? Math.min(1, available / width) : 1;

  return (
    <div ref={box} className="w-full">
      <div
        className="mx-auto overflow-hidden rounded-xl border border-slate-300 bg-white shadow-card"
        style={{ width: width * scale, height: height * scale }}
      >
        <iframe
          ref={frame}
          src="/preview"
          title={`Preview of your website on a ${label.toLowerCase()} (${String(width)} pixels wide)`}
          width={width}
          height={height}
          className="origin-top-left border-0"
          style={{ transform: `scale(${String(scale)})` }}
        />
      </div>
      <p className="mt-2 text-center text-xs text-slate-600">
        {label}, {width} px wide{scale < 1 ? `, shown at ${String(Math.round(scale * 100))}%` : ''}
      </p>
    </div>
  );
}
