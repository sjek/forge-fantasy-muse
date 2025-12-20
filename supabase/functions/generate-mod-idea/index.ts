import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// OpenMW Lua API Documentation Base
const DOCS_BASE = "https://openmw.readthedocs.io/en/latest/reference/lua-scripting";

// Script Context Templates - Global, Local, Player
const SCRIPT_CONTEXT_TEMPLATES = {
  global: {
    name: "Global Script",
    description: "Runs always, can modify world state, spawn objects, manage quests",
    omwscriptsFlag: "GLOBAL:",
    access: [
      "openmw.world - Create objects, access cells, modify world",
      "core.sendGlobalEvent - Receive events from local scripts",
      "core.dialogue.journal - Quest journal management",
      "Full world manipulation capabilities"
    ],
    example: `-- scripts/MyMod/global.lua
local world = require('openmw.world')
local core = require('openmw.core')

local function onSave()
  return { questStage = currentStage }
end

local function onLoad(data)
  if data then currentStage = data.questStage end
end

return {
  engineHandlers = { onSave = onSave, onLoad = onLoad },
  eventHandlers = {
    MyMod_QuestProgress = function(data)
      -- Handle event from local script
      currentStage = data.stage
    end,
  },
}`
  },
  local: {
    name: "Local Script",
    description: "Attached to specific actors/objects, access to self and nearby",
    omwscriptsFlags: ["NPC:", "CREATURE:", "ACTIVATOR:", "CONTAINER:", "CUSTOM:"],
    access: [
      "openmw.self - The object this script is attached to",
      "openmw.nearby - Objects near this actor",
      "object:sendEvent - Send events to other local scripts",
      "core.sendGlobalEvent - Send events to global scripts"
    ],
    example: `-- scripts/MyMod/npc_behavior.lua
local self = require('openmw.self')
local core = require('openmw.core')
local nearby = require('openmw.nearby')
local types = require('openmw.types')

local state = { isActive = false }

local function onActivated(actor)
  if actor.type == types.Player then
    state.isActive = true
    core.sendGlobalEvent('MyMod_NPCActivated', {
      npc = self.object,
      activator = actor
    })
  end
end

local function onSave() return state end
local function onLoad(data) if data then state = data end end

return {
  engineHandlers = {
    onActivated = onActivated,
    onSave = onSave,
    onLoad = onLoad,
  },
  eventHandlers = {
    MyMod_StartBehavior = function(data)
      -- Receive event from global or other local script
      state.isActive = data.active
    end,
  },
}`
  },
  player: {
    name: "Player Script",
    description: "Special local script for player only, access to UI and camera",
    omwscriptsFlag: "PLAYER:",
    access: [
      "openmw.ui - Create HUD elements, menus",
      "openmw.camera - Camera manipulation",
      "openmw.input - Key bindings, input handling",
      "All local script capabilities plus player-specific features"
    ],
    example: `-- scripts/MyMod/player.lua
local self = require('openmw.self')
local ui = require('openmw.ui')
local input = require('openmw.input')
local async = require('openmw.async')

local hudElement = nil

local function createHUD()
  hudElement = ui.create({
    layer = 'HUD',
    template = ui.templates.textNormal,
    props = { text = 'Quest Active' }
  })
end

local function onKeyPress(key)
  if key.symbol == 'j' and input.isAltPressed() then
    -- Toggle custom journal
    core.sendGlobalEvent('MyMod_ToggleJournal', {})
  end
end

return {
  engineHandlers = {
    onKeyPress = onKeyPress,
    onInit = createHUD,
  },
  eventHandlers = {
    MyMod_UpdateHUD = function(data)
      if hudElement then
        hudElement.layout.props.text = data.text
        hudElement:update()
      end
    end,
  },
}`
  }
};

// Interface System Templates
const INTERFACE_TEMPLATES = {
  definingInterface: {
    title: "Defining a Custom Interface",
    description: "Expose functions for other scripts to call",
    code: `-- scripts/MyMod/interface.lua
local currentState = { value = 0 }

return {
  interfaceName = "MyModInterface",
  interface = {
    version = 1,
    getValue = function() return currentState.value end,
    setValue = function(v) currentState.value = v end,
    trigger = function(eventData)
      core.sendGlobalEvent('MyMod_Triggered', eventData)
    end,
  },
}`
  },
  usingBuiltinInterfaces: {
    title: "Using Built-in Interfaces",
    description: "Leverage OpenMW's built-in interface system",
    code: `local I = require('openmw.interfaces')

-- AI Interface - control NPC behavior packages
I.AI.startPackage({
  type = 'Travel',
  destPosition = util.vector3(1000, 2000, 100)
})
I.AI.getActivePackage(actor)

-- Combat Interface
local inCombat = I.Combat.isInCombat(actor)

-- Controls Interface (player scripts)
I.Controls.overrideMovementInput(false)  -- Disable player movement
I.Controls.overrideCombatInput(true)

-- Camera Interface (player scripts)
I.Camera.setMode(I.Camera.MODE.ThirdPerson)

-- Activation Interface
I.Activation.addHandler(function(actor, object)
  if object.recordId == 'my_special_door' then
    return false  -- Block activation
  end
end)`
  },
  overrideInterface: {
    title: "Interface Override Pattern",
    description: "Extend or modify existing interfaces",
    code: `-- Override the AI interface to add custom behavior
local baseAI

return {
  interfaceName = "AI",
  interface = {
    version = 2,
    startPackage = function(actor, package)
      -- Custom logic before starting package
      if package.type == 'Combat' and isAlly(actor, package.target) then
        return false  -- Prevent attacking allies
      end
      return baseAI.startPackage(actor, package)
    end,
  },
  engineHandlers = {
    onInterfaceOverride = function(base)
      baseAI = base  -- Store reference to original
    end,
  },
}`
  }
};

// Event System Templates
const EVENT_TEMPLATES = {
  globalEvents: {
    title: "Global Events (Local → Global)",
    description: "Send events from local scripts to global coordinator",
    code: `-- From local script: trigger quest update
local core = require('openmw.core')

core.sendGlobalEvent('MyMod_QuestProgress', {
  questId = 'dark_ritual',
  stage = 'completed',
  player = self.object,
  data = { killedBoss = true, secretFound = false }
})

-- In global script: handle the event
eventHandlers = {
  MyMod_QuestProgress = function(data)
    if data.stage == 'completed' then
      -- Update journal, spawn rewards
      updateJournal(data.questId, 100)
      spawnReward(data.player)
    end
  end,
}`
  },
  localEvents: {
    title: "Local Events (Global → Local or Local → Local)",
    description: "Send events to specific objects or nearby actors",
    code: `-- From global script: notify specific NPC
local world = require('openmw.world')

local npc = world.getObjectByFormId(targetFormId)
if npc then
  npc:sendEvent('MyMod_StartDialogue', {
    topic = 'secret_info',
    mood = 'hostile'
  })
end

-- From local script: affect nearby actors
local nearby = require('openmw.nearby')

for _, actor in pairs(nearby.actors) do
  if actor ~= self.object then
    actor:sendEvent('MyMod_AreaEffect', {
      damage = 50,
      source = self.object,
      effectType = 'fire'
    })
  end
end

-- Targeted event to player
nearby.players[1]:sendEvent('MyMod_ShowNotification', {
  message = 'Quest Updated!'
})`
  },
  eventInterception: {
    title: "Event Handler with Interception",
    description: "Process events and optionally block propagation",
    code: `eventHandlers = {
  MyMod_AreaEffect = function(data)
    local types = require('openmw.types')
    local self = require('openmw.self')
    local effects = types.Actor.activeEffects(self.object)
    
    -- Check for shield spell using getEffect
    local shieldEffect = effects:getEffect('shield')
    local hasShield = shieldEffect ~= nil
    
    if hasShield then
      data.damage = data.damage * 0.5  -- Reduce damage
    end
    
    -- Apply remaining damage
    if data.damage > 0 then
      local health = types.Actor.stats.dynamic.health(self.object)
      health.current = health.current - data.damage
    end
    
    -- Return false to stop event propagation to other handlers
    return data.damage <= 0
  end,
}`
  }
};

// Multi-Stage Script Templates
const MULTI_STAGE_TEMPLATES = {
  stateMachine: {
    title: "State Machine with Persistence",
    description: "Save/load state across game sessions",
    code: `local questState = {
  stage = 0,
  objectives = {},
  npcsSpoken = {},
  itemsCollected = 0
}

local function advanceQuest()
  questState.stage = questState.stage + 1
  
  if questState.stage == 1 then
    core.sendGlobalEvent('MyMod_SpawnNPC', { location = 'balmora' })
  elseif questState.stage == 2 then
    core.sendGlobalEvent('MyMod_EnableDungeon', {})
  elseif questState.stage >= 3 then
    core.sendGlobalEvent('MyMod_QuestComplete', {})
  end
end

-- CRITICAL: These handlers save/load your state
local function onSave()
  return { 
    version = 1, 
    state = questState 
  }
end

local function onLoad(data)
  if data and data.version == 1 then
    questState = data.state
  end
end

return {
  engineHandlers = { 
    onSave = onSave, 
    onLoad = onLoad 
  },
  eventHandlers = {
    MyMod_ObjectiveComplete = function(data)
      questState.objectives[data.id] = true
      if allObjectivesComplete() then
        advanceQuest()
      end
    end,
  },
}`
  },
  reliableTimers: {
    title: "Reliable Timers (Survive Save/Load)",
    description: "Schedule actions that persist across saves",
    code: `local async = require('openmw.async')
local core = require('openmw.core')

-- Register callback ONCE at script load (not inside functions)
local spawnCallback = async:registerTimerCallback('spawn_reinforcements',
  function(data)
    -- This runs after the timer, even if game was saved/loaded
    core.sendGlobalEvent('MyMod_SpawnEnemies', {
      count = data.count,
      location = data.location
    })
  end
)

local function startDelayedSpawn(position, count)
  -- Timer in game seconds (not real seconds)
  -- Use async:newGameTimer for real-world seconds
  async:newSimulationTimer(
    30,  -- 30 game seconds
    spawnCallback,
    { count = count, location = position }
  )
end

-- For player scripts with UI updates, use frame timers
local uiCallback = async:registerTimerCallback('ui_update',
  function()
    updateHUD()
  end
)

-- Update every 0.5 real seconds
async:newUnsavableGameTimer(0.5, uiCallback, {})`
  },
  repeatingTimers: {
    title: "Repeating Timer Pattern",
    description: "Run checks periodically with ability to stop",
    code: `local time = require('openmw_aux.time')
local core = require('openmw.core')

local checkInterval = time.hour  -- Check every game hour
local stopChecking = nil

local function startPeriodicCheck()
  stopChecking = time.runRepeatedly(
    function()
      -- Check condition periodically
      if conditionMet() then
        core.sendGlobalEvent('MyMod_PhaseComplete', {
          phase = currentPhase
        })
        stopChecking()  -- Stop the repeating timer
        return
      end
      
      -- Update ambient effects, NPC positions, etc.
      updateWorldState()
    end,
    checkInterval,
    { type = time.GameTime }  -- or time.SimulationTime
  )
end

-- Clean up on script unload
local function onInactive()
  if stopChecking then
    stopChecking()
  end
end

return {
  engineHandlers = {
    onActive = startPeriodicCheck,
    onInactive = onInactive,
  },
}`
  }
};

// Complete .omwscripts file patterns
const OMWSCRIPTS_PATTERNS = {
  simpleQuest: `# SimpleQuestMod.omwscripts
GLOBAL: scripts/SimpleQuestMod/global.lua
PLAYER: scripts/SimpleQuestMod/player.lua`,
  
  npcBehavior: `# NPCBehaviorMod.omwscripts
GLOBAL: scripts/NPCBehaviorMod/global.lua
PLAYER: scripts/NPCBehaviorMod/player.lua
NPC: scripts/NPCBehaviorMod/npc.lua
CREATURE: scripts/NPCBehaviorMod/creature.lua`,
  
  complexMod: `# ComplexMod.omwscripts
# Global coordinator script
GLOBAL: scripts/ComplexMod/global.lua

# Player-specific features (HUD, keybinds)
PLAYER: scripts/ComplexMod/player.lua

# NPC behaviors - applies to all NPCs
NPC: scripts/ComplexMod/npc_ai.lua

# Custom scripts for specific records (attach via console or CUSTOM flag)
CUSTOM NPC my_special_npc: scripts/ComplexMod/special_npc.lua
CUSTOM ACTIVATOR my_trigger: scripts/ComplexMod/trigger.lua

# Interface script for cross-mod compatibility
PLAYER, NPC, GLOBAL: scripts/ComplexMod/interface.lua`
};

// Category-specific templates with detailed OpenMW Lua patterns
const CATEGORY_TEMPLATES = {
  magic: {
    name: "Magic Systems",
    themes: ["magic", "necromancy", "alchemy", "artifacts"],
    scriptContext: "local",
    apis: [
      "core.magic.spells - Access spell records, costs, effects",
      "types.Actor.activeSpells(actor) - Get active spell effects",
      "types.Actor.activeEffects(actor) - Get all active magic effects",
      "core.magic.enchantments - Enchantment records access",
      "types.Actor.stats - Magicka, willpower, intelligence stats"
    ],
    examples: [
      {
        title: "Custom Spell Effect (Local Script)",
        context: "local",
        code: `-- scripts/MagicMod/spell_effects.lua
local self = require('openmw.self')
local types = require('openmw.types')
local core = require('openmw.core')
local async = require('openmw.async')

local activeEffects = {}

local function onSave() return { effects = activeEffects } end
local function onLoad(data) if data then activeEffects = data.effects end end

-- Check active effects each frame
local function onUpdate(dt)
  local effects = types.Actor.activeEffects(self.object)
  
  -- Use getEffect to check for specific effect
  local fortifyEffect = effects:getEffect('fortifymagicka')
  if fortifyEffect then
    -- Custom amplification when fortified
    if not activeEffects.amplified then
      activeEffects.amplified = true
      core.sendGlobalEvent('MagicMod_Amplified', { actor = self.object })
    end
  else
    activeEffects.amplified = false
  end
end

return {
  engineHandlers = { onUpdate = onUpdate, onSave = onSave, onLoad = onLoad },
}`
      },
      {
        title: "Spell System Coordinator (Global Script)",
        context: "global",
        code: `-- scripts/MagicMod/global.lua
local world = require('openmw.world')
local core = require('openmw.core')

local spellRegistry = {}

local function onSave() return { registry = spellRegistry } end
local function onLoad(data) if data then spellRegistry = data.registry end end

return {
  engineHandlers = { onSave = onSave, onLoad = onLoad },
  eventHandlers = {
    MagicMod_Amplified = function(data)
      -- Create visual effect at actor location
      local pos = data.actor.position
      -- Notify nearby actors of magic surge using world.activeActors
      for _, actor in ipairs(world.activeActors) do
        if (actor.position - pos):length() < 1000 then
          actor:sendEvent('MagicMod_MagicSurge', { power = 2.0 })
        end
      end
    end,
  },
}`
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
    scriptContext: "local",
    apis: [
      "types.NPC.record(npc) - Get NPC record data",
      "types.Actor.stats.ai - AIStats (alarm, fight, flee, hello)",
      "core.factions - Faction records and relationships",
      "openmw.interfaces.AI - AI package control",
      "core.dialogue - Dialogue and greeting hooks"
    ],
    examples: [
      {
        title: "NPC Schedule System (Local Script)",
        context: "local",
        code: `-- scripts/NPCMod/npc_schedule.lua
local self = require('openmw.self')
local core = require('openmw.core')
local I = require('openmw.interfaces')
local async = require('openmw.async')
local time = require('openmw_aux.time')

local schedule = {
  current = 'idle',
  homePosition = nil,
  workPosition = nil
}

local function getHour()
  return (core.getGameTime() / 3600) % 24
end

local checkSchedule = time.runRepeatedly(function()
  local hour = getHour()
  local newActivity = 'idle'
  
  if hour >= 8 and hour < 12 then
    newActivity = 'work_morning'
  elseif hour >= 12 and hour < 13 then
    newActivity = 'lunch'
  elseif hour >= 13 and hour < 18 then
    newActivity = 'work_afternoon'
  elseif hour >= 22 or hour < 6 then
    newActivity = 'sleep'
  end
  
  if newActivity ~= schedule.current then
    schedule.current = newActivity
    core.sendGlobalEvent('NPCMod_ActivityChange', {
      npc = self.object,
      activity = newActivity
    })
  end
end, time.hour * 0.5, { type = time.GameTime })

local function onSave() return schedule end
local function onLoad(data) if data then schedule = data end end

return {
  engineHandlers = { onSave = onSave, onLoad = onLoad },
  eventHandlers = {
    NPCMod_GoTo = function(data)
      I.AI.startPackage({
        type = 'Travel',
        destPosition = data.position
      })
    end,
  },
}`
      },
      {
        title: "Faction Reputation Handler (Global Script)",
        context: "global",
        code: `-- scripts/NPCMod/global.lua
local world = require('openmw.world')
local core = require('openmw.core')

local factionState = {}

return {
  engineHandlers = {
    onSave = function() return { factions = factionState } end,
    onLoad = function(data) if data then factionState = data.factions end end,
  },
  eventHandlers = {
    NPCMod_ActivityChange = function(data)
      local activity = data.activity
      local pos = getLocationForActivity(data.npc, activity)
      data.npc:sendEvent('NPCMod_GoTo', { position = pos })
    end,
    NPCMod_FactionAction = function(data)
      -- Modify faction relationships
      factionState[data.faction] = factionState[data.faction] or { reputation = 0 }
      factionState[data.faction].reputation = 
        factionState[data.faction].reputation + data.change
    end,
  },
}`
      }
    ],
    docLinks: [
      `${DOCS_BASE}/openmw_types.html#NPC`,
      `${DOCS_BASE}/openmw_core.html#factions`,
      `${DOCS_BASE}/interfaces.html#AI`
    ]
  },
  quests: {
    name: "Quest Structures",
    themes: ["quests", "exploration"],
    scriptContext: "global",
    apis: [
      "core.dialogue.journal - Quest journal access",
      "core.sendGlobalEvent - Trigger world events",
      "object:sendEvent - Notify specific objects",
      "async:registerTimerCallback - Delayed quest stages",
      "onSave/onLoad - Persist quest state"
    ],
    examples: [
      {
        title: "Multi-Stage Quest (Global Script)",
        context: "global",
        code: `-- scripts/QuestMod/global.lua
local world = require('openmw.world')
local core = require('openmw.core')
local async = require('openmw.async')

local questState = {
  stage = 0,
  objectivesComplete = {},
  npcSpawned = false
}

local QUEST_ID = 'my_epic_quest'

local function updateJournal(stage)
  -- Journal updates handled through game data
  questState.stage = stage
end

local delayedStageCallback = async:registerTimerCallback('quest_next_stage',
  function(data)
    updateJournal(data.nextStage)
    if data.spawnNpc then
      local npc = world.createObject(data.spawnNpc, 1)
      world.players[1]:sendEvent('QuestMod_ShowMessage', {
        text = 'A mysterious figure has appeared...'
      })
    end
  end
)

return {
  engineHandlers = {
    onSave = function() return { version = 1, quest = questState } end,
    onLoad = function(data)
      if data and data.version == 1 then
        questState = data.quest
      end
    end,
  },
  eventHandlers = {
    QuestMod_ObjectiveComplete = function(data)
      questState.objectivesComplete[data.objectiveId] = true
      
      -- Check if all objectives done
      local allDone = checkAllObjectives(questState.objectivesComplete)
      if allDone then
        -- Delayed stage advancement
        async:newSimulationTimer(5, delayedStageCallback, {
          nextStage = questState.stage + 1,
          spawnNpc = 'quest_reward_npc'
        })
      end
    end,
    QuestMod_StartQuest = function(data)
      if questState.stage == 0 then
        updateJournal(1)
        -- Notify player script to show HUD
        world.players[1]:sendEvent('QuestMod_ShowQuestHUD', {
          title = 'The Dark Ritual'
        })
      end
    end,
  },
}`
      },
      {
        title: "Quest Trigger (Local Script)",
        context: "local",
        code: `-- scripts/QuestMod/trigger.lua
local self = require('openmw.self')
local core = require('openmw.core')
local types = require('openmw.types')

local triggered = false

local function onActivated(actor)
  if triggered then return end
  
  if actor.type == types.Player then
    triggered = true
    core.sendGlobalEvent('QuestMod_ObjectiveComplete', {
      objectiveId = self.object.recordId,
      player = actor
    })
    -- Visual feedback
    actor:sendEvent('QuestMod_ShowMessage', {
      text = 'Objective Complete!'
    })
  end
end

return {
  engineHandlers = {
    onActivated = onActivated,
    onSave = function() return { triggered = triggered } end,
    onLoad = function(data) if data then triggered = data.triggered end end,
  },
}`
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
    scriptContext: "local",
    apis: [
      "types.Actor.inventory(actor) - Inventory management",
      "types.Item.itemData - Item data modification",
      "types.Actor.getBarterGold(actor) - Merchant gold",
      "world.createObject - Create new items",
      "openmw.interfaces.Activation - Custom activation"
    ],
    examples: [
      {
        title: "Crafting Station (Local Script)",
        context: "local",
        code: `-- scripts/CraftMod/crafting_station.lua
local self = require('openmw.self')
local core = require('openmw.core')
local types = require('openmw.types')
local nearby = require('openmw.nearby')

local RECIPES = {
  iron_sword = {
    ingredients = { iron_ingot = 2, leather_strip = 1 },
    result = 'crafted_iron_sword',
    skill = 25
  },
  steel_armor = {
    ingredients = { steel_ingot = 4, leather = 2 },
    result = 'crafted_steel_cuirass',
    skill = 50
  }
}

local function countItem(inv, recordId)
  local count = 0
  for _, item in ipairs(inv:getAll()) do
    if item.recordId == recordId then
      count = count + 1
    end
  end
  return count
end

local function canCraft(player, recipeId)
  local recipe = RECIPES[recipeId]
  if not recipe then return false end
  
  local inv = types.Actor.inventory(player)
  for itemId, needed in pairs(recipe.ingredients) do
    if countItem(inv, itemId) < needed then
      return false
    end
  end
  return true
end

local function onActivated(actor)
  if actor.type ~= types.Player then return end
  
  -- Send available recipes to player UI
  local available = {}
  for id, recipe in pairs(RECIPES) do
    available[id] = canCraft(actor, id)
  end
  
  actor:sendEvent('CraftMod_OpenStation', {
    station = self.object,
    recipes = available
  })
end

return {
  engineHandlers = { onActivated = onActivated },
  eventHandlers = {
    CraftMod_DoCraft = function(data)
      if not canCraft(data.player, data.recipeId) then return end
      
      local recipe = RECIPES[data.recipeId]
      local inv = types.Actor.inventory(data.player)
      
      -- Remove ingredients by finding and removing items
      for itemId, needed in pairs(recipe.ingredients) do
        local removed = 0
        for _, item in ipairs(inv:getAll()) do
          if item.recordId == itemId and removed < needed then
            item:remove()
            removed = removed + 1
          end
        end
      end
      
      -- Request global script to create item
      core.sendGlobalEvent('CraftMod_CreateItem', {
        player = data.player,
        itemId = recipe.result
      })
    end,
  },
}`
      },
      {
        title: "Crafting Global Coordinator",
        context: "global",
        code: `-- scripts/CraftMod/global.lua
local world = require('openmw.world')
local types = require('openmw.types')

return {
  eventHandlers = {
    CraftMod_CreateItem = function(data)
      -- Create item and move it into player inventory
      local item = world.createObject(data.itemId, 1)
      item:moveInto(types.Actor.inventory(data.player))
      
      -- Get item name from correct type record
      local itemName = data.itemId  -- Fallback
      if item.type == types.Weapon then
        itemName = types.Weapon.record(item).name
      elseif item.type == types.Armor then
        itemName = types.Armor.record(item).name
      elseif item.type == types.Clothing then
        itemName = types.Clothing.record(item).name
      elseif item.type == types.Potion then
        itemName = types.Potion.record(item).name
      end
      
      data.player:sendEvent('CraftMod_CraftSuccess', {
        itemName = itemName
      })
    end,
  },
}`
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
    scriptContext: "local",
    apis: [
      "types.Weapon.record - Weapon stats access",
      "types.Armor.record - Armor stats access",
      "types.Actor.getEquipment - Equipment slots",
      "types.Actor.stats.dynamic - Health, fatigue",
      "openmw.interfaces.Combat - Combat state"
    ],
    examples: [
      {
        title: "Artifact Weapon Effect (Local Script)",
        context: "local",
        code: `-- scripts/ArtifactMod/weapon.lua
local self = require('openmw.self')
local types = require('openmw.types')
local core = require('openmw.core')
local nearby = require('openmw.nearby')
local time = require('openmw_aux.time')

local ARTIFACT_ID = 'daedric_soul_blade'
local chargeState = { current = 100, max = 100 }

local function isEquipped()
  local equipment = types.Actor.getEquipment(self.object)
  local weapon = equipment[types.Actor.EQUIPMENT_SLOT.CarriedRight]
  return weapon and weapon.recordId == ARTIFACT_ID
end

-- Passive effect while equipped
local passiveCheck = time.runRepeatedly(function()
  if not isEquipped() then return end
  
  -- Drain nearby enemies using ipairs for nearby.actors list
  for _, actor in ipairs(nearby.actors) do
    if actor ~= self.object then
      local dist = (actor.position - self.object.position):length()
      if dist < 500 then
        actor:sendEvent('ArtifactMod_SoulDrain', { 
          amount = 5,
          source = self.object 
        })
        chargeState.current = math.min(chargeState.max, chargeState.current + 1)
      end
    end
  end
end, time.second * 5, { type = time.SimulationTime })

return {
  engineHandlers = {
    onSave = function() return chargeState end,
    onLoad = function(data) if data then chargeState = data end end,
  },
  eventHandlers = {
    ArtifactMod_SoulDrain = function(data)
      local health = types.Actor.stats.dynamic.health(self.object)
      health.current = math.max(1, health.current - data.amount)
    end,
  },
}`
      },
      {
        title: "Combat Enhancement (Player Script)",
        context: "player",
        code: `-- scripts/CombatMod/player.lua
local self = require('openmw.self')
local types = require('openmw.types')
local ui = require('openmw.ui')
local I = require('openmw.interfaces')
local time = require('openmw_aux.time')

local combatState = {
  combo = 0,
  lastHitTime = 0
}

local comboDisplay = nil

local function updateComboUI()
  if comboDisplay then
    if combatState.combo > 0 then
      comboDisplay.layout.props.text = 'Combo: x' .. combatState.combo
      comboDisplay:update()
    end
  end
end

local function onInit()
  comboDisplay = ui.create({
    layer = 'HUD',
    template = ui.templates.textNormal,
    props = { text = '' }
  })
end

-- Track combat hits via event from global
return {
  engineHandlers = { onInit = onInit },
  eventHandlers = {
    CombatMod_HitLanded = function(data)
      local now = core.getSimulationTime()
      if now - combatState.lastHitTime < 2 then
        combatState.combo = combatState.combo + 1
      else
        combatState.combo = 1
      end
      combatState.lastHitTime = now
      updateComboUI()
      
      -- Bonus damage at high combo
      if combatState.combo >= 5 then
        data.target:sendEvent('CombatMod_BonusDamage', {
          amount = combatState.combo * 5
        })
      end
    end,
  },
}`
      }
    ],
    docLinks: [
      `${DOCS_BASE}/openmw_types.html#Weapon`,
      `${DOCS_BASE}/openmw_types.html#Armor`,
      `${DOCS_BASE}/interfaces.html#Combat`
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
    categoryContext += `\n### ${template.name} (${template.scriptContext} script context)\n`;
    categoryContext += `APIs:\n${template.apis.map(api => `- ${api}`).join('\n')}\n`;
    for (const example of template.examples) {
      categoryContext += `\n**${example.title} (${example.context} script):**\n\`\`\`lua\n${example.code}\n\`\`\`\n`;
    }
    categoryContext += `Docs: ${template.docLinks.join(', ')}\n`;
  }

  // Build script context reference
  let scriptContextRef = "\n## Script Contexts:\n";
  for (const [key, ctx] of Object.entries(SCRIPT_CONTEXT_TEMPLATES)) {
    const flag = 'omwscriptsFlag' in ctx ? ctx.omwscriptsFlag : (ctx as any).omwscriptsFlags?.join(', ');
    scriptContextRef += `\n### ${ctx.name} (${flag})\n`;
    scriptContextRef += `${ctx.description}\n`;
    scriptContextRef += `Access: ${ctx.access.join(', ')}\n`;
  }

  // Build interface reference
  let interfaceRef = "\n## Interfaces:\n";
  for (const iface of Object.values(INTERFACE_TEMPLATES)) {
    interfaceRef += `\n**${iface.title}:** ${iface.description}\n`;
  }

  // Build event reference
  let eventRef = "\n## Events:\n";
  for (const evt of Object.values(EVENT_TEMPLATES)) {
    eventRef += `\n**${evt.title}:** ${evt.description}\n`;
  }

  // Build multi-stage reference
  let multiStageRef = "\n## Multi-Stage Patterns:\n";
  for (const pattern of Object.values(MULTI_STAGE_TEMPLATES)) {
    multiStageRef += `\n**${pattern.title}:** ${pattern.description}\n`;
  }

  return `You are a creative mod idea generator for OpenMW (Morrowind). Generate unique, immersive, and lore-friendly mod ideas with REAL, WORKING OpenMW Lua code examples that use proper script contexts, interfaces, and events.

Your responses must be valid JSON with this exact structure:
{
  "title": "Creative mod title using archaic/medieval language",
  "description": "2-3 sentence immersive description of the mod concept",
  "features": ["Feature 1", "Feature 2", "Feature 3", "Feature 4"],
  "implementationHints": [
    {
      "title": "Implementation aspect title",
      "scriptContext": "global|local|player",
      "description": "How to implement with proper script context",
      "luaExample": "-- Working code with onSave/onLoad, events, interfaces",
      "docLink": "https://openmw.readthedocs.io/en/latest/reference/lua-scripting/..."
    }
  ],
  "omwscriptsExample": "# ModName.omwscripts\\nGLOBAL: scripts/ModName/global.lua\\nPLAYER: scripts/ModName/player.lua",
  "tags": ["tag1", "tag2"]
}

## Core Modules & Documented APIs:

### openmw.types (Actor/NPC/Item access)
- types.Actor.inventory(actor) → Inventory object with :getAll(), :getAll(type), :find(recordId)
- types.Actor.stats.dynamic.health/magicka/fatigue(actor) → { current, base } (writable)
- types.Actor.stats.attributes.strength/intelligence/etc(actor) → stat object
- types.Actor.activeEffects(actor) → ActiveEffects with :getEffect(effectId) method
- types.Actor.getEquipment(actor) → table keyed by types.Actor.EQUIPMENT_SLOT.*
- types.Actor.EQUIPMENT_SLOT.CarriedRight/CarriedLeft/Cuirass/etc - equipment slot constants
- types.Weapon.record(obj), types.Armor.record(obj), types.NPC.record(obj) - get record data
- types.Player, types.NPC, types.Creature - type checking constants

### openmw.world (GLOBAL scripts only)
- world.createObject(recordId, count) → GameObject (must then :moveInto or :teleport)
- world.activeActors → list of active actors (iterate with ipairs)
- world.players → list of players
- world.getCellByName(name), world.getExteriorCell(x, y) → Cell access

### openmw.self (LOCAL scripts only)
- self.object → the GameObject this script is attached to
- self.object.position, self.object.rotation, self.object.cell

### openmw.nearby (LOCAL scripts only)
- nearby.actors → ObjectList (iterate with ipairs, NOT pairs)
- nearby.players → ObjectList
- nearby.items, nearby.containers, nearby.doors

### Inventory Operations:
- inv:getAll() → all items, inv:getAll(types.Weapon) → weapons only
- item:moveInto(inventory) → move item to inventory
- item:remove() → destroy item
- To count items: iterate inv:getAll() and count matching recordIds

### openmw.async (Timers)
- async:registerTimerCallback(name, func) → callback (register at script load)
- async:newSimulationTimer(seconds, callback, data) → game-time timer
- async:newGameTimer(seconds, callback, data) → real-time timer
- async:newUnsavableGameTimer(seconds, callback, data) → non-persistent timer

### openmw_aux.time (Repeating timers)
- time.runRepeatedly(func, interval, options) → returns stop function
- time.hour, time.day, time.second - time constants
- { type = time.GameTime } or { type = time.SimulationTime }

### openmw.interfaces (Built-in interfaces)
- I.AI.startPackage({type='Travel', destPosition=vec3})
- I.Combat.isInCombat(actor)
- I.Controls.overrideMovementInput(enabled)
- I.Camera.setMode(mode), I.Activation.addHandler(func)

${scriptContextRef}
${interfaceRef}
${eventRef}
${multiStageRef}

## Category-Specific Patterns:
${categoryContext}

## CRITICAL Requirements:
1. **Script Context**: ALWAYS specify which script context (Global/Local/Player) each code belongs to
2. **Events**: Use core.sendGlobalEvent for Local→Global, object:sendEvent for Global→Local or Local→Local
3. **Persistence**: Include onSave/onLoad handlers for any stateful scripts
4. **Interfaces**: Use openmw.interfaces for AI control, combat checks, camera/controls
5. **Timers**: Use async:registerTimerCallback for save-safe timers
6. **File Structure**: Include .omwscripts file showing script registration

## .omwscripts Example Patterns:
\`\`\`
${OMWSCRIPTS_PATTERNS.complexMod}
\`\`\`

## Communication Flow:
Player activates object → Local script sends global event →
Global script updates world state → Sends event back to actors →
Actors react via local scripts → Player script updates HUD

Tags must be from: magic, kingdoms, dragons, quests, crafting, combat, economy, exploration, necromancy, alchemy, guilds, artifacts`;
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
      simple: "a simple tweak or small addition (1-2 scripts, minimal new content). Focus on one specific mechanic with proper script context.",
      'quest-mod': "a medium-sized quest mod with a storyline (global + player + NPC scripts, quest stages). Include event-based communication between scripts.",
      overhaul: "a comprehensive overhaul that changes core systems (multiple script contexts, interfaces, complex event flows). Include full .omwscripts example and multi-stage patterns."
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

IMPORTANT:
- Specify which script context (Global/Local/Player) each code example belongs to
- Show how scripts communicate via events (core.sendGlobalEvent, object:sendEvent)
- Include onSave/onLoad for state persistence
- Include a complete .omwscripts file example`;
    } else {
      const themeContext = getRelevantTemplates(selectedThemes);
      const themeNames = themeContext.map(t => t.name).join(', ');
      
      userPrompt = `Generate an OpenMW mod idea for a ${gameType || 'rpg'} playstyle with these themes: ${selectedThemes.join(', ')}.
Focus on these modding categories: ${themeNames}
The complexity should be: ${complexityDescriptions[complexity as keyof typeof complexityDescriptions] || complexityDescriptions['quest-mod']}.
${customNotes ? `Additional inspiration/notes from the user: ${customNotes}` : ''}

CRITICAL REQUIREMENTS:
- Each implementation hint MUST specify its scriptContext: "global", "local", or "player"
- Show proper event communication between scripts
- Include onSave/onLoad handlers for persistent state
- Use openmw.interfaces where appropriate (AI, Combat, etc.)
- Include a complete .omwscripts example showing file registration
- For complex mods, show the communication flow between script types`;
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
      let jsonStr = content;
      
      const codeBlockMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (codeBlockMatch) {
        jsonStr = codeBlockMatch[1].trim();
      } else {
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