// Automatic Dark Mode Service
// Auto switches theme based on local time:
// Day (06:00 - 17:59) -> Light Mode
// Night (18:00 - 05:59) -> Dark Mode
// Supports user override: 'auto' | 'light' | 'dark'

export type ThemeMode = 'auto' | 'light' | 'dark';

const THEME_STORAGE_KEY = 'e_absensi_theme_mode';

export function getThemeMode(): ThemeMode {
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === 'light' || saved === 'dark' || saved === 'auto') {
      return saved as ThemeMode;
    }
  } catch (e) {
    console.warn('Unable to access localStorage for theme mode', e);
  }
  return 'auto';
}

export function isNightTime(): boolean {
  const currentHour = new Date().getHours();
  // Night time defined as 18:00 (6 PM) to 05:59 (6 AM)
  return currentHour >= 18 || currentHour < 6;
}

export function getEffectiveTheme(mode: ThemeMode = getThemeMode()): 'dark' | 'light' {
  if (mode === 'dark') return 'dark';
  if (mode === 'light') return 'light';
  // Mode is 'auto'
  return isNightTime() ? 'dark' : 'light';
}

export function applyTheme(mode: ThemeMode = getThemeMode()): { effectiveTheme: 'dark' | 'light'; isAuto: boolean; isNight: boolean } {
  const night = isNightTime();
  const effective = getEffectiveTheme(mode);
  const root = document.documentElement;

  if (effective === 'dark') {
    root.classList.add('dark');
    root.style.colorScheme = 'dark';
  } else {
    root.classList.remove('dark');
    root.style.colorScheme = 'light';
  }

  return {
    effectiveTheme: effective,
    isAuto: mode === 'auto',
    isNight: night,
  };
}

export function setThemeMode(mode: ThemeMode): { effectiveTheme: 'dark' | 'light'; isAuto: boolean; isNight: boolean } {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, mode);
  } catch (e) {
    console.warn('Unable to save theme mode to localStorage', e);
  }
  return applyTheme(mode);
}
