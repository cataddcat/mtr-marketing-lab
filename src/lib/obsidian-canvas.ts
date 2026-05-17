/**
 * Minimal Obsidian Canvas (.canvas) JSON builder.
 *
 * Spec reference: https://github.com/obsidianmd/obsidian-api/blob/master/canvas.d.ts
 * Files use the `.canvas` extension and open in Obsidian's native Canvas mode.
 */

export type CanvasNodeColor =
  | '1' // red
  | '2' // orange
  | '3' // yellow
  | '4' // green
  | '5' // cyan
  | '6'; // purple

interface BaseNode {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color?: CanvasNodeColor;
}

export interface TextNode extends BaseNode {
  type: 'text';
  text: string;
}

export interface FileNode extends BaseNode {
  type: 'file';
  file: string; // vault-relative path including extension
  subpath?: string;
}

export interface GroupNode extends BaseNode {
  type: 'group';
  label: string;
}

export type CanvasNode = TextNode | FileNode | GroupNode;

export interface CanvasEdge {
  id: string;
  fromNode: string;
  fromSide?: 'top' | 'right' | 'bottom' | 'left';
  toNode: string;
  toSide?: 'top' | 'right' | 'bottom' | 'left';
  label?: string;
  color?: CanvasNodeColor;
}

export interface CanvasFile {
  nodes: CanvasNode[];
  edges: CanvasEdge[];
}

let counter = 0;
export const canvasId = (prefix = 'n'): string => `${prefix}-${++counter}-${Math.random().toString(36).slice(2, 8)}`;

export const serializeCanvas = (file: CanvasFile): string =>
  JSON.stringify(file, null, 2);

// ════════════════════════════════════════════════════════════════════
// Layout helpers
// ════════════════════════════════════════════════════════════════════

export interface GridLayoutOptions {
  readonly cols: number;
  readonly cellWidth?: number;
  readonly cellHeight?: number;
  readonly gap?: number;
  readonly originX?: number;
  readonly originY?: number;
}

export const positionInGrid = (
  index: number,
  opts: GridLayoutOptions,
): { x: number; y: number; width: number; height: number } => {
  const cellWidth = opts.cellWidth ?? 280;
  const cellHeight = opts.cellHeight ?? 180;
  const gap = opts.gap ?? 32;
  const col = index % opts.cols;
  const row = Math.floor(index / opts.cols);
  return {
    x: (opts.originX ?? 0) + col * (cellWidth + gap),
    y: (opts.originY ?? 0) + row * (cellHeight + gap),
    width: cellWidth,
    height: cellHeight,
  };
};
