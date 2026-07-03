## Plan: Pair Pseudocode with Generated Lua

### Overview
For every `luaExample` produced in a mod idea's implementation hints, also generate a plain-language **pseudocode** version. Display it next to the Lua code so non-Lua modders can follow the logic, and coders get a clear intent spec beside the real syntax.

### Changes

#### 1. `src/types/mod-idea.ts`
Extend `OpenMWHint`:
```ts
export interface OpenMWHint {
  title: string;
  description: string;
  luaExample?: string;
  pseudocode?: string;   // NEW — language-agnostic outline mirroring luaExample
  docLink?: string;
}
```

#### 2. `supabase/functions/generate-mod-idea/index.ts`
- Update the JSON schema in the system prompt so each hint may include `pseudocode`.
- Add an instruction: *"Whenever you provide `luaExample`, also provide a matching `pseudocode` field: numbered steps in plain English (no Lua syntax), 1:1 with the code's control flow. Reference OpenMW concepts by name (e.g., 'register onActivate handler', 'iterate nearby actors within 500 units')."*
- Keep style consistent: `FUNCTION`, `IF/ELSE`, `FOR EACH`, `RETURN` uppercase keywords; indent with two spaces.

#### 3. `src/components/forge/ModIdeaCard.tsx`
Inside the hint block, when `hint.pseudocode` exists, render a second panel above the Lua panel:
- Header label "Pseudocode" with copy button (reuse `handleCopyCode` pattern, add `copiedPseudoIndex` state).
- Same visual styling as the Lua block but with a distinct muted background and no `Lua` tag — label reads `Pseudocode`.
- Both panels stack vertically: Pseudocode first (intent), Lua second (implementation).

#### 4. Story board (optional, same turn)
`StoryCard.tsx` doesn't show code, so no changes there. Skip.

### File Summary
| File | Change |
|---|---|
| `src/types/mod-idea.ts` | Add `pseudocode?: string` to `OpenMWHint` |
| `supabase/functions/generate-mod-idea/index.ts` | Require pseudocode alongside every luaExample in prompt/schema |
| `src/components/forge/ModIdeaCard.tsx` | Render pseudocode panel above Lua panel with copy button |

### Notes
- Existing saved ideas without `pseudocode` degrade gracefully (panel simply hidden).
- No backend/schema/storage changes — hints are stored inside the idea JSON in local storage.