import { useCallback } from 'react';
import { ModIdea } from '@/types/mod-idea';
import { useLocalStorage } from './useLocalStorage';

const STORAGE_KEY = 'fantasy-mod-forge-saved-ideas';

export function useSavedIdeas() {
  const [savedIdeas, setSavedIdeas] = useLocalStorage<ModIdea[]>(STORAGE_KEY, []);

  const saveIdea = useCallback((idea: ModIdea) => {
    setSavedIdeas((prev) => {
      const exists = prev.some((i) => i.id === idea.id);
      if (exists) return prev;
      return [...prev, idea];
    });
  }, [setSavedIdeas]);

  const removeIdea = useCallback((ideaId: string) => {
    setSavedIdeas((prev) => prev.filter((i) => i.id !== ideaId));
  }, [setSavedIdeas]);

  const isIdeaSaved = useCallback((ideaId: string) => {
    return savedIdeas.some((i) => i.id === ideaId);
  }, [savedIdeas]);

  const clearAllIdeas = useCallback(() => {
    setSavedIdeas([]);
  }, [setSavedIdeas]);

  return {
    savedIdeas,
    saveIdea,
    removeIdea,
    isIdeaSaved,
    clearAllIdeas,
  };
}