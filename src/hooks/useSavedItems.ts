import { useCallback } from 'react';
import { ModIdea, StoryEntry } from '@/types/mod-idea';
import { useLocalStorage } from './useLocalStorage';

const IDEAS_KEY = 'forge:saved-ideas';
const STORIES_KEY = 'forge:saved-stories';

function withId<T extends { id?: string; createdAt?: string }>(item: T): T & { id: string; createdAt: string } {
  return {
    ...item,
    id: item.id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`),
    createdAt: item.createdAt || new Date().toISOString(),
  };
}

export interface BackupFile {
  version: number;
  exportedAt: string;
  ideas: ModIdea[];
  stories: StoryEntry[];
}

export function useSavedItems() {
  const [savedIdeas, setSavedIdeas] = useLocalStorage<ModIdea[]>(IDEAS_KEY, []);
  const [savedStories, setSavedStories] = useLocalStorage<StoryEntry[]>(STORIES_KEY, []);

  const saveIdea = useCallback((idea: ModIdea) => {
    const item = withId(idea);
    setSavedIdeas((prev) => (prev.some((i) => i.id === item.id) ? prev : [item, ...prev]));
    return item;
  }, [setSavedIdeas]);

  const removeIdea = useCallback((id: string) => {
    setSavedIdeas((prev) => prev.filter((i) => i.id !== id));
  }, [setSavedIdeas]);

  const saveStory = useCallback((story: StoryEntry) => {
    const item = withId(story);
    setSavedStories((prev) => (prev.some((s) => s.id === item.id) ? prev : [item, ...prev]));
    return item;
  }, [setSavedStories]);

  const removeStory = useCallback((id: string) => {
    setSavedStories((prev) => prev.filter((s) => s.id !== id));
  }, [setSavedStories]);

  const isIdeaSaved = useCallback((idea: ModIdea) => savedIdeas.some((i) => i.id === idea.id), [savedIdeas]);
  const isStorySaved = useCallback((story: StoryEntry) => savedStories.some((s) => s.id === story.id), [savedStories]);

  const buildBackup = useCallback((): BackupFile => ({
    version: 1,
    exportedAt: new Date().toISOString(),
    ideas: savedIdeas,
    stories: savedStories,
  }), [savedIdeas, savedStories]);

  /** Merges a backup into current storage, skipping duplicate ids. Returns counts added. */
  const importBackup = useCallback((backup: BackupFile) => {
    let addedIdeas = 0;
    let addedStories = 0;

    setSavedIdeas((prev) => {
      const existing = new Set(prev.map((i) => i.id));
      const incoming = (backup.ideas || []).map(withId).filter((i) => !existing.has(i.id));
      addedIdeas = incoming.length;
      return [...incoming, ...prev];
    });

    setSavedStories((prev) => {
      const existing = new Set(prev.map((s) => s.id));
      const incoming = (backup.stories || []).map(withId).filter((s) => !existing.has(s.id));
      addedStories = incoming.length;
      return [...incoming, ...prev];
    });

    return { addedIdeas, addedStories };
  }, [setSavedIdeas, setSavedStories]);

  return {
    savedIdeas,
    savedStories,
    saveIdea,
    removeIdea,
    saveStory,
    removeStory,
    isIdeaSaved,
    isStorySaved,
    buildBackup,
    importBackup,
  };
}
