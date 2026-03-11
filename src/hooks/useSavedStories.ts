import { useCallback } from 'react';
import { StoryEntry } from '@/types/mod-idea';
import { useLocalStorage } from './useLocalStorage';

const STORAGE_KEY = 'fantasy-mod-forge-saved-stories';

export function useSavedStories() {
  const [savedStories, setSavedStories] = useLocalStorage<StoryEntry[]>(STORAGE_KEY, []);

  const saveStory = useCallback((story: StoryEntry) => {
    setSavedStories((prev) => {
      const exists = prev.some((s) => s.id === story.id);
      if (exists) return prev;
      return [...prev, story];
    });
  }, [setSavedStories]);

  const removeStory = useCallback((storyId: string) => {
    setSavedStories((prev) => prev.filter((s) => s.id !== storyId));
  }, [setSavedStories]);

  const isStorySaved = useCallback((storyId: string) => {
    return savedStories.some((s) => s.id === storyId);
  }, [savedStories]);

  const clearAllStories = useCallback(() => {
    setSavedStories([]);
  }, [setSavedStories]);

  return {
    savedStories,
    saveStory,
    removeStory,
    isStorySaved,
    clearAllStories,
  };
}
