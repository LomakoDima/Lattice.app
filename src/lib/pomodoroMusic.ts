const STORAGE_KEY = 'nexus-pomodoro-music-v1';

const IDB_NAME = 'nexus-pomodoro-music';
const IDB_STORE = 'uploads';
const IDB_FILE_KEY = 'current';

export type PomodoroTrackSource = 'off' | 'url' | 'file';

/** Display info for a user-uploaded focus track (localStorage; blob lives in IndexedDB). */
export type PomodoroUploadMeta = {
  name: string;
  size: number;
  type: string;
};

export type PomodoroMusicPrefs = {
  volume: number;
  source: PomodoroTrackSource;
  /** Raw field for URL mode (may be a Google Drive share link). */
  customUrl: string;
  /** Present when `source === 'file'` and a track is stored. */
  uploadMeta: PomodoroUploadMeta | null;
};

const DEFAULTS: PomodoroMusicPrefs = {
  volume: 0.35,
  source: 'off',
  customUrl: '',
  uploadMeta: null,
};

function clampVolume(v: number): number {
  if (Number.isNaN(v) || v < 0) return 0;
  if (v > 1) return 1;
  return v;
}

function normalizeUploadMeta(raw: unknown): PomodoroUploadMeta | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const name = typeof o.name === 'string' ? o.name.trim().slice(0, 240) : '';
  const size = typeof o.size === 'number' && Number.isFinite(o.size) && o.size >= 0 ? o.size : 0;
  const type = typeof o.type === 'string' ? o.type.trim().slice(0, 120) : 'audio';
  if (!name && size === 0) return null;
  return { name: name || 'Audio file', size, type: type || 'audio' };
}

/** Human-readable size for UI (focus music upload). */
export function formatAudioFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(bytes < 10_240 ? 1 : 0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Extract Google Drive file id from common share / open URLs. */
export function extractGoogleDriveFileId(input: string): string | null {
  const t = input.trim();
  if (!t) return null;
  let m = t.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (m) return m[1];
  m = t.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (m) return m[1];
  m = t.match(/^([a-zA-Z0-9_-]{25,})$/);
  if (m) return m[1];
  return null;
}

/**
 * Best-effort direct stream URL for Google Drive (file must be shared as "Anyone with the link").
 * Large files may show a virus-scan page instead of raw audio; prefer smaller MP3s or "Download anyway" flow.
 */
export function googleDriveFileIdToAudioUrl(fileId: string): string {
  return `https://drive.google.com/uc?export=download&id=${encodeURIComponent(fileId)}`;
}

/** Path (with optional ?query) ends with a known audio file extension — e.g. `.mp3`, `track.MP3?x=1`. */
const AUDIO_STREAM_EXT_RE = /\.(mp3|wav|ogg|oga|opus|m4a|aac|flac|webm)(\?[^#]*)?$/i;

/**
 * Add https:// when the user pastes `www....` / `//...` / `host/path` without a scheme.
 */
function coerceHttpUrl(input: string): string | null {
  const t = input.trim();
  if (!t) return null;
  if (/^https?:\/\//i.test(t)) return t;
  if (/^\/\//.test(t)) return `https:${t}`;
  if (/^[a-z0-9][a-z0-9-]*\.[a-z0-9.-]+\//i.test(t) || /^[a-z0-9][a-z0-9-]*\.[a-z0-9.-]+\?/i.test(t)) {
    return `https://${t}`;
  }
  return null;
}

/**
 * True if we treat the input as a direct stream the player should try (Google Drive id, or URL path ending with a known audio extension).
 * Does not verify the file exists — the `<audio>` element does that.
 */
export function isRecognizedFocusStreamInput(input: string): boolean {
  const raw = input.trim();
  if (!raw) return false;
  if (extractGoogleDriveFileId(raw)) return true;

  const tryUrls = [raw];
  const coerced = coerceHttpUrl(raw);
  if (coerced) tryUrls.push(coerced);

  for (const s of tryUrls) {
    const candidate = s.startsWith('http') ? s : `https://${s}`;
    try {
      const u = new URL(candidate);
      if (u.protocol !== 'http:' && u.protocol !== 'https:') continue;
      const pathAndQuery = `${u.pathname}${u.search}`;
      if (AUDIO_STREAM_EXT_RE.test(pathAndQuery)) return true;
    } catch {
      /* fall through */
    }
  }

  return AUDIO_STREAM_EXT_RE.test(raw.trim());
}

/**
 * Normalize user input: trim, convert Google Drive links to uc?export=download form, add scheme when missing, cap length.
 */
export function normalizeFocusMusicUrl(input: string): string {
  const raw = input.trim().slice(0, 4096);
  if (!raw) return '';
  const id = extractGoogleDriveFileId(raw);
  if (id) return googleDriveFileIdToAudioUrl(id);
  const coerced = coerceHttpUrl(raw);
  return coerced ?? raw;
}

export function resolvedStreamUrl(prefs: PomodoroMusicPrefs): string {
  if (prefs.source === 'off' || prefs.source === 'file') return '';
  if (prefs.source === 'url') return normalizeFocusMusicUrl(prefs.customUrl);
  return '';
}

function parsePrefs(raw: string): PomodoroMusicPrefs {
  const p = JSON.parse(raw) as Record<string, unknown>;

  if (p && typeof p === 'object' && 'source' in p) {
    const source = p.source as string;
    const valid: PomodoroTrackSource[] = ['off', 'url', 'file'];
    let mode = valid.includes(source as PomodoroTrackSource) ? (source as PomodoroTrackSource) : 'off';
    if (source === 'curated') mode = 'off';
    const customUrl = typeof p.customUrl === 'string' ? p.customUrl.trim().slice(0, 4096) : '';
    const uploadMeta = mode === 'file' ? normalizeUploadMeta(p.uploadMeta) : null;
    return {
      volume: clampVolume(typeof p.volume === 'number' ? p.volume : DEFAULTS.volume),
      source: mode,
      customUrl: mode === 'url' ? customUrl : '',
      uploadMeta,
    };
  }

  const url = typeof p.url === 'string' ? p.url.trim().slice(0, 4096) : '';
  const volume = clampVolume(typeof p.volume === 'number' ? (p.volume as number) : DEFAULTS.volume);
  if (!url) return { ...DEFAULTS, volume };
  return {
    volume,
    source: 'url',
    customUrl: url,
    uploadMeta: null,
  };
}

export function loadPomodoroMusicPrefs(): PomodoroMusicPrefs {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULTS };
    return parsePrefs(raw);
  } catch {
    return { ...DEFAULTS };
  }
}

export function savePomodoroMusicPrefs(prefs: PomodoroMusicPrefs) {
  try {
    const toStore: PomodoroMusicPrefs = {
      volume: clampVolume(prefs.volume),
      source: prefs.source,
      customUrl: prefs.source === 'url' ? prefs.customUrl.trim().slice(0, 4096) : '',
      uploadMeta: prefs.source === 'file' && prefs.uploadMeta ? normalizeUploadMeta(prefs.uploadMeta) : null,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toStore));
  } catch {
    /* ignore */
  }
}

function idbOpen(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, 1);
    req.onerror = () => reject(req.error ?? new Error('indexedDB.open failed'));
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) db.createObjectStore(IDB_STORE);
    };
    req.onsuccess = () => resolve(req.result);
  });
}

export async function savePomodoroUploadBlob(blob: Blob): Promise<void> {
  const db = await idbOpen();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readwrite');
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error('IDB transaction failed'));
    tx.objectStore(IDB_STORE).put(blob, IDB_FILE_KEY);
  });
}

export async function loadPomodoroUploadBlob(): Promise<Blob | null> {
  const db = await idbOpen();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readonly');
    tx.onerror = () => reject(tx.error ?? new Error('IDB read failed'));
    const req = tx.objectStore(IDB_STORE).get(IDB_FILE_KEY);
    req.onsuccess = () => resolve((req.result as Blob | undefined) ?? null);
  });
}

export async function clearPomodoroUploadBlob(): Promise<void> {
  const db = await idbOpen();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readwrite');
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error('IDB clear failed'));
    tx.objectStore(IDB_STORE).delete(IDB_FILE_KEY);
  });
}
