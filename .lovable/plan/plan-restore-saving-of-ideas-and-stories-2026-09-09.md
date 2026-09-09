## Plan: Restore saving of ideas and stories

Bring back saving, kept on your device, plus the ability to download everything as a file and load it back later.

### What you get

- A **Save** button on every generated mod idea and every story.
- A third **Saved** tab next to Generator and Story Board, split into "Mod Ideas" and "Stories", each item expandable, shareable, removable, and (for stories) convertible into a mod idea.
- Saved items survive page reloads and browser restarts on the same device.
- **Download backup** writes all saved items to a single `.json` file; **Load backup** reads such a file back in and merges it with what is already saved (duplicates by id are skipped).
- Save buttons show a filled state once an item is saved, and toggle off to unsave.

### Notes

- Saving is per-browser: clearing browser data or switching devices loses it unless a backup file was downloaded. The download/upload option covers moving between devices. No account or sign-in involved.

### Technical detail

- New `src/hooks/useLocalStorage.ts` — generic state hook backed by `localStorage` with JSON serialization and a safe fallback when storage is unavailable.
- New `src/hooks/useSavedItems.ts` — exposes `savedIdeas`, `savedStories`, `saveIdea`, `removeIdea`, `saveStory`, `removeStory`, `isIdeaSaved`, `isStorySaved`, `exportAll`, `importAll(json)`; keys `forge:saved-ideas` and `forge:saved-stories`.
- `src/components/forge/ModIdeaCard.tsx` and `StoryCard.tsx` — add optional `onSave` / `onRemove` / `isSaved` props and a bookmark button in the footer; unchanged when props are absent.
- New `src/components/forge/SavedPanel.tsx` — tabbed list of saved ideas and stories reusing `ModIdeaCard` / `StoryCard`, plus Download/Load backup buttons and an empty state.
- `src/lib/export-utils.ts` — add `exportBackup(ideas, stories)` producing `{ version: 1, exportedAt, ideas, stories }` and `parseBackup(text)` validating shape; reuse existing `downloadFile`.
- `src/pages/Index.tsx` — switch `TabsList` to three columns, add the `saved` tab, wire hook handlers into both generated cards and the saved panel, keep story-to-mod conversion working from saved stories.
- Update memory: replace the "no persistence" core rule with device-local saving plus file backup.
