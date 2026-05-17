/**
 * Title → filename resolver for Obsidian vault export.
 *
 * Obsidian wikilinks look like `[[Page Name]]` and resolve case-insensitively
 * against the basename of a file (without `.md`). Filenames need to be
 * filesystem-safe across Windows/macOS/Linux while preserving Thai (Unicode is
 * fine on all three).
 */

const INVALID_CHARS = /[/\\:*?"<>|#^[\]]/g;
const COLLAPSE_WS = /\s+/g;

const stripInvalid = (s: string): string =>
  s
    .replace(INVALID_CHARS, '')
    .replace(COLLAPSE_WS, ' ')
    .trim();

/**
 * Convert any string into an Obsidian-safe filename basename (no extension).
 * Truncates to 96 chars to play nicely with Windows MAX_PATH constraints.
 */
export const safeFilename = (raw: string, fallback = 'Untitled'): string => {
  const cleaned = stripInvalid(raw);
  const base = cleaned.length > 0 ? cleaned : fallback;
  return base.length > 96 ? base.slice(0, 96).trim() : base;
};

/**
 * Wikilink resolver — tracks a name registry to detect collisions.
 *
 * Two different objects that would produce the same filename get a
 * disambiguator appended (`Name (2)`, `Name (3)`, ...).
 */
export class WikilinkRegistry {
  private readonly seen = new Map<string, number>();
  private readonly map = new Map<string, string>(); // id → resolved filename

  /**
   * Register a logical id with a desired title. Returns the final filename
   * (without `.md`) that will be used and stored for later `link(id)` calls.
   */
  register(id: string, title: string, fallback = 'Untitled'): string {
    if (this.map.has(id)) return this.map.get(id)!;
    const base = safeFilename(title, fallback);
    const key = base.toLowerCase();
    const count = (this.seen.get(key) ?? 0) + 1;
    this.seen.set(key, count);
    const finalName = count === 1 ? base : `${base} (${count})`;
    this.map.set(id, finalName);
    return finalName;
  }

  /** Get the registered filename for an id; throws if not registered. */
  link(id: string): string {
    const name = this.map.get(id);
    if (!name) throw new Error(`WikilinkRegistry: unknown id "${id}"`);
    return name;
  }

  /** Soft form — returns null if not registered (no exception). */
  linkOrNull(id: string): string | null {
    return this.map.get(id) ?? null;
  }

  /** Wraps a registered id as a [[wikilink]] using the registered filename. */
  wikilink(id: string, displayText?: string): string {
    const name = this.link(id);
    if (displayText && displayText !== name) {
      return `[[${name}|${displayText}]]`;
    }
    return `[[${name}]]`;
  }
}
