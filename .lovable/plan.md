

## Plan: Add Story Refinement Options for Prose/Book Format

### Overview
Add a set of refinement actions to prose story cards that let users send the generated story back to the AI with a specific transformation instruction (e.g., "Make it darker", "Add more characters", "Expand the ending"). The refined story replaces the current one.

### Changes

#### 1. `StoryCard.tsx` — Add refinement UI (prose only)
- Add a new row of selectable refinement badges/buttons below the prose narrative, visible only when `story.proseText` exists
- Predefined options:
  - **Tone shifts**: "Make it darker", "Make it more epic", "Add humor"
  - **Content changes**: "Add more characters", "Expand the ending", "Add a plot twist"
  - **Style**: "More poetic", "More dialogue", "More action"
  - **World-building**: "Add more lore details", "Describe the setting more"
- Add an optional custom refinement text input for freeform instructions
- Add a "Refine Story" button that calls a new `onRefine` callback prop with the story + selected refinement instruction
- Show a loading state while refining

#### 2. `Index.tsx` — Wire up refinement
- Add `handleRefineStory(story: StoryEntry, instruction: string)` function
- Calls `generate-story` edge function with a new field: `{ refine: true, originalStory: story, instruction: instruction, format: 'prose' }`
- Updates `generatedStory` with the result
- Pass `onRefine` and `isGeneratingStory` to StoryCard

#### 3. `supabase/functions/generate-story/index.ts` — Handle refinement requests
- When `body.refine === true`, construct a prompt that includes the original story text and the refinement instruction
- Use the prose system prompt but add the original story as context
- User prompt: "Here is an existing story: [proseText]. Apply this change: [instruction]. Return the modified story in the same JSON format."

#### 4. `SavedStoriesPanel.tsx` — Forward refine callback
- Pass `onRefine` through to StoryCard instances

### Predefined Refinement Options
| Category | Options |
|----------|---------|
| Tone | "Darker tone", "More epic", "Add humor", "More mysterious" |
| Content | "Add characters", "Expand ending", "Add plot twist", "More conflict" |
| Style | "More poetic", "More dialogue-driven", "More action scenes" |
| World | "Richer lore", "Vivid setting descriptions", "Add historical context" |

### File Summary
| File | Action |
|------|--------|
| `src/components/forge/StoryCard.tsx` | Add refinement options UI for prose stories |
| `src/pages/Index.tsx` | Add `handleRefineStory`, pass callbacks |
| `supabase/functions/generate-story/index.ts` | Handle `refine` requests |
| `src/components/forge/SavedStoriesPanel.tsx` | Forward `onRefine` prop |

