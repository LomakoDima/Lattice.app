const STORAGE_KEY = 'nexus_app_settings_v1';

export type LatticeAppSettings = {
  /** Короткие анимации по всему приложению */
  reduceMotion: boolean;
  /** Напоминания о завершении фокус-блока (браузерные уведомления при разрешении) */
  focusEndNotifications: boolean;
};

const DEFAULTS: LatticeAppSettings = {
  reduceMotion: false,
  focusEndNotifications: true,
};

export function loadSettings(): LatticeAppSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULTS };
    const p = JSON.parse(raw) as Partial<LatticeAppSettings>;
    return {
      reduceMotion: typeof p.reduceMotion === 'boolean' ? p.reduceMotion : DEFAULTS.reduceMotion,
      focusEndNotifications:
        typeof p.focusEndNotifications === 'boolean'
          ? p.focusEndNotifications
          : DEFAULTS.focusEndNotifications,
    };
  } catch {
    return { ...DEFAULTS };
  }
}

export function saveSettings(partial: Partial<LatticeAppSettings>): LatticeAppSettings {
  const next: LatticeAppSettings = { ...loadSettings(), ...partial };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
  return next;
}

export function applySettingsToDocument(s: LatticeAppSettings): void {
  document.documentElement.classList.toggle('lattice-reduce-motion', s.reduceMotion);
  document.documentElement.classList.remove('nexus-reduce-motion');
}
