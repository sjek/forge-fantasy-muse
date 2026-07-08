## Plan: Remove onSave / onLoad persistence logic from generated mods

Strip all references to OpenMW's `onSave` / `onLoad` engine handlers from the mod-idea generation prompts and templates. Generated scripts will no longer include save-game persistence — state resets each session, matching the app's own no-persistence stance.

### Scope

Only the `generate-mod-idea` edge function contains these references (found in ~80 locations across code snippets, guidance sections, and rule lists). No frontend code, story-generation function, or types reference `onSave`/`onLoad`.

### Files to edit

**`supabase/functions/generate-mod-idea/index.ts`**
- Remove every `local function onSave() ... end` and `local function onLoad(savedData, initData) ... end` block from example Lua snippets.
- Remove `onSave = onSave,` and `onLoad = onLoad,` entries from `engineHandlers = { ... }` tables (and inline `onSave = function() ... end` / `onLoad = function(...) ... end` entries).
- Remove commentary lines that explain onSave/onLoad usage (e.g. "-- onSave: Return state to persist", "-- onLoad: Accepts (savedData, initData)").
- Remove onSave/onLoad items from the prompt's rules, requirements, best-practices, and "common mistakes" lists (e.g. "Include onSave/onLoad for state persistence", "Using onLoad(data) instead of onLoad(savedData, initData)").
- Update the example luaExample descriptor string that mentions onSave/onLoad.
- Leave `onInit`, `onActive`, `onInactive`, `onUpdate`, and all other engine handlers untouched.

### Memory update

- Update `mem://constraints/openmw-lifecycle-state-machine-rules` to state that generated mods must NOT use `onSave`/`onLoad`; state is session-only.
- Update `mem://index.md` Core line about lifecycle to reflect the removal.

### What stays

- All other OpenMW generation logic: lifecycle handlers (`onInit`, `onActive`, `onInactive`, `onUpdate`), interfaces, events, UI templates, animation/sound patterns, API package prioritization, and every non-persistence rule.
- Deploy the updated edge function after edits.
