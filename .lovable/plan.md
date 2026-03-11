

## Plan: Add Story Generation Board

### Overview
Add a new "Story Board" tab alongside the existing Generator and Saved tabs. This board generates narrative content (quest storylines, NPC backstories, lore entries, world-building) that complements the code-focused mod ideas. It uses the same AI backend with a story-specific prompt, and produces structured story outlines users can save alongside their mod ideas.

### Changes

#### 1. New Types (`src/types/mod-idea.ts`)
Add story-related types:
- `StoryType`: `'quest-line'` | `'npc-backstory'` | `'lore-entry'` | `'world-event'` | `'faction-history'`
- `StoryTone`: `'epic'` | `'dark'` | `'comedic'` | `'mysterious'` | `'tragic'`
- `StoryEntry` interface with: `id`, `title`, `synopsis`, `acts` (array of `{title, description, keyEvents[]}`), `characters` (array of `{name, role, description}`), `loreNotes`, `connections` (suggested mod tie-ins), `storyType`, `tone`, `themes`, `createdAt`
- `StoryFormData` interface with: `storyType`, `themes`, `tone`, `setting` (optional string), `complexity`

#### 2. New Edge Function (`supabase/functions/generate-story/index.ts`)
- Story-specific system prompt instructing AI to generate narrative content structured as acts with characters, lore, and mod integration suggestions
- Accepts `StoryFormData`, returns `StoryEntry`
- Uses same AI gateway pattern as `generate-mod-idea`
- Prompt emphasizes medieval fantasy world-building, Morrowind/Elder Scrolls lore sensibility

#### 3. New Components

**`src/components/forge/StoryForm.tsx`**
- Story type selector (quest-line, NPC backstory, lore entry, world event, faction history)
- Theme tags (reuse existing `ThemeTag` type)
- Tone selector (epic, dark, comedic, mysterious, tragic)
- Optional setting/context textarea
- Complexity slider (short tale / multi-act saga / epic chronicle)
- "Weave Story" and "Random Tale" buttons

**`src/components/forge/StoryCard.tsx`**
- Displays generated story with collapsible acts
- Character list with roles
- Lore notes section
- "Mod Connections" section showing how the story ties into potential mod implementations
- Save/share buttons (reuse pattern from ModIdeaCard)

**`src/components/forge/SavedStoriesPanel.tsx`**
- Similar to `SavedIdeasPanel` but for stories
- Filter by story type and tone

#### 4. New Hook (`src/hooks/useSavedStories.ts`)
- Same pattern as `useSavedIdeas` with localStorage key `'fantasy-mod-forge-saved-stories'`

#### 5. Update Index Page (`src/pages/Index.tsx`)
- Add third tab: "Story Board" with `BookOpen` icon
- Tab layout: Generator | Story Board | Saved
- Saved tab gets sub-sections or combined view for both ideas and stories

#### 6. Update Saved Tab
- Show both saved mod ideas and saved stories in the SavedIdeasPanel, either as sub-tabs or grouped sections

### File Summary

| File | Action |
|------|--------|
| `src/types/mod-idea.ts` | Add story types |
| `supabase/functions/generate-story/index.ts` | New edge function |
| `src/components/forge/StoryForm.tsx` | New form component |
| `src/components/forge/StoryCard.tsx` | New card component |
| `src/components/forge/SavedStoriesPanel.tsx` | New saved panel |
| `src/hooks/useSavedStories.ts` | New hook |
| `src/pages/Index.tsx` | Add Story Board tab, update Saved tab |

