/**
 * Image preview endpoint backed by Cloudflare Workers AI (FLUX-Schnell).
 * Free tier: ~66 images/day. KV-cached for 24h keyed by sha256(prompt).
 */

import { sha256Hex } from './judge-cache';

const IMAGE_TTL_SEC = 24 * 60 * 60;

export interface ImageRequest {
  readonly prompt: string;
  /** Optional aspect/size hint. FLUX-Schnell defaults to 1024×1024. */
  readonly aspect?: 'square' | 'portrait' | 'landscape';
}

interface FluxResponse {
  // FLUX-Schnell returns { image: "<base64 png>" }
  readonly image?: string;
}

/**
 * Returns a base64 PNG data URL (cached aggressively). On failure or quota
 * exhaustion, returns null — caller can show a graceful fallback.
 */
export async function generateImage(
  env: { AI?: Ai; IMAGE_KV?: KVNamespace; JUDGE_KV?: KVNamespace },
  req: ImageRequest,
): Promise<{ image: string; cached: boolean } | { error: string }> {
  const prompt = req.prompt.trim();
  if (prompt.length === 0) return { error: 'Empty prompt' };
  if (prompt.length > 1500) return { error: 'Prompt too long (max 1500 chars)' };

  // share JUDGE_KV with 'img:' prefix — avoids needing yet another namespace
  const kv = env.IMAGE_KV ?? env.JUDGE_KV;
  const key = `img:${await sha256Hex(prompt)}`;

  if (kv) {
    const cached = await kv.get(key);
    if (cached) return { image: cached, cached: true };
  }

  if (!env.AI) {
    return { error: 'Workers AI binding not configured' };
  }

  try {
    const result = (await env.AI.run('@cf/black-forest-labs/flux-1-schnell', {
      prompt,
      // FLUX-Schnell uses default 4 steps for fast generation
      // steps: 4,
    })) as FluxResponse;

    if (!result.image) return { error: 'Workers AI returned no image' };

    const dataUrl = `data:image/png;base64,${result.image}`;
    if (kv) {
      await kv.put(key, dataUrl, { expirationTtl: IMAGE_TTL_SEC });
    }
    return { image: dataUrl, cached: false };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { error: `Workers AI: ${msg}` };
  }
}
