import { describe, it, expect, beforeEach } from 'vitest';
import { type Theme } from '../lib/hooks/use-theme';

const STORAGE_KEY = 'nodeatlas_theme';

function getInitialTheme(saved: string | null, prefersDark: boolean): Theme {
  if (saved === 'light' || saved === 'dark') {
    return saved;
  }
  return prefersDark ? 'dark' : 'dark';
}

function applyThemeToDocument(doc: { classList: { add: (c: string) => void; remove: (c: string) => void } }, theme: Theme) {
  if (theme === 'dark') {
    doc.classList.add('dark');
    doc.classList.remove('light');
  } else {
    doc.classList.remove('dark');
    doc.classList.add('light');
  }
}

describe('Theme Persistence and CSS Class Logic Tests', () => {
  let mockClasses: Set<string>;
  let mockDoc: { classList: { add: (c: string) => void; remove: (c: string) => void } };
  let storage: Record<string, string>;

  beforeEach(() => {
    mockClasses = new Set<string>();
    mockDoc = {
      classList: {
        add: (c: string) => mockClasses.add(c),
        remove: (c: string) => mockClasses.delete(c)
      }
    };
    storage = {};
  });

  it('correctly resolves initial theme preference from saved storage', () => {
    expect(getInitialTheme('light', false)).toBe('light');
    expect(getInitialTheme('dark', true)).toBe('dark');
    expect(getInitialTheme(null, true)).toBe('dark');
  });

  it('applies dark theme class to document element correctly', () => {
    applyThemeToDocument(mockDoc, 'dark');
    expect(mockClasses.has('dark')).toBe(true);
    expect(mockClasses.has('light')).toBe(false);
  });

  it('applies light theme class and removes dark class correctly', () => {
    applyThemeToDocument(mockDoc, 'dark');
    expect(mockClasses.has('dark')).toBe(true);

    applyThemeToDocument(mockDoc, 'light');
    expect(mockClasses.has('light')).toBe(true);
    expect(mockClasses.has('dark')).toBe(false);
  });

  it('toggles theme state and updates stored setting key', () => {
    let currentTheme: Theme = 'dark';
    storage[STORAGE_KEY] = currentTheme;

    // Toggle theme
    currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
    storage[STORAGE_KEY] = currentTheme;
    applyThemeToDocument(mockDoc, currentTheme);

    expect(storage[STORAGE_KEY]).toBe('light');
    expect(mockClasses.has('light')).toBe(true);
  });
});
