import { useState, useEffect, useCallback } from 'react';

export interface ClarcSettings {
  theme: 'system' | 'light' | 'dark';
  collapseThreshold: number;
  defaultShowThinking: boolean;
  archivedProjects: string[];
  bookmarkedSessions: string[];
}

const STORAGE_KEY = 'clarc-settings';

const DEFAULTS: ClarcSettings = {
  theme: 'system',
  collapseThreshold: 300,
  defaultShowThinking: true,
  archivedProjects: [],
  bookmarkedSessions: [],
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

export function isProjectArchived(settings: ClarcSettings, projectId: string): boolean {
  return settings.archivedProjects.includes(projectId);
}

export function toggleProjectArchived(
  settings: ClarcSettings,
  updateSettings: (updates: Partial<ClarcSettings>) => void,
  projectId: string,
): void {
  const archived = settings.archivedProjects;
  if (archived.includes(projectId)) {
    updateSettings({ archivedProjects: archived.filter(id => id !== projectId) });
  } else {
    updateSettings({ archivedProjects: [...archived, projectId] });
  }
}

export function isSessionBookmarked(settings: ClarcSettings, sessionId: string): boolean {
  return settings.bookmarkedSessions.includes(sessionId);
}

export function toggleSessionBookmark(
  settings: ClarcSettings,
  updateSettings: (updates: Partial<ClarcSettings>) => void,
  sessionId: string,
): void {
  const bookmarked = settings.bookmarkedSessions;
  if (bookmarked.includes(sessionId)) {
    updateSettings({ bookmarkedSessions: bookmarked.filter(id => id !== sessionId) });
  } else {
    updateSettings({ bookmarkedSessions: [...bookmarked, sessionId] });
  }
}
