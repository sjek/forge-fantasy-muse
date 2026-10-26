# Fourth tab: Nexus Mods Search

## What you get
A new **"Nexus Search"** tab next to Saved. Type a search (e.g. "combat", "UI", "0.49"), press Search, and see a list of Morrowind mods from Nexus Mods that need OpenMW. Each result shows:
- Mod name, linked to its Nexus page
- Short AI summary (2-3 sentences) of what it does
- OpenMW version needed, if the page says so
- A few tags (combat, UI, quests, etc.)

Above the list, a short **overview summary** describes common patterns across the results.

Optional filter: minimum OpenMW version (Any / 0.48 / 0.49 / 0.50 / 0.51+).

Results are not saved; they reset on page reload, like other generated output.

## Setup needed
Web search uses the **Firecrawl** service. A connect card will appear for you to approve. Summaries use the built-in AI, so no extra key.

## Technical details
- Connect Firecrawl connector; read `uses_connector_gateway` and use the matching call pattern.
- New edge function `search-nexus-mods`:
  - Input: `{ query, minVersion? }`, validated.
  - Firecrawl `/search` with `site:nexusmods.com/morrowind/mods openmw <query>`, limit ~10, scrape markdown.
  - Send trimmed page text to Lovable AI (`google/gemini-3-flash-preview`) with tool-calling schema returning `{ overview, mods: [{ title, url, summary, openmwVersion, tags[] }] }`; drop non-OpenMW results; filter by minVersion.
  - Return provider status/body on errors; handle 429/402 from AI.
- Frontend: new `src/components/forge/NexusSearchPanel.tsx` (parchment-styled cards, loading state, empty state), add 4th tab in `Index.tsx` (grid-cols-4, Search icon).
- Types `NexusModResult`, `NexusSearchResponse` in `src/types/mod-idea.ts`.
