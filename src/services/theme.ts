// Automatic Dark Mode Service (Multi-Tenant Per-Domain Isolated)
// Auto switches theme based on local time or user override per domain: 'auto' | 'light' | 'dark'

export type ThemeMode = 'auto' | 'light' | 'dark';

const THEME_STORAGE_KEY = 'e_absensi_theme_mode';

function getDomainThemeKey(domain?: string): string {
  if (typeof window === 'undefined') return THEME_STORAGE_KEY;
  const testingDomain = domain || localStorage.getItem('e_absensi_testing_domain');
  if (testingDomain && testingDomain.trim()) {
    const slug = testingDomain.trim().toLowerCase().replace(/[^a-z0-9]/g, '_');
    return `${slug}:${THEME_STORAGE_KEY}`;
  }
  const hostname = window.location.hostname.toLowerCase().trim();
  if (hostname && hostname !== 'localhost' && hostname !== '127.0.0.1') {
    const slug = hostname.replace(/[^a-z0-9]/g, '_');
    return `${slug}:${THEME_STORAGE_KEY}`;
  }
  return THEME_STORAGE_KEY;
}

export function getThemeMode(domain?: string): ThemeMode {
  try {
    const key = getDomainThemeKey(domain);
    const saved = localStorage.getItem(key) || localStorage.getItem(THEME_STORAGE_KEY);
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

export function setThemeMode(mode: ThemeMode, domain?: string): { effectiveTheme: 'dark' | 'light'; isAuto: boolean; isNight: boolean } {
  try {
    const key = getDomainThemeKey(domain);
    localStorage.setItem(key, mode);
    localStorage.setItem(THEME_STORAGE_KEY, mode);
  } catch (e) {
    console.warn('Unable to save theme mode to localStorage', e);
  }
  return applyTheme(mode);
}
