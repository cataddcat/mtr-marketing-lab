import * as v from 'valibot';

const ImageResponseSchema = v.object({
  image: v.pipe(v.string(), v.minLength(1)),
  cached: v.boolean(),
});

export type ImageResponse = v.InferOutput<typeof ImageResponseSchema>;

const PROXY_URL = (import.meta.env.VITE_AI_PROXY_URL ?? '').replace(/\/+$/, '');

export class ImageGenerationError extends Error {
  readonly status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.name = 'ImageGenerationError';
    this.status = status;
  }
}

export const generateImagePreview = async (
  prompt: string,
  signal?: AbortSignal,
): Promise<ImageResponse> => {
  if (!PROXY_URL) {
    throw new ImageGenerationError('VITE_AI_PROXY_URL is not configured');
  }
  if (prompt.trim().length === 0) {
    throw new ImageGenerationError('Empty prompt');
  }

  let res: Response;
  try {
    res = await fetch(`${PROXY_URL}/image`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt }),
      signal,
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') throw err;
    throw new ImageGenerationError(
      err instanceof Error ? err.message : String(err),
    );
  }

  let payload: unknown = null;
  try {
    payload = await res.json();
  } catch {
    /* non-JSON */
  }

  if (!res.ok) {
    const errMsg =
      payload && typeof payload === 'object' && 'error' in payload
        ? String((payload as { error: unknown }).error)
        : `Proxy returned HTTP ${res.status}`;
    throw new ImageGenerationError(errMsg, res.status);
  }

  const parsed = v.safeParse(ImageResponseSchema, payload);
  if (!parsed.success) {
    throw new ImageGenerationError('Unexpected image response shape', res.status);
  }
  return parsed.output;
};
