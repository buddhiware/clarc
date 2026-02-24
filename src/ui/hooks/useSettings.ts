import { useState, useEffect, useCallback } from 'react';

export interface ClarcSettings {
  theme: 'system' | 'light' | 'dark';
  collapseThreshold: number;
  defaultShowThinking: boolean;
}

const STORAGE_KEY = 'clarc-settings';

const DEFAULTS: ClarcSettings = {
  theme: 'system',
  collapseThreshold: 300,
  defaultShowThinking: true,
};

function loadSettings(): ClarcSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return { ...DEFAULTS, ...JSON.parse(raw) };
    }
  } catch {
    // ignore corrupt data
  }
  return { ...DEFAULTS };
}

function saveSettings(settings: ClarcSettings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

function applyTheme(theme: ClarcSettings['theme']) {
  const html = document.documentElement;
  if (theme === 'system') {
    html.removeAttribute('data-theme');
  } else {
    html.setAttribute('data-theme', theme);
  }
}

export function useSettings(): [ClarcSettings, (updates: Partial<ClarcSettings>) => void] {
  const [settings, setSettings] = useState<ClarcSettings>(loadSettings);

  // Apply theme on mount and when it changes
  useEffect(() => {
    applyTheme(settings.theme);
  }, [settings.theme]);

  const updateSettings = useCallback((updates: Partial<ClarcSettings>) => {
    setSettings(prev => {
      const next = { ...prev, ...updates };
      saveSettings(next);
      return next;
    });
  }, []);

  return [settings, updateSettings];
}
