import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const STRUCTURED_SYSTEM_PROMPT = `You are a master storyteller and loremaster specializing in medieval fantasy world-building, with deep knowledge of The Elder Scrolls series (especially Morrowind) and classic RPG narratives.

You generate structured narrative content for game modders who want rich storylines, NPC backstories, lore entries, and world events to implement in OpenMW mods.

When generating stories, follow these principles:
- Draw from Elder Scrolls lore sensibilities: complex politics, religious tension, cultural clashes, morally gray characters
- Create narratives that feel like they belong in Vvardenfell or similar fantasy worlds
- Include practical hooks that modders can implement (dialogue triggers, quest stages, item rewards)
- Weave in environmental storytelling opportunities

RESPONSE FORMAT - You MUST return valid JSON matching this exact structure:
{
  "id": "story_<timestamp>",
  "title": "Story Title",
  "synopsis": "A 2-3 sentence overview of the story",
  "acts": [
    {
      "title": "Act title",
      "description": "What happens in this act",
      "keyEvents": ["Event 1", "Event 2"]
    }
  ],
  "characters": [
    {
      "name": "Character Name",
      "role": "Their role (e.g., Quest Giver, Antagonist, Ally)",
      "description": "Brief character description"
    }
  ],
  "loreNotes": ["Lore detail that enriches the world", "Another lore connection"],
  "connections": ["How this could tie into a mod mechanic", "Suggested implementation approach"],
  "storyType": "<the requested story type>",
  "tone": "<the requested tone>",
  "themes": ["<matching theme tags>"],
  "createdAt": "<ISO timestamp>"
}

STORY TYPE GUIDELINES:
- quest-line: Multi-stage quest with clear objectives, rewards, and branching paths. 3-5 acts.
- npc-backstory: Deep character history with motivations, secrets, and relationships. 2-3 acts covering past/present/future.
- lore-entry: In-world document style - book excerpts, historical accounts, scholarly texts. 1-2 acts.
- world-event: Large-scale happenings affecting regions - wars, plagues, magical phenomena. 3-4 acts.
- faction-history: Rise, conflicts, and current state of an organization. 3-4 acts.

COMPLEXITY GUIDELINES:
- short-tale: 1-2 acts, 2-3 characters, concise lore
- multi-act-saga: 3-4 acts, 4-6 characters, detailed lore
- epic-chronicle: 4-6 acts, 6-8 characters, extensive lore and connections

CRITICAL: Return ONLY the JSON object. No markdown, no code fences, no explanation.`;

const PROSE_SYSTEM_PROMPT = `You are a master storyteller and loremaster specializing in medieval fantasy world-building, with deep knowledge of The Elder Scrolls series (especially Morrowind) and classic RPG narratives.

You write immersive essay/book-style prose narratives for game modders. Your writing should read like an in-world book, chronicle, or literary piece that could exist within the game world itself.

When writing prose, follow these principles:
- Write in a rich, literary style befitting a fantasy world
- Draw from Elder Scrolls lore sensibilities: complex politics, religious tension, cultural clashes
- Create narratives that feel like they belong in Vvardenfell or similar fantasy worlds
- The prose should be continuous, flowing text — not structured into acts

RESPONSE FORMAT - You MUST return valid JSON matching this exact structure:
{
  "id": "story_<timestamp>",
  "title": "Story Title",
  "synopsis": "A 2-3 sentence overview",
  "proseText": "The full essay/book-style narrative text. Multiple paragraphs of rich, immersive prose. This should be substantial and read like a real in-world document or literary piece.",
  "keyPoints": [
    "Key theme or plot point that could become a mod feature",
    "Important character or faction that could be implemented",
    "World-building detail that suggests gameplay mechanics",
    "Narrative hook that could drive a quest or event"
  ],
  "acts": [],
  "characters": [],
  "loreNotes": ["Lore detail that enriches the world"],
  "connections": ["How this could tie into a mod mechanic", "Suggested implementation approach"],
  "storyType": "<the requested story type>",
  "tone": "<the requested tone>",
  "themes": ["<matching theme tags>"],
  "createdAt": "<ISO timestamp>"
}

COMPLEXITY GUIDELINES (affect prose length):
- short-tale: 2-4 paragraphs, 3-5 key points
- multi-act-saga: 5-8 paragraphs, 5-8 key points
- epic-chronicle: 8-12+ paragraphs, 8-12 key points

CRITICAL: Return ONLY the JSON object. No markdown, no code fences, no explanation.`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    let userPrompt: string;
    const format = body.format || 'structured';
    const systemPrompt = format === 'prose' ? PROSE_SYSTEM_PROMPT : STRUCTURED_SYSTEM_PROMPT;

    if (body.isRandom) {
      userPrompt = `Generate a random ${format === 'prose' ? 'prose/book-style' : 'structured'} story for a Morrowind/Elder Scrolls style mod. Pick a random story type from: quest-line, npc-backstory, lore-entry, world-event, faction-history. Pick a random tone from: epic, dark, comedic, mysterious, tragic. Use a multi-act-saga complexity. Choose 2-4 interesting themes. Be creative and surprising!`;
    } else {
      const { storyType, themes, tone, complexity, setting } = body;
      userPrompt = `Generate a ${tone} ${storyType.replace('-', ' ')} in ${format === 'prose' ? 'essay/book prose format' : 'structured format'} for a Morrowind/Elder Scrolls style mod.

Themes to incorporate: ${themes.join(', ')}
Complexity level: ${complexity}
${setting ? `Setting/Context: ${setting}` : ''}

${format === 'prose' ? 'Write an immersive, literary prose narrative. Extract key points that modders can use to derive mod ideas.' : 'Create an engaging narrative that a modder could implement in OpenMW.'} Include practical mod implementation suggestions in the "connections" field.`;
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.85,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);
      throw new Error("AI gateway error");
    }

    const aiResult = await response.json();
    let content = aiResult.choices?.[0]?.message?.content;
    if (!content) throw new Error("No content in AI response");

    // Strip markdown fences if present
    content = content.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();

    const story = JSON.parse(content);

    // Ensure required fields
    if (!story.id) story.id = `story_${Date.now()}`;
    if (!story.createdAt) story.createdAt = new Date().toISOString();

    return new Response(JSON.stringify(story), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Story generation error:", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Failed to generate story" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
