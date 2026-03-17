

## Plan: Add Essay/Book Format to Story Board

### Overview
Add a new "format" option to the story form that lets users choose between the existing **Structured** output (acts, characters, lore notes) and a new **Prose** output (essay/book-style continuous narrative). Prose stories include an auto-extracted `keyPoints` array that modders can use to derive mod ideas.

### Changes

#### 1. Types (`src/types/mod-idea.ts`)
- Add `StoryFormat = 'structured' | 'prose'` type
- Add optional `proseText?: string` and `keyPoints?: string[]` fields to `StoryEntry`
- Add `format?: StoryFormat` to `StoryFormData`

#### 2. Edge Function (`supabase/functions/generate-story/index.ts`)
- When `body.format === 'prose'`, use a different response format in the system prompt:
  - Return JSON with `proseText` (the full essay/book narrative) and `keyPoints` (array of extracted main points: themes, plot beats, characters, mod-relevant ideas)
  - Keep `title`, `synopsis`, `storyType`, `tone`, `themes`, `connections`, `createdAt`
  - `acts` and `characters` become empty arrays (content is in prose form)
- When `body.format` is absent or `'structured'`, behavior unchanged

#### 3. Story Form (`src/components/forge/StoryForm.tsx`)
- Add a format toggle (two badges: "Structured" and "Prose/Book") above the story type selector
- Include `format` in the submitted `StoryFormData`

#### 4. Story Card (`src/components/forge/StoryCard.tsx`)
- When `story.proseText` exists, render the prose text in a scrollable reading area instead of acts/characters collapsibles
- Show `keyPoints` as a collapsible "Key Points" section (similar to mod connections) with a list of extracted points
- Keep existing lore notes, mod connections, save/share/convert buttons
- The "Convert to Mod" flow works the same (uses `connections`)

### File Summary

| File | Action |
|------|--------|
| `src/types/mod-idea.ts` | Add `StoryFormat`, `proseText`, `keyPoints` fields |
| `supabase/functions/generate-story/index.ts` | Add prose format branch with key point extraction |
| `src/components/forge/StoryForm.tsx` | Add format toggle |
| `src/components/forge/StoryCard.tsx` | Render prose text + key points when present |

