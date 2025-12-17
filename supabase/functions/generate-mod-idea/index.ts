import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const OPENMW_LUA_DOCS = "https://openmw.readthedocs.io/en/latest/reference/lua-scripting/overview.html";

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { gameType, themes, complexity, customNotes, isRandom } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const complexityDescriptions = {
      simple: "a simple tweak or small addition (1-2 scripts, minimal new content)",
      'quest-mod': "a medium-sized quest mod with a storyline (multiple scripts, some new NPCs/items)",
      overhaul: "a comprehensive overhaul that changes core systems (major scripting, many new features)"
    };

    const systemPrompt = `You are a creative mod idea generator for medieval fantasy games, specifically focused on OpenMW (Morrowind). Generate unique, immersive, and lore-friendly mod ideas.

Your responses must be valid JSON with this exact structure:
{
  "title": "Creative mod title",
  "description": "2-3 sentence immersive description of the mod concept",
  "features": ["Feature 1", "Feature 2", "Feature 3", "Feature 4"],
  "implementationHints": [
    {
      "title": "Hint title",
      "description": "How to implement this aspect",
      "luaExample": "-- Optional Lua code snippet",
      "docLink": "https://openmw.readthedocs.io/en/latest/reference/lua-scripting/..."
    }
  ],
  "tags": ["tag1", "tag2"]
}

OpenMW Lua API references to use:
- Events: ${OPENMW_LUA_DOCS}#events
- UI: ${OPENMW_LUA_DOCS}#user-interface
- World: ${OPENMW_LUA_DOCS}#world-module
- Player: ${OPENMW_LUA_DOCS}#player-module
- Items: ${OPENMW_LUA_DOCS}#items-module

Always include at least 2 implementation hints with specific OpenMW Lua examples and doc links.
Keep the tone medieval and immersive. Use archaic language where fitting.
Tags must be from: magic, kingdoms, dragons, quests, crafting, combat, economy, exploration, necromancy, alchemy, guilds, artifacts`;

    let userPrompt = '';
    
    if (isRandom) {
      userPrompt = `Generate a completely random and creative mod idea for a medieval fantasy RPG. Surprise me with an unexpected concept! The complexity should be: ${complexityDescriptions['quest-mod']}`;
    } else {
      userPrompt = `Generate a mod idea for a ${gameType} game with these themes: ${themes.join(', ')}.
The complexity should be: ${complexityDescriptions[complexity as keyof typeof complexityDescriptions]}.
${customNotes ? `Additional notes/inspiration: ${customNotes}` : ''}`;
    }

    console.log('Generating mod idea with prompt:', userPrompt);

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again in a moment.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'AI credits exhausted. Please add credits to continue.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) {
      throw new Error('No content in AI response');
    }

    // Parse the JSON from the response
    let modIdea;
    try {
      // Try to extract JSON from the response (it might be wrapped in markdown code blocks)
      const jsonMatch = content.match(/```json\n?([\s\S]*?)\n?```/) || content.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : content;
      modIdea = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error('Failed to parse AI response:', content);
      throw new Error('Failed to parse mod idea from AI response');
    }

    // Add metadata
    const completeIdea = {
      id: crypto.randomUUID(),
      ...modIdea,
      complexity: complexity || 'quest-mod',
      gameType: gameType || 'rpg',
      createdAt: new Date().toISOString(),
    };

    console.log('Generated mod idea:', completeIdea.title);

    return new Response(JSON.stringify(completeIdea), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-mod-idea:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Failed to generate mod idea' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});