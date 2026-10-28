import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { jsonResponse, mockApi } from '../../test/mock-api';
import { UploadButton } from './UploadButton';

afterEach(() => {
  vi.unstubAllGlobals();
});

const src = '/uploads/1f0e2d3c-4b5a-6978-8a9b-0c1d2e3f4a5b.webp';

describe('the upload button (D-012)', () => {
  it('refuses a wrong type or a file over 5 MB without sending anything', async () => {
    const fetchMock = mockApi({});
    const user = userEvent.setup({ applyAccept: false });
    render(<UploadButton onUploaded={() => undefined} />);
    const input = screen.getByLabelText(/Upload a picture/);

    await user.upload(input, new File(['<svg/>'], 'logo.svg', { type: 'image/svg+xml' }));
    expect(screen.getByRole('status')).toHaveTextContent('Choose a JPEG, PNG or WebP picture.');

    const big = new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'huge.jpg', { type: 'image/jpeg' });
    await user.upload(input, big);
    expect(screen.getByRole('status')).toHaveTextContent('Pictures can be at most 5 MB.');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('sends the picture as it is, with its real type, and uses the address the server gives', async () => {
    const onUploaded = vi.fn();
    const fetchMock = mockApi({
      'POST /api/v1/uploads': () => jsonResponse(201, { src, width: 800, height: 600 }),
    });
    const user = userEvent.setup();
    render(<UploadButton onUploaded={onUploaded} />);
    const file = new File(['fake jpeg bytes'], 'me.jpg', { type: 'image/jpeg' });
    await user.upload(screen.getByLabelText(/Upload a picture/), file);

    expect(await screen.findByText('Uploaded. Describe the picture above.')).toBeInTheDocument();
    expect(onUploaded).toHaveBeenCalledWith(src);
    const [, init] = fetchMock.mock.calls[0]!;
    expect(new Headers(init?.headers).get('Content-Type')).toBe('image/jpeg');
    expect(init?.body).toBe(file);
  });

  it('shows the server’s own words when it refuses', async () => {
    mockApi({
      'POST /api/v1/uploads': () =>
        jsonResponse(400, {
          error: { code: 'BAD_REQUEST', message: 'Upload a JPEG, PNG or WebP picture.' },
        }),
    });
    const user = userEvent.setup();
    render(<UploadButton onUploaded={() => undefined} />);
    await user.upload(
      screen.getByLabelText(/Upload a picture/),
      new File(['not really'], 'fake.png', { type: 'image/png' }),
    );
    expect(await screen.findByText('Upload a JPEG, PNG or WebP picture.')).toBeInTheDocument();
  });
});
