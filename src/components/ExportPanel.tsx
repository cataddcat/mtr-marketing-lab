import { useMemo, useState } from 'react';
import { Loader2, Download, FolderTree, FileBox } from 'lucide-react';
import type { ExportInput } from '../lib/export-models';
import { buildVault, triggerVaultDownload } from '../services/export-obsidian';

interface Props {
  readonly input: ExportInput;
  readonly onClose?: () => void;
}

interface Counts {
  files: number;
  notes: number;
  canvases: number;
  bytes: number;
}

const computeCounts = (files: ReturnType<typeof buildVault>): Counts => {
  let bytes = 0;
  let notes = 0;
  let canvases = 0;
  for (const f of files) {
    bytes += f.content.length;
    if (f.path.endsWith('.md')) notes += 1;
    else if (f.path.endsWith('.canvas')) canvases += 1;
  }
  return { files: files.length, notes, canvases, bytes };
};

const formatBytes = (n: number): string => {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
};

export function ExportPanel({ input, onClose }: Props) {
  const counts = useMemo<Counts>(() => computeCounts(buildVault(input)), [input]);
  const [exporting, setExporting] = useState(false);
  const [done, setDone] = useState<string | null>(null);

  const handleExport = async () => {
    setExporting(true);
    setDone(null);
    try {
      const result = await triggerVaultDownload(input);
      setDone(`ส่งออก ${result.fileCount} ไฟล์เรียบร้อย`);
    } catch (err) {
      console.error('[ExportPanel]', err);
      setDone('ส่งออกไม่สำเร็จ — ดู console');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="p-4 space-y-4">
      <section
        className="rounded-md border p-4 space-y-3"
        style={{
          background: 'var(--color-bg-sunken)',
          borderColor: 'var(--color-border-faint)',
        }}
      >
        <div className="flex items-start gap-3">
          <FolderTree
            className="w-5 h-5 mt-0.5 shrink-0"
            strokeWidth={1.5}
            style={{ color: 'var(--color-accent)' }}
            aria-hidden="true"
          />
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-fg-1" lang="th">
              Obsidian Vault Export
            </h3>
            <p className="text-[12px] text-fg-3 leading-relaxed mt-0.5" lang="th">
              ทุก ad, brief, persona, brand fact, customer quote → markdown notes พร้อม
              wikilinks + frontmatter + Obsidian Canvas visual maps · ZIP เดียวพร้อม unzip
              เป็น vault folder ใน Obsidian
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center">
          <Stat label="Files" value={counts.files} />
          <Stat label="Notes" value={counts.notes} />
          <Stat label="Canvases" value={counts.canvases} />
        </div>

        <div className="text-[11px] text-fg-3" lang="th">
          ขนาดประมาณ: {formatBytes(counts.bytes)}
        </div>

        <button
          type="button"
          onClick={handleExport}
          disabled={exporting || counts.files === 0}
          className="w-full inline-flex items-center justify-center gap-2 min-h-[44px] rounded-md text-sm font-medium transition-colors disabled:opacity-50"
          style={{
            background: 'var(--color-accent)',
            color: 'var(--color-accent-fg)',
          }}
        >
          {exporting ? (
            <Loader2 className="w-4 h-4 animate-spin" strokeWidth={1.5} aria-hidden="true" />
          ) : (
            <Download className="w-4 h-4" strokeWidth={1.5} aria-hidden="true" />
          )}
          {exporting ? 'กำลังสร้าง vault...' : 'ดาวน์โหลด vault (.zip)'}
        </button>

        {done && (
          <p
            className="text-[11px] text-center"
            style={{ color: 'var(--color-success)' }}
            lang="th"
          >
            {done}
          </p>
        )}
      </section>

      <section
        className="rounded-md border p-4 space-y-2 opacity-70"
        style={{
          background: 'var(--color-bg-sunken)',
          borderColor: 'var(--color-border-faint)',
        }}
      >
        <div className="flex items-start gap-3">
          <FileBox
            className="w-5 h-5 mt-0.5 shrink-0 text-fg-3"
            strokeWidth={1.5}
            aria-hidden="true"
          />
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-fg-2" lang="th">
              MiroFish boards
            </h3>
            <p className="text-[12px] text-fg-3 leading-relaxed mt-0.5" lang="th">
              ออกแบบไว้ใน plan แล้ว — รอตรวจ board JSON format ของ MiroFish ก่อน implement (Phase E2)
            </p>
          </div>
        </div>
      </section>

      <section
        className="rounded-md border p-4 space-y-2 opacity-70"
        style={{
          background: 'var(--color-bg-sunken)',
          borderColor: 'var(--color-border-faint)',
        }}
      >
        <p className="text-[12px] text-fg-3 leading-relaxed" lang="th">
          <b className="text-fg-2 font-medium">Native folder sync</b> (Phase E3):
          File System Access API + diff preview + write-in-place — ใช้ใน Chrome/Edge เท่านั้น;
          fallback เป็น ZIP ดังด้านบน
        </p>
      </section>

      {onClose && (
        <div className="text-center">
          <button
            type="button"
            onClick={onClose}
            className="text-[11px] text-fg-3 hover:text-fg-1 min-h-[28px]"
            lang="th"
          >
            ปิด
          </button>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { readonly label: string; readonly value: number }) {
  return (
    <div
      className="rounded-md p-2 border"
      style={{
        background: 'var(--color-bg)',
        borderColor: 'var(--color-border-faint)',
      }}
    >
      <div className="font-mono text-base font-medium text-fg-1 tabular-nums">{value}</div>
      <div className="font-mono text-[9.5px] uppercase tracking-[0.10em] text-fg-3 mt-0.5">
        {label}
      </div>
    </div>
  );
}
