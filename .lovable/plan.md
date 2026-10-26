# Fourth tab: Mod List

## What you get
A new **"Mod List"** tab next to Saved, kept simple:
- One text box for a topic (e.g. "combat", "UI", "quests"), an optional count (5 / 10 / 15), and a **Generate List** button.
- Results appear as a plain numbered list: **mod name** plus a 1-2 sentence summary of what it contains.
- A **Copy List** button copies everything as text.
- Results reset on reload (not saved), like other generated output.

No extra service or setup needed; it uses the built-in AI.

Note: the AI lists Morrowind/OpenMW mods it knows about. Names and summaries may be outdated or imperfect, so a small note under the list says to check Nexus Mods before relying on them.

## Technical details
- New edge function `generate-mod-list`: input `{ topic, count }` validated (topic 1-100 chars, count 5-15). Calls Lovable AI Gateway (default model, Responses API, strict json_schema) returning `{ mods: [{ name, summary }] }`. Surfaces 402/429 errors with readable messages.
- New `src/components/forge/ModListPanel.tsx` in parchment styling.
- `Index.tsx`: add 4th tab (grid-cols-4, List icon).
- Types `ModListItem` in `src/types/mod-idea.ts`.
