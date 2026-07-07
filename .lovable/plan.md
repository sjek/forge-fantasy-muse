## Plan: Remove Saving & Loading Logic

Strip all persistence (localStorage) and "Saved" collection UI. Generated ideas/stories will exist only in the current session — no bookmarks, no saved tab, no export-from-collection panel.

### Files to delete
- `src/hooks/useLocalStorage.ts`
- `src/hooks/useSavedIdeas.ts`
- `src/hooks/useSavedStories.ts`
- `src/components/forge/SavedIdeasPanel.tsx`
- `src/components/forge/SavedStoriesPanel.tsx`

### Files to edit

**`src/pages/Index.tsx`**
- Remove imports of the deleted hooks/panels.
- Remove `useSavedIdeas` / `useSavedStories` calls and the `saved` `TabsTrigger` + `TabsContent`.
- Drop `isSaved`/`onSave`/`onRemove` props passed to `ModIdeaCard` and `StoryCard` (pass no-ops or update card APIs — see below).

**`src/components/forge/ModIdeaCard.tsx`**
- Remove `isSaved`, `onSave`, `onRemove` from props.
- Remove `handleSaveToggle` and the Save/Saved button in the footer.

**`src/components/forge/StoryCard.tsx`**
- Same treatment: remove `isSaved`, `onSave`, `onRemove` props, `handleSaveToggle`, and the Save Story button.

### What stays
- Generation flows (mod idea + story), refinement, convert-to-mod, copy buttons, and in-card export/download actions if present on the card itself.
- The two main tabs (Generator / Story Board). Only the "Saved" tab is removed.

### Memory update
- Update `mem://constraints/local-storage-only` to reflect that persistence has been removed — session-only state now.
