import { uploadResponseSchema } from '@prajzo/shared';
import { Upload } from 'lucide-react';
import { useId, useRef, useState } from 'react';
import { ApiError, apiRequest } from '../../lib/api';

const MAX_BYTES = 5 * 1024 * 1024;
const TYPES = ['image/jpeg', 'image/png', 'image/webp'];

/**
 * Uploads a picture for a section (D-012). The browser checks the type and size first so a wrong
 * file is caught at once; the server checks the picture's real content again and makes the clean
 * copy whose address is used.
 */
export function UploadButton({ onUploaded }: { onUploaded: (src: string) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const statusId = useId();
  const [state, setState] = useState<
    | { kind: 'idle' }
    | { kind: 'uploading' }
    | { kind: 'done' }
    | { kind: 'failed'; message: string }
  >({ kind: 'idle' });

  const send = async (file: File) => {
    if (!TYPES.includes(file.type)) {
      setState({ kind: 'failed', message: 'Choose a JPEG, PNG or WebP picture.' });
      return;
    }
    if (file.size > MAX_BYTES) {
      setState({ kind: 'failed', message: 'Pictures can be at most 5 MB.' });
      return;
    }
    setState({ kind: 'uploading' });
    try {
      const { src } = await apiRequest('/v1/uploads', uploadResponseSchema, {
        method: 'POST',
        headers: { 'Content-Type': file.type },
        body: file,
      });
      onUploaded(src);
      setState({ kind: 'done' });
    } catch (error) {
      setState({
        kind: 'failed',
        message: error instanceof ApiError ? error.message : 'The picture could not be uploaded.',
      });
    }
  };

  return (
    <span className="grid gap-1">
      <label className="inline-flex cursor-pointer items-center gap-2 justify-self-start rounded-full border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-ink hover:border-ink has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-brand-blue">
        <Upload aria-hidden="true" className="size-4" />
        {state.kind === 'uploading' ? 'Uploading…' : 'Upload a picture'}
        <input
          ref={input}
          type="file"
          accept={TYPES.join(',')}
          className="sr-only"
          aria-describedby={statusId}
          disabled={state.kind === 'uploading'}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void send(file);
            if (input.current) input.current.value = '';
          }}
        />
      </label>
      <span id={statusId} role="status" className="text-xs text-slate-600">
        {state.kind === 'failed' ? (
          <span className="font-medium text-red-700">{state.message}</span>
        ) : state.kind === 'done' ? (
          'Uploaded. Describe the picture above.'
        ) : (
          'JPEG, PNG or WebP, up to 5 MB.'
        )}
      </span>
    </span>
  );
}
