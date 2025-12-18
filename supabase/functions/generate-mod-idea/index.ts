import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// OpenMW Lua API Documentation Base
const DOCS_BASE = "https://openmw.readthedocs.io/en/latest/reference/lua-scripting";

// Category-specific templates with detailed OpenMW Lua patterns
const CATEGORY_TEMPLATES = {
  magic: {
    name: "Magic Systems",
    themes: ["magic", "necromancy", "alchemy", "artifacts"],
    apis: [
      "core.magic.spells - Access spell records, costs, effects",
      "types.Actor.activeSpells(actor) - Get active spell effects",
      "types.Actor.activeEffects(actor) - Get all active magic effects",
      "core.magic.enchantments - Enchantment records access",
      "types.Actor.stats - Magicka, willpower, intelligence stats"
    ],
    examples: [
      {
        title: "Check Active Magic Effects",
        code: `local types = require('openmw.types')
local effects = types.Actor.activeEffects(self)
for _, effect in pairs(effects) do
  if effect.id == 'fortifymagicka' then
    -- Apply custom bonus
  end
end`
      },
      {
        title: "Access Spell Data",
        code: `local core = require('openmw.core')
local spell = core.magic.spells.records['fireball']
-- spell.name, spell.cost, spell.type, spell.effects`
      },
      {
        title: "Modify Actor Magicka",
        code: `local types = require('openmw.types')
local stats = types.Actor.stats.dynamic
stats.magicka(self).current = stats.magicka(self).current + 50`
      }
    ],
    docLinks: [
      `${DOCS_BASE}/openmw_core.html#magic`,
      `${DOCS_BASE}/openmw_types.html#Actor`
    ]
  },
  npc: {
    name: "NPC Behaviors",
    themes: ["guilds", "kingdoms", "combat"],
    apis: [
      "types.NPC.record(npc) - Get NPC record data",
      "types.Actor.stats.ai - AIStats (alarm, fight, flee, hello)",
      "core.factions - Faction records and relationships",
      "types.Actor.getEquipment(actor) - NPC equipment",
      "core.dialogue - Dialogue and greeting hooks"
    ],
    examples: [
      {
        title: "Modify NPC AI Behavior",
        code: `local types = require('openmw.types')
local aiStats = types.Actor.stats.ai
aiStats.fight(npc).base = 90  -- More aggressive
aiStats.flee(npc).base = 10   -- Less likely to flee
aiStats.alarm(npc).base = 0   -- Won't report crimes`
      },
      {
        title: "Check Faction Standing",
        code: `local core = require('openmw.core')
local types = require('openmw.types')
local factions = types.NPC.getFactions(npc)
for _, faction in pairs(factions) do
  local record = core.factions.records[faction]
  -- record.name, record.reactions
end`
      },
      {
        title: "NPC Schedule Pattern",
        code: `local time = require('openmw.core').getGameTime()
local hour = (time / 3600) % 24
if hour >= 8 and hour < 20 then
  -- Daytime behavior: work, patrol
else
  -- Nighttime behavior: sleep, guard
end`
      }
    ],
    docLinks: [
      `${DOCS_BASE}/openmw_types.html#NPC`,
      `${DOCS_BASE}/openmw_core.html#factions`
    ]
  },
  quests: {
    name: "Quest Structures",
    themes: ["quests", "exploration"],
    apis: [
      "core.dialogue.journal - Quest journal access",
      "core.sendGlobalEvent - Trigger world events",
      "types.Player - Player-specific functions",
      "core.dialogue.getTopics - Available dialogue topics",
      "world.createObject - Spawn quest items/NPCs"
    ],
    examples: [
      {
        title: "Update Quest Journal",
        code: `local core = require('openmw.core')
-- Set quest stage (requires global script)
core.sendGlobalEvent('SetQuestStage', {
  quest = 'my_custom_quest',
  stage = 10
})`
      },
      {
        title: "Check Quest Stage",
        code: `local core = require('openmw.core')
local journal = core.dialogue.journal
for _, entry in pairs(journal) do
  if entry.quest == 'my_custom_quest' then
    if entry.stage >= 50 then
      -- Quest complete logic
    end
  end
end`
      },
      {
        title: "Spawn Quest Reward",
        code: `local world = require('openmw.world')
local types = require('openmw.types')
local item = world.createObject('gold_001', 500)
types.Actor.inventory(player):addItem(item)`
      }
    ],
    docLinks: [
      `${DOCS_BASE}/openmw_core.html#dialogue`,
      `${DOCS_BASE}/openmw_world.html`
    ]
  },
  economy: {
    name: "Economy & Crafting",
    themes: ["economy", "crafting"],
    apis: [
      "types.Actor.inventory(actor) - Inventory management",
      "types.Item.itemData - Item data modification",
      "types.Actor.getBarterGold(actor) - Merchant gold",
      "world.createObject - Create new items",
      "types.Container.content - Container access"
    ],
    examples: [
      {
        title: "Crafting System Base",
        code: `local types = require('openmw.types')
local world = require('openmw.world')
local inv = types.Actor.inventory(self)

-- Check for ingredients
local hasIron = inv:countOf('ingot_iron') >= 2
local hasLeather = inv:countOf('leather') >= 1

if hasIron and hasLeather then
  inv:removeItem('ingot_iron', 2)
  inv:removeItem('leather', 1)
  local sword = world.createObject('iron_sword')
  inv:addItem(sword)
end`
      },
      {
        title: "Dynamic Merchant Prices",
        code: `local types = require('openmw.types')
-- Modify merchant gold based on reputation
local baseGold = types.Actor.getBarterGold(merchant)
local reputation = types.Player.getReputation(player)
local bonus = math.floor(reputation * 10)
-- Apply through merchant record modification`
      },
      {
        title: "Container Interaction",
        code: `local types = require('openmw.types')
local content = types.Container.content(chest)
for _, item in pairs(content:getAll()) do
  -- Process container items
  local record = types.Item.record(item)
  -- record.name, record.value, record.weight
end`
      }
    ],
    docLinks: [
      `${DOCS_BASE}/openmw_types.html#Item`,
      `${DOCS_BASE}/openmw_types.html#Container`
    ]
  },
  combat: {
    name: "Combat & Artifacts",
    themes: ["combat", "artifacts", "dragons"],
    apis: [
      "types.Weapon.record - Weapon stats access",
      "types.Armor.record - Armor stats access",
      "types.Actor.getEquipment - Equipment slots",
      "types.Actor.stats.dynamic - Health, fatigue",
      "core.sendGlobalEvent - Combat events"
    ],
    examples: [
      {
        title: "Weapon Effect on Hit",
        code: `local types = require('openmw.types')
-- In onHit handler
local weapon = types.Actor.getEquipment(attacker, types.Equipment.SLOT_CarriedRight)
if weapon then
  local record = types.Weapon.record(weapon)
  if record.id == 'daedric_longsword' then
    -- Apply special damage effect
    local targetHealth = types.Actor.stats.dynamic.health(target)
    targetHealth.current = targetHealth.current - 25
  end
end`
      },
      {
        title: "Artifact Passive Effect",
        code: `local types = require('openmw.types')
-- Check if player wears artifact
local equipment = types.Actor.getEquipment(self)
local amulet = equipment[types.Equipment.SLOT_Amulet]
if amulet and types.Item.record(amulet).id == 'amulet_of_kings' then
  -- Grant passive bonuses
  types.Actor.stats.attributes.luck(self).modifier = 
    types.Actor.stats.attributes.luck(self).modifier + 20
end`
      },
      {
        title: "Combat Stats Manipulation",
        code: `local types = require('openmw.types')
local stats = types.Actor.stats
-- Berserker mode when low health
local health = stats.dynamic.health(self)
if health.current < health.base * 0.25 then
  stats.attributes.strength(self).modifier = 
    stats.attributes.strength(self).modifier + 30
  stats.dynamic.fatigue(self).current = stats.dynamic.fatigue(self).base
end`
      }
    ],
    docLinks: [
      `${DOCS_BASE}/openmw_types.html#Weapon`,
      `${DOCS_BASE}/openmw_types.html#Armor`
    ]
  }
};

// Get relevant templates based on selected themes
function getRelevantTemplates(themes: string[]): typeof CATEGORY_TEMPLATES[keyof typeof CATEGORY_TEMPLATES][] {
  const relevant: typeof CATEGORY_TEMPLATES[keyof typeof CATEGORY_TEMPLATES][] = [];
  
  for (const category of Object.values(CATEGORY_TEMPLATES)) {
    if (themes.some(theme => category.themes.includes(theme))) {
      relevant.push(category);
    }
  }
  
  // Always include at least one category for context
  if (relevant.length === 0) {
    relevant.push(CATEGORY_TEMPLATES.quests);
  }
  
  return relevant;
}

// Build enhanced system prompt with category-specific context
function buildSystemPrompt(themes: string[]): string {
  const relevantTemplates = getRelevantTemplates(themes);
  
  let categoryContext = "";
  for (const template of relevantTemplates) {
    categoryContext += `\n### ${template.name} APIs:\n`;
    categoryContext += template.apis.map(api => `- ${api}`).join('\n');
    categoryContext += `\n\nExample Patterns for ${template.name}:\n`;
    for (const example of template.examples) {
      categoryContext += `\n**${example.title}:**\n\`\`\`lua\n${example.code}\n\`\`\`\n`;
    }
    categoryContext += `\nDocumentation: ${template.docLinks.join(', ')}\n`;
  }

  return `You are a creative mod idea generator for OpenMW (Morrowind). Generate unique, immersive, and lore-friendly mod ideas with REAL, WORKING OpenMW Lua code examples.

Your responses must be valid JSON with this exact structure:
{
  "title": "Creative mod title using archaic/medieval language",
  "description": "2-3 sentence immersive description of the mod concept",
  "features": ["Feature 1", "Feature 2", "Feature 3", "Feature 4"],
  "implementationHints": [
    {
      "title": "Implementation aspect title",
      "description": "How to implement this aspect with OpenMW Lua",
      "luaExample": "-- Working OpenMW Lua code snippet",
      "docLink": "https://openmw.readthedocs.io/en/latest/reference/lua-scripting/..."
    }
  ],
  "tags": ["tag1", "tag2"]
}

## OpenMW Lua API Reference

### Core Modules:
- require('openmw.core') - Game time, magic, factions, dialogue, events
- require('openmw.types') - Actor, NPC, Item, Weapon, Armor, Container types
- require('openmw.world') - Object creation, cell access (global scripts only)
- require('openmw.self') - Self reference in local scripts
- require('openmw.ui') - UI creation and modification
- require('openmw.input') - Key bindings and input handling

### Script Types:
- Global scripts: Run always, can modify world state
- Local scripts: Attached to specific actors/objects
- Player scripts: Special local scripts for player only

${categoryContext}

## Important Guidelines:
1. All Lua examples MUST use correct OpenMW API syntax
2. Include at least 3 implementation hints with working code
3. Reference actual OpenMW documentation URLs
4. Use archaic/medieval language for titles and descriptions
5. Tags must be from: magic, kingdoms, dragons, quests, crafting, combat, economy, exploration, necromancy, alchemy, guilds, artifacts

## Mod File Structure Reference:
\`\`\`
MyMod/
├── MyMod.omwscripts     # Script registration
├── scripts/
│   └── MyMod/
│       ├── global.lua   # Global script
│       └── player.lua   # Player script
└── MyMod.omwaddon       # Optional: ESP-like data
\`\`\``;
}

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
      simple: "a simple tweak or small addition (1-2 scripts, minimal new content). Focus on one specific mechanic.",
      'quest-mod': "a medium-sized quest mod with a storyline (multiple scripts, some new NPCs/items). Include quest journal stages.",
      overhaul: "a comprehensive overhaul that changes core systems (major scripting, many new features). Include multiple interconnected systems."
    };

    const selectedThemes = themes || [];
    const systemPrompt = buildSystemPrompt(selectedThemes);

    let userPrompt = '';
    
    if (isRandom) {
      const randomThemes = ['magic', 'quests', 'combat', 'guilds', 'alchemy', 'exploration', 'artifacts', 'necromancy'];
      const shuffled = randomThemes.sort(() => Math.random() - 0.5);
      const pickedThemes = shuffled.slice(0, 2);
      
      userPrompt = `Generate a completely random and creative OpenMW mod idea combining themes: ${pickedThemes.join(' and ')}.
The complexity should be: ${complexityDescriptions['quest-mod']}
Surprise me with an unexpected, lore-friendly concept that would fit in Morrowind!
Include specific OpenMW Lua code examples that a modder could actually use.`;
    } else {
      const themeContext = getRelevantTemplates(selectedThemes);
      const themeNames = themeContext.map(t => t.name).join(', ');
      
      userPrompt = `Generate an OpenMW mod idea for a ${gameType || 'rpg'} playstyle with these themes: ${selectedThemes.join(', ')}.
Focus on these modding categories: ${themeNames}
The complexity should be: ${complexityDescriptions[complexity as keyof typeof complexityDescriptions] || complexityDescriptions['quest-mod']}.
${customNotes ? `Additional inspiration/notes from the user: ${customNotes}` : ''}

Make sure the implementation hints include WORKING OpenMW Lua code that modders can directly use or adapt.
Reference specific OpenMW APIs relevant to the selected themes.`;
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
      // Try to extract JSON from the response (handle markdown code blocks and raw JSON)
      let jsonStr = content;
      
      // Check for markdown code block
      const codeBlockMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (codeBlockMatch) {
        jsonStr = codeBlockMatch[1].trim();
      } else {
        // Try to find raw JSON object
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          jsonStr = jsonMatch[0];
        }
      }
      
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
