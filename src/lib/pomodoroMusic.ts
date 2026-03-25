const STORAGE_KEY = 'nexus-pomodoro-music-v1';

/**
 * Direct MP3 that plays in most browsers (SoundHelix demo). Use for testing focus music.
 * @see https://www.soundhelix.com/examples
 */
export const POMODORO_DEMO_MP3_URL =
  'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3';

export type PomodoroMusicPrefs = {
  /** Direct URL to an audio stream or file (e.g. MP3). Empty = disabled. */
  url: string;
  /** 0–1 */
  volume: number;
};

const DEFAULTS: PomodoroMusicPrefs = { url: '', volume: 0.35 };

export function loadPomodoroMusicPrefs(): PomodoroMusicPrefs {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULTS };
    const p = JSON.parse(raw) as Partial<PomodoroMusicPrefs>;
    const url = typeof p.url === 'string' ? p.url.trim().slice(0, 2048) : '';
    let volume = typeof p.volume === 'number' ? p.volume : DEFAULTS.volume;
    if (volume < 0) volume = 0;
    if (volume > 1) volume = 1;
    return { url, volume };
  } catch {
    return { ...DEFAULTS };
  }
}

export function savePomodoroMusicPrefs(prefs: PomodoroMusicPrefs) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    /* ignore */
  }
}
