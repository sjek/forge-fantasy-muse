

## Plan: Convert Story to Mod Idea

### Overview
Add a "Convert to Mod Idea" button on `StoryCard` that switches to the Generator tab with the form pre-filled using the story's themes, complexity, and a custom note summarizing the story.

### Changes

#### 1. `StoryCard.tsx` — Add convert button
- Add optional `onConvertToMod` callback prop
- Add a new button in the footer (Wand2 icon, "Convert to Mod") that calls `onConvertToMod(story)`

#### 2. `GeneratorForm.tsx` — Accept pre-fill data
- Add optional `prefill?: { themes: ThemeTag[]; complexity: Complexity; customNotes: string }` prop
- Use `useEffect` to apply prefill values when they change (set themes, complexity slider, custom notes)
- Map story complexity (`short-tale` → `simple`/25, `multi-act-saga` → `quest-mod`/50, `epic-chronicle` → `overhaul`/100)

#### 3. `Index.tsx` — Wire up conversion flow
- Add state: `const [activeTab, setActiveTab] = useState('generator')` and `const [generatorPrefill, setGeneratorPrefill] = useState(null)`
- Switch `Tabs` from `defaultValue` to controlled `value={activeTab}` with `onValueChange={setActiveTab}`
- Create `handleConvertStoryToMod(story: StoryEntry)`:
  - Maps story themes directly (they share `ThemeTag` type)
  - Maps `StoryComplexity` → `Complexity` 
  - Builds custom notes from story title + synopsis
  - Sets prefill state, switches tab to `'generator'`, shows toast
- Pass `onConvertToMod` to all `StoryCard` instances (in storyboard tab and SavedStoriesPanel)

#### 4. `SavedStoriesPanel.tsx` — Forward convert callback
- Add `onConvertToMod?: (story: StoryEntry) => void` prop
- Pass it through to each `StoryCard`

### Complexity Mapping
| StoryComplexity | Complexity | Slider |
|---|---|---|
| `short-tale` | `simple` | 25 |
| `multi-act-saga` | `quest-mod` | 50 |
| `epic-chronicle` | `overhaul` | 100 |

