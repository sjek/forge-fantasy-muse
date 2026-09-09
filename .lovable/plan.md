## Plan: Drop Lua code output, keep pseudocode

Generated mod ideas will no longer show Lua snippets. Each implementation hint keeps its plain-language pseudocode panel (with its own copy button), so ideas stay readable without raw code.

### What changes

- The AI is instructed to return pseudocode only — no `luaExample` field.
- The internal OpenMW template library (API names, interfaces, lifecycle handlers) stays in place as reference so the pseudocode remains technically accurate and uses real OpenMW concepts.
- The idea card no longer renders a Lua block; the pseudocode block becomes the single code panel.
- Text sharing/export no longer includes a Lua line.

### Technical detail

- `supabase/functions/generate-mod-idea/index.ts`: remove `luaExample` from the response JSON schema and the "MANDATORY luaExample+pseudocode" rule; replace with a rule that every hint must include `pseudocode`. Keep the template catalogs as AI reference material. Redeploy the function.
- `src/types/mod-idea.ts`: remove `luaExample` from `OpenMWHint`.
- `src/components/forge/ModIdeaCard.tsx`: delete the Lua panel and the now-unused `copiedHintIndex` state; keep the pseudocode panel and its copy behaviour.
- `src/lib/export-utils.ts`: drop the `Lua:` line from the exported text.
