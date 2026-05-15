import { useState } from 'react';
import { Loader2, ImageIcon, RefreshCw, AlertCircle, Download } from 'lucide-react';
import { generateImagePreview, ImageGenerationError } from '../services/image';

interface Props {
  /** Prompt to feed FLUX-Schnell — typically the visual_idea or ai_prompt. */
  readonly prompt: string;
  /** Optional filename hint for download. */
  readonly downloadName?: string;
}

type State =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ready'; src: string; cached: boolean }
  | { status: 'error'; message: string };

export function ImagePreview({ prompt, downloadName }: Props) {
  const [state, setState] = useState<State>({ status: 'idle' });

  const run = async () => {
    setState({ status: 'loading' });
    try {
      const result = await generateImagePreview(prompt);
      setState({ status: 'ready', src: result.image, cached: result.cached });
    } catch (err) {
      const msg =
        err instanceof ImageGenerationError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Unknown error';
      setState({ status: 'error', message: msg });
    }
  };

  if (state.status === 'idle') {
    return (
      <button
        type="button"
        onClick={run}
        disabled={prompt.trim().length === 0}
        className="w-full text-xs px-3 py-2 min-h-[44px] bg-gray-800 hover:bg-gray-700 disabled:opacity-50 rounded text-gray-300 flex items-center justify-center gap-2 transition-colors border border-dashed border-gray-700 hover:border-hermes/40"
      >
        <ImageIcon className="w-3 h-3" aria-hidden="true" />
        ดูภาพตัวอย่าง (Workers AI)
      </button>
    );
  }

  if (state.status === 'loading') {
    return (
      <div className="w-full p-4 min-h-[44px] bg-gray-800/50 rounded-md flex items-center justify-center gap-2 text-xs text-gray-400 border border-gray-700">
        <Loader2 className="w-3 h-3 animate-spin" aria-hidden="true" />
        กำลังสร้างภาพ... (~5-10 วินาที)
      </div>
    );
  }

  if (state.status === 'error') {
    return (
      <div className="w-full p-3 bg-red-900/20 border border-red-900/40 rounded-md space-y-2">
        <p className="text-xs text-red-300 flex items-start gap-1.5">
          <AlertCircle className="w-3 h-3 mt-0.5 shrink-0" aria-hidden="true" />
          <span>สร้างภาพไม่สำเร็จ: {state.message}</span>
        </p>
        <button
          type="button"
          onClick={run}
          className="text-xs text-red-200 hover:text-white inline-flex items-center gap-1 min-h-[36px] px-2 -mx-1 rounded"
        >
          <RefreshCw className="w-3 h-3" aria-hidden="true" />
          ลองอีกครั้ง
        </button>
      </div>
    );
  }

  return (
    <div className="w-full space-y-2">
      <div className="relative rounded-md overflow-hidden border border-gray-700 bg-black/40">
        <img
          src={state.src}
          alt={`AI preview of: ${prompt.slice(0, 100)}`}
          className="w-full h-auto block"
          loading="lazy"
        />
        {state.cached && (
          <span className="absolute top-2 right-2 text-[10px] px-2 py-0.5 rounded-full bg-black/70 text-gray-300 border border-gray-700">
            cache
          </span>
        )}
      </div>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] text-gray-500">
          FLUX-Schnell · ภาพประกอบไอเดีย ไม่ใช่ภาพจริง
        </span>
        <div className="flex items-center gap-2">
          <a
            href={state.src}
            download={downloadName ?? 'mtr-preview.png'}
            className="text-[11px] text-gray-400 hover:text-hermes inline-flex items-center gap-1 min-h-[32px]"
          >
            <Download className="w-3 h-3" aria-hidden="true" />
            บันทึก
          </a>
          <button
            type="button"
            onClick={run}
            className="text-[11px] text-gray-400 hover:text-hermes inline-flex items-center gap-1 min-h-[32px]"
          >
            <RefreshCw className="w-3 h-3" aria-hidden="true" />
            สร้างใหม่
          </button>
        </div>
      </div>
    </div>
  );
}
