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
      "types.Player.quests(player)[questId]:addJournalEntry(stage, actor) - Quest journal updates",
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
  if key.symbol == 'j' and key.withAlt then
    -- Toggle custom journal (key.withAlt, key.withShift, key.withCtrl)
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
local camera = require('openmw.camera')

-- AI Interface - control NPC behavior packages (LOCAL scripts only)
I.AI.startPackage({
  type = 'Travel',
  destPosition = util.vector3(1000, 2000, 100)
})
local pkg = I.AI.getActivePackage()  -- Get current AI package
local combatTarget = I.AI.getActiveTarget('Combat')  -- nil if not in combat

-- Combat detection pattern (no I.Combat.isInCombat - use AI package check)
local isInCombat = pkg and pkg.type == 'Combat'

-- Controls Interface (PLAYER scripts only)
I.Controls.overrideMovementControls(true)  -- Disable player movement
I.Controls.overrideCombatControls(true)  -- Disable combat controls

-- Camera - use openmw.camera module, not I.Camera
camera.setMode(camera.MODE.ThirdPerson)
I.Camera.disableZoom(true)  -- Interface for disabling controls

-- Activation Interface (handler signature: object, actor)
I.Activation.addHandlerForType(types.Door, function(object, actor)
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
      -- Update journal with actor as quest source
      local types = require('openmw.types')
      local player = world.players[1]
      types.Player.quests(player)[data.questId]:addJournalEntry(100, data.actor)
      spawnReward(player)
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
      "types.Player.quests(player)[questId]:addJournalEntry(stage, actor) - Quest journal updates",
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

local function updateJournal(stage, actor)
  -- Use correct OpenMW API for journal entries
  local types = require('openmw.types')
  local player = world.players[1]
  types.Player.quests(player)[QUEST_ID]:addJournalEntry(stage, actor)
  questState.stage = stage
end

local delayedStageCallback = async:registerTimerCallback('quest_next_stage',
  function(data)
    updateJournal(data.nextStage, data.actor)
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
          spawnNpc = 'quest_reward_npc',
          actor = data.actor
        })
      end
    end,
    QuestMod_StartQuest = function(data)
      if questState.stage == 0 then
        updateJournal(1, data.questGiver)
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
  },
  // NEW CATEGORIES
  uiHud: {
    name: "UI & HUD Systems",
    themes: ["ui", "hud", "menus"],
    scriptContext: "player",
    apis: [
      "openmw.ui - Create HUD elements, windows, templates",
      "ui.create(layout) - Create UI element",
      "ui.TYPE.Widget/Text/Image - UI element types",
      "ui.layers - HUD, Windows, Notification layers",
      "ui.templates - Built-in UI templates",
      "openmw.util.vector2 - Position and size",
      "openmw.util.color - Color manipulation"
    ],
    examples: [
      {
        title: "Custom Health Bar HUD (Player Script)",
        context: "player",
        code: `-- scripts/HudMod/player.lua
local ui = require('openmw.ui')
local util = require('openmw.util')
local types = require('openmw.types')
local self = require('openmw.self')
local time = require('openmw_aux.time')

local hudElement = nil

local function createHealthBar()
  hudElement = ui.create({
    layer = 'HUD',
    type = ui.TYPE.Widget,
    props = {
      relativePosition = util.vector2(0.05, 0.9),
      size = util.vector2(200, 24),
    },
    content = ui.content({
      {
        name = 'background',
        type = ui.TYPE.Widget,
        props = {
          size = util.vector2(200, 24),
          resource = ui.WIDGET_BACKGROUND.Segment,
          backgroundColor = util.color.rgb(0.2, 0.2, 0.2),
        },
      },
      {
        name = 'bar',
        type = ui.TYPE.Widget,
        props = {
          size = util.vector2(200, 24),
          resource = ui.WIDGET_BACKGROUND.Segment,
          backgroundColor = util.color.rgb(0.8, 0.2, 0.2),
        },
      },
      {
        name = 'text',
        type = ui.TYPE.Text,
        props = {
          relativePosition = util.vector2(0.5, 0.5),
          anchor = util.vector2(0.5, 0.5),
          text = '100%',
          textColor = util.color.rgb(1, 1, 1),
        },
      },
    }),
  })
end

local function updateBar()
  if not hudElement then return end
  local health = types.Actor.stats.dynamic.health(self.object)
  local percent = health.current / health.base
  hudElement.layout.content['bar'].props.size = util.vector2(200 * percent, 24)
  hudElement.layout.content['text'].props.text = math.floor(percent * 100) .. '%'
  hudElement:update()
end

local stopUpdate = time.runRepeatedly(updateBar, 0.1 * time.second, { type = time.SimulationTime })

return {
  engineHandlers = {
    onActive = createHealthBar,
    onInactive = function() 
      if hudElement then hudElement:destroy() end 
      if stopUpdate then stopUpdate() end
    end,
  },
}`
      },
      {
        title: "Custom Menu Window (Player Script)",
        context: "player",
        code: `-- scripts/MenuMod/player.lua
local ui = require('openmw.ui')
local util = require('openmw.util')
local input = require('openmw.input')
local I = require('openmw.interfaces')

local menuWindow = nil
local menuOpen = false

local function createMenu()
  menuWindow = ui.create({
    layer = 'Windows',
    type = ui.TYPE.Widget,
    props = {
      position = util.vector2(300, 200),
      size = util.vector2(400, 300),
      visible = false,
    },
    content = ui.content({
      {
        type = ui.TYPE.Widget,
        props = {
          size = util.vector2(400, 300),
          resource = ui.WIDGET_BACKGROUND.Panel,
        },
      },
      {
        type = ui.TYPE.Text,
        props = {
          relativePosition = util.vector2(0.5, 0.1),
          anchor = util.vector2(0.5, 0.5),
          text = 'Custom Menu',
          textSize = 24,
          textColor = util.color.rgb(1, 0.8, 0.2),
        },
      },
    }),
  })
end

local function toggleMenu()
  menuOpen = not menuOpen
  menuWindow.layout.props.visible = menuOpen
  menuWindow:update()
  I.Controls.overrideMovementControls(menuOpen)  -- Correct method name
end

local function onKeyPress(key)
  if key.symbol == 'm' and key.withAlt then  -- Use key.withAlt not input.isAltPressed()
    toggleMenu()
  end
end

return {
  engineHandlers = {
    onInit = createMenu,
    onKeyPress = onKeyPress,
  },
}`
      }
    ],
    docLinks: [
      `${DOCS_BASE}/openmw_ui.html`,
      `${DOCS_BASE}/openmw_util.html`
    ]
  },
  soundAmbience: {
    name: "Sound & Ambience",
    themes: ["sounds", "ambience", "music"],
    scriptContext: "local",
    apis: [
      "core.sound.playSound3d(soundId, object, options) - Play 3D sound",
      "core.sound.playSound(soundId, options) - Play 2D sound",
      "core.sound.stopSound(soundId, object) - Stop playing sound",
      "core.sound.isSoundPlaying(soundId, object) - Check if sound playing",
      "core.sound.say(fileName, object) - Play voice file"
    ],
    examples: [
      {
        title: "Ambient Sound Zone (Local Script)",
        context: "local",
        code: `-- scripts/AmbientMod/zone.lua
local self = require('openmw.self')
local core = require('openmw.core')
local nearby = require('openmw.nearby')
local time = require('openmw_aux.time')

local AMBIENT_SOUND = 'waterfall_loop'
local RANGE = 2000

local isPlaying = false

local function checkPlayerDistance()
  for _, player in ipairs(nearby.players) do
    local dist = (player.position - self.object.position):length()
    
    if dist < RANGE and not isPlaying then
      core.sound.playSound3d(AMBIENT_SOUND, self.object, {
        loop = true,
        volume = 1.0,
        pitch = 1.0
      })
      isPlaying = true
    elseif dist >= RANGE and isPlaying then
      core.sound.stopSound(AMBIENT_SOUND, self.object)
      isPlaying = false
    end
  end
end

time.runRepeatedly(checkPlayerDistance, time.second, { type = time.SimulationTime })

return {
  engineHandlers = {
    onInactive = function()
      if isPlaying then
        core.sound.stopSound(AMBIENT_SOUND, self.object)
        isPlaying = false
      end
    end,
  },
}`
      },
      {
        title: "Dynamic Music System (Player Script)",
        context: "player",
        code: `-- scripts/MusicMod/player.lua
local self = require('openmw.self')
local core = require('openmw.core')
local I = require('openmw.interfaces')
local time = require('openmw_aux.time')

local musicState = {
  currentTrack = 'explore',
  inCombat = false
}

local function updateMusicState()
  local wasInCombat = musicState.inCombat
  -- Check combat via AI package (I.Combat.isInCombat doesn't exist)
  local pkg = I.AI and I.AI.getActivePackage()
  musicState.inCombat = pkg and pkg.type == 'Combat' or false
  
  if musicState.inCombat and not wasInCombat then
    musicState.currentTrack = 'combat'
    core.sendGlobalEvent('MusicMod_TrackChange', { track = 'combat' })
  elseif not musicState.inCombat and wasInCombat then
    musicState.currentTrack = 'explore'
    core.sendGlobalEvent('MusicMod_TrackChange', { track = 'explore' })
  end
end

time.runRepeatedly(updateMusicState, time.second * 2, { type = time.SimulationTime })

return {
  engineHandlers = {
    onSave = function() return musicState end,
    onLoad = function(data) if data then musicState = data end end,
  },
}`
      }
    ],
    docLinks: [
      `${DOCS_BASE}/openmw_core.html#sound`
    ]
  },
  vfxAnimation: {
    name: "Visual Effects & Animation",
    themes: ["vfx", "animation"],
    scriptContext: "local",
    apis: [
      "openmw.animation.playQueued(object, group, opts) - Queue animation",
      "openmw.animation.playBlended(object, group, opts) - Blend animation",
      "openmw.animation.hasAnimation(object, group) - Check if animation exists",
      "openmw.animation.getActiveGroup(object, boneGroup) - Get current animation",
      "openmw.animation.clearAnimationQueue(object) - Clear queued animations",
      "core.vfx.spawn(staticId, position) - Spawn visual effect"
    ],
    examples: [
      {
        title: "Custom Animation Controller (Local Script)",
        context: "local",
        code: `-- scripts/AnimMod/npc.lua
local self = require('openmw.self')
local anim = require('openmw.animation')
local core = require('openmw.core')
local time = require('openmw_aux.time')

local animState = {
  customIdle = false,
  currentAnim = nil
}

local function playCustomIdle()
  if anim.hasAnimation(self.object, 'idle_custom') then
    anim.playQueued(self.object, 'idle_custom', {
      loops = 0,  -- 0 = infinite
      speed = 1.0,
      priority = anim.PRIORITY.Default,
      blendMask = anim.BLEND_MASK.All,
      startKey = 'start',
      stopKey = 'stop',
      autoDisable = false
    })
    animState.customIdle = true
    animState.currentAnim = 'idle_custom'
  end
end

local function playEmote(emoteName)
  local animGroup = 'emote_' .. emoteName
  if anim.hasAnimation(self.object, animGroup) then
    anim.playBlended(self.object, animGroup, {
      loops = 1,
      speed = 1.0,
      priority = anim.PRIORITY.Scripted,
    })
  end
end

return {
  engineHandlers = {
    onActive = function()
      time.runRepeatedly(function()
        local active = anim.getActiveGroup(self.object, anim.BONE_GROUP.UpperBody)
        if not active or active == 'idle' then
          playCustomIdle()
        end
      end, time.second * 5, { type = time.SimulationTime })
    end,
  },
  eventHandlers = {
    AnimMod_PlayEmote = function(data)
      playEmote(data.emote)
    end,
  },
}`
      },
      {
        title: "VFX Spawner (Global Script)",
        context: "global",
        code: `-- scripts/VFXMod/global.lua
local world = require('openmw.world')
local core = require('openmw.core')
local vfx = require('openmw.vfx')

return {
  eventHandlers = {
    VFXMod_SpawnEffect = function(data)
      -- Spawn visual effect at position
      vfx.spawn('vfx_' .. data.effectType, data.position)
      
      -- Also affect nearby actors with visual notification
      for _, actor in ipairs(world.activeActors) do
        local dist = (actor.position - data.position):length()
        if dist < data.radius then
          actor:sendEvent('VFXMod_EffectHit', {
            effectType = data.effectType,
            intensity = 1 - (dist / data.radius)
          })
        end
      end
    end,
    VFXMod_TrailEffect = function(data)
      -- Spawn trail of effects between two points
      local start = data.startPos
      local endPos = data.endPos
      local steps = math.floor((endPos - start):length() / 100)
      
      for i = 0, steps do
        local t = i / steps
        local pos = start + (endPos - start) * t
        vfx.spawn('vfx_trail_spark', pos)
      end
    end,
  },
}`
      }
    ],
    docLinks: [
      `${DOCS_BASE}/openmw_animation.html`,
      `${DOCS_BASE}/openmw_vfx.html`
    ]
  },
  worldEnvironment: {
    name: "World & Environment",
    themes: ["weather", "terrain", "world"],
    scriptContext: "global",
    apis: [
      "openmw.world.activeActors - All active actors in loaded cells",
      "openmw.world.players - All players (usually just one)",
      "openmw.world.cells - Access to world cells",
      "openmw.world.getCellByName(name) - Get cell by name",
      "openmw.world.getCellById(id) - Get cell by ID",
      "openmw.world.createObject(recordId, count) - Create new objects",
      "openmw.core.getGameTime() - Current game time in seconds"
    ],
    examples: [
      {
        title: "Dynamic Weather Events (Global Script)",
        context: "global",
        code: `-- scripts/WeatherMod/global.lua
local world = require('openmw.world')
local core = require('openmw.core')
local time = require('openmw_aux.time')

local weatherState = {
  currentEvent = nil,
  eventEndTime = 0
}

local WEATHER_EVENTS = {
  ashstorm = { duration = 3600, damage = 5, interval = 10 },
  blizzard = { duration = 7200, slowdown = 0.5, interval = 5 },
  acidRain = { duration = 1800, damage = 10, interval = 15 }
}

local function startWeatherEvent(eventType)
  local event = WEATHER_EVENTS[eventType]
  if not event then return end
  
  weatherState.currentEvent = eventType
  weatherState.eventEndTime = core.getGameTime() + event.duration
  
  -- Notify all players
  for _, player in ipairs(world.players) do
    player:sendEvent('WeatherMod_EventStart', {
      eventType = eventType,
      duration = event.duration
    })
  end
end

local function updateWeather()
  if not weatherState.currentEvent then return end
  
  if core.getGameTime() >= weatherState.eventEndTime then
    for _, player in ipairs(world.players) do
      player:sendEvent('WeatherMod_EventEnd', {
        eventType = weatherState.currentEvent
      })
    end
    weatherState.currentEvent = nil
    return
  end
  
  -- Apply effects to active actors
  local event = WEATHER_EVENTS[weatherState.currentEvent]
  if event.damage then
    for _, actor in ipairs(world.activeActors) do
      actor:sendEvent('WeatherMod_DamageOverTime', {
        damage = event.damage
      })
    end
  end
end

time.runRepeatedly(updateWeather, time.second * 10, { type = time.GameTime })

return {
  engineHandlers = {
    onSave = function() return weatherState end,
    onLoad = function(data) if data then weatherState = data end end,
  },
  eventHandlers = {
    WeatherMod_TriggerEvent = function(data)
      startWeatherEvent(data.eventType)
    end,
  },
}`
      },
      {
        title: "Region Controller (Global Script)",
        context: "global",
        code: `-- scripts/RegionMod/global.lua
local world = require('openmw.world')
local core = require('openmw.core')
local time = require('openmw_aux.time')

local regionState = {}

local function getPlayerRegion()
  local player = world.players[1]
  if player and player.cell then
    return player.cell.region
  end
  return nil
end

local function onRegionChange(newRegion)
  if not newRegion then return end
  
  -- Initialize region state if needed
  if not regionState[newRegion] then
    regionState[newRegion] = {
      visited = true,
      firstVisit = core.getGameTime(),
      visitCount = 1
    }
    
    world.players[1]:sendEvent('RegionMod_FirstVisit', {
      region = newRegion
    })
  else
    regionState[newRegion].visitCount = regionState[newRegion].visitCount + 1
  end
end

local lastRegion = nil
time.runRepeatedly(function()
  local currentRegion = getPlayerRegion()
  if currentRegion ~= lastRegion then
    onRegionChange(currentRegion)
    lastRegion = currentRegion
  end
end, time.second * 2, { type = time.SimulationTime })

return {
  engineHandlers = {
    onSave = function() return { regions = regionState, lastRegion = lastRegion } end,
    onLoad = function(data) 
      if data then 
        regionState = data.regions or {}
        lastRegion = data.lastRegion
      end 
    end,
  },
}`
      }
    ],
    docLinks: [
      `${DOCS_BASE}/openmw_world.html`,
      `${DOCS_BASE}/openmw_core.html`
    ]
  },
  cameraControls: {
    name: "Camera & Controls",
    themes: ["camera", "controls"],
    scriptContext: "player",
    apis: [
      "openmw.camera.getMode() - Get current camera mode",
      "openmw.camera.setMode(mode) - Set camera mode",
      "openmw.camera.MODE - FirstPerson, ThirdPerson, etc",
      "openmw.camera.getPosition() - Camera world position",
      "openmw.camera.getYaw/getPitch - Camera angles",
      "openmw.input.registerAction - Register custom action",
      "openmw.input.bindAction - Bind key to action",
      "openmw.input.isKeyPressed - Check if key is down"
    ],
    examples: [
      {
        title: "Cinematic Camera (Player Script)",
        context: "player",
        code: `-- scripts/CameraMod/player.lua
local camera = require('openmw.camera')
local input = require('openmw.input')
local async = require('openmw.async')
local I = require('openmw.interfaces')

local cinematicState = {
  active = false,
  savedMode = nil,
  targetPos = nil
}

local function startCinematic(targetPosition, duration)
  cinematicState.active = true
  cinematicState.savedMode = camera.getMode()
  cinematicState.targetPos = targetPosition
  
  -- Disable player controls (correct method names)
  I.Controls.overrideMovementControls(true)
  I.Controls.overrideCombatControls(true)
  
  -- Switch to static camera (use camera module, not interface)
  camera.setMode(camera.MODE.Static)
  
  -- Schedule end of cinematic
  async:newSimulationTimer(duration, 
    async:registerTimerCallback('end_cinematic', function()
      endCinematic()
    end), 
    {}
  )
end

local function endCinematic()
  cinematicState.active = false
  
  -- Restore controls (correct method names)
  I.Controls.overrideMovementControls(false)
  I.Controls.overrideCombatControls(false)
  
  -- Restore camera mode
  if cinematicState.savedMode then
    camera.setMode(cinematicState.savedMode)
  end
end

local function onKeyPress(key)
  -- Skip cinematic with Escape
  if cinematicState.active and key.symbol == 'escape' then
    endCinematic()
  end
end

return {
  engineHandlers = {
    onKeyPress = onKeyPress,
  },
  eventHandlers = {
    CameraMod_StartCinematic = function(data)
      startCinematic(data.targetPosition, data.duration)
    end,
  },
}`
      },
      {
        title: "Custom Keybinding System (Player Script)",
        context: "player",
        code: `-- scripts/ControlsMod/player.lua
local input = require('openmw.input')
local storage = require('openmw.storage')
local core = require('openmw.core')
local I = require('openmw.interfaces')

local keybinds = storage.playerSection('ControlsMod_Keybinds')

-- Register custom action
input.registerAction({
  key = 'CustomDodge',
  name = 'Dodge Roll',
  description = 'Perform a quick dodge roll',
  type = input.ACTION_TYPE.Boolean,
  defaultValue = false
})

-- Bind default key
input.bindAction('CustomDodge', function(_, active)
  if active then
    core.sendGlobalEvent('ControlsMod_Dodge', {})
  end
  return true
end, {})

local function onKeyPress(key)
  -- Check for custom modifier combinations (use key.withShift, key.withAlt, key.withCtrl)
  if key.symbol == 'space' and key.withShift then
    -- Super jump
    core.sendGlobalEvent('ControlsMod_SuperJump', {})
    return
  end
  
  if key.symbol == 'q' and key.withCtrl then
    -- Quick spell
    core.sendGlobalEvent('ControlsMod_QuickSpell', {})
    return
  end
end

return {
  engineHandlers = {
    onKeyPress = onKeyPress,
  },
}`
      }
    ],
    docLinks: [
      `${DOCS_BASE}/openmw_camera.html`,
      `${DOCS_BASE}/openmw_input.html`
    ]
  },
  storageData: {
    name: "Storage & Data",
    themes: ["data", "storage", "settings"],
    scriptContext: "global",
    apis: [
      "openmw.storage.globalSection(key) - Global persistent storage",
      "openmw.storage.playerSection(key) - Per-player storage",
      "openmw.storage.LIFE_TIME - Temporary/Persistent",
      "section:get(key) - Get stored value",
      "section:set(key, value) - Set stored value",
      "openmw.interfaces.Settings - Mod settings menu"
    ],
    examples: [
      {
        title: "Mod Settings System (Global Script)",
        context: "global",
        code: `-- scripts/SettingsMod/global.lua
local storage = require('openmw.storage')
local I = require('openmw.interfaces')

local modSettings = storage.globalSection('SettingsMod_Config')

-- Default values
local DEFAULTS = {
  difficulty = 1.0,
  enableFeatureX = true,
  spawnRate = 50,
  debugMode = false
}

local function getSetting(key)
  local value = modSettings:get(key)
  if value == nil then
    return DEFAULTS[key]
  end
  return value
end

local function setSetting(key, value)
  modSettings:set(key, value)
end

-- Register settings interface for other scripts
return {
  interfaceName = 'SettingsMod',
  interface = {
    version = 1,
    get = getSetting,
    set = setSetting,
    getAll = function()
      local result = {}
      for key, default in pairs(DEFAULTS) do
        result[key] = getSetting(key)
      end
      return result
    end,
  },
  engineHandlers = {
    onLoad = function(data)
      -- Migration from old save format if needed
      if data and data.version == 0 then
        for k, v in pairs(data.settings or {}) do
          modSettings:set(k, v)
        end
      end
    end,
  },
}`
      },
      {
        title: "Player Progress Tracker (Player Script)",
        context: "player",
        code: `-- scripts/ProgressMod/player.lua
local storage = require('openmw.storage')
local self = require('openmw.self')
local types = require('openmw.types')
local core = require('openmw.core')
local time = require('openmw_aux.time')

local playerStats = storage.playerSection('ProgressMod_Stats')

local function initStats()
  if not playerStats:get('initialized') then
    playerStats:set('initialized', true)
    playerStats:set('killCount', 0)
    playerStats:set('questsComplete', 0)
    playerStats:set('distanceTraveled', 0)
    playerStats:set('goldEarned', 0)
    playerStats:set('playTime', 0)
    playerStats:set('lastPosition', nil)
  end
end

local function trackDistance()
  local currentPos = self.object.position
  local lastPos = playerStats:get('lastPosition')
  
  if lastPos then
    local dist = (currentPos - lastPos):length()
    if dist > 10 and dist < 10000 then  -- Ignore teleports
      local total = playerStats:get('distanceTraveled') or 0
      playerStats:set('distanceTraveled', total + dist)
    end
  end
  
  playerStats:set('lastPosition', currentPos)
end

local function trackPlayTime()
  local playTime = playerStats:get('playTime') or 0
  playerStats:set('playTime', playTime + 1)
end

time.runRepeatedly(trackDistance, time.second * 5, { type = time.SimulationTime })
time.runRepeatedly(trackPlayTime, time.second * 60, { type = time.SimulationTime })

return {
  engineHandlers = {
    onActive = initStats,
  },
  eventHandlers = {
    ProgressMod_AddKill = function(data)
      local kills = playerStats:get('killCount') or 0
      playerStats:set('killCount', kills + 1)
    end,
    ProgressMod_QuestComplete = function(data)
      local quests = playerStats:get('questsComplete') or 0
      playerStats:set('questsComplete', quests + 1)
    end,
  },
}`
      }
    ],
    docLinks: [
      `${DOCS_BASE}/openmw_storage.html`,
      `${DOCS_BASE}/interfaces.html#Settings`
    ]
  },
  stealthSneaking: {
    name: "Stealth & Sneaking",
    themes: ["stealth", "sneaking"],
    scriptContext: "local",
    apis: [
      "types.Actor.stats.dynamic - Health, magicka, fatigue",
      "types.Actor.stats.ai - Alarm, fight, flee, hello",
      "types.Actor.isSneaking(actor) - Check sneak state",
      "nearby.actors - Detect nearby NPCs",
      "openmw.interfaces.AI - Control detection behavior"
    ],
    examples: [
      {
        title: "Stealth Detection System (Local Script)",
        context: "local",
        code: `-- scripts/StealthMod/npc.lua
local self = require('openmw.self')
local types = require('openmw.types')
local nearby = require('openmw.nearby')
local core = require('openmw.core')
local time = require('openmw_aux.time')

local detectionState = {
  awareness = 0,
  lastKnownPlayerPos = nil,
  isSearching = false
}

local DETECTION_THRESHOLD = 100
local AWARENESS_DECAY = 5

local function calculateDetection(player)
  local distance = (player.position - self.object.position):length()
  local isSneaking = types.Actor.isSneaking(player)
  
  -- Base detection from distance
  local detection = math.max(0, 1000 - distance) / 10
  
  -- Reduce if player is sneaking
  if isSneaking then
    detection = detection * 0.3
  end
  
  -- Light level would affect this too
  -- Armor weight affects sneak sound
  
  return detection
end

local function updateDetection()
  local awareness = detectionState.awareness
  
  for _, player in ipairs(nearby.players) do
    local detection = calculateDetection(player)
    awareness = awareness + detection
    
    if awareness >= DETECTION_THRESHOLD then
      -- Player detected!
      detectionState.lastKnownPlayerPos = player.position
      detectionState.isSearching = true
      
      core.sendGlobalEvent('StealthMod_PlayerDetected', {
        npc = self.object,
        player = player
      })
      
      -- Alert nearby guards
      for _, actor in ipairs(nearby.actors) do
        if actor ~= self.object then
          actor:sendEvent('StealthMod_AlertNearby', {
            source = self.object,
            targetPos = player.position
          })
        end
      end
    end
  end
  
  -- Decay awareness over time
  detectionState.awareness = math.max(0, awareness - AWARENESS_DECAY)
end

time.runRepeatedly(updateDetection, time.second, { type = time.SimulationTime })

return {
  engineHandlers = {
    onSave = function() return detectionState end,
    onLoad = function(data) if data then detectionState = data end end,
  },
  eventHandlers = {
    StealthMod_AlertNearby = function(data)
      detectionState.awareness = detectionState.awareness + 30
      detectionState.lastKnownPlayerPos = data.targetPos
    end,
  },
}`
      },
      {
        title: "Assassination System (Player Script)",
        context: "player",
        code: `-- scripts/StealthMod/player.lua
local self = require('openmw.self')
local types = require('openmw.types')
local nearby = require('openmw.nearby')
local core = require('openmw.core')
local ui = require('openmw.ui')
local util = require('openmw.util')

local stealthHUD = nil
local canAssassinate = false
local targetActor = nil

local function createStealthHUD()
  stealthHUD = ui.create({
    layer = 'HUD',
    type = ui.TYPE.Text,
    props = {
      relativePosition = util.vector2(0.5, 0.8),
      anchor = util.vector2(0.5, 0.5),
      text = '',
      textColor = util.color.rgb(0.8, 0.2, 0.2),
      visible = false
    }
  })
end

local function checkAssassinationTarget()
  if not types.Actor.isSneaking(self.object) then
    canAssassinate = false
    targetActor = nil
    return
  end
  
  -- Find closest unaware enemy behind player
  local bestTarget = nil
  local bestDist = 200  -- Max assassination range
  
  for _, actor in ipairs(nearby.actors) do
    if actor ~= self.object then
      local toActor = actor.position - self.object.position
      local dist = toActor:length()
      
      if dist < bestDist then
        -- Check if we're behind them
        -- and they haven't detected us
        bestTarget = actor
        bestDist = dist
      end
    end
  end
  
  targetActor = bestTarget
  canAssassinate = bestTarget ~= nil
  
  if stealthHUD then
    stealthHUD.layout.props.visible = canAssassinate
    stealthHUD.layout.props.text = canAssassinate and '[E] Assassinate' or ''
    stealthHUD:update()
  end
end

return {
  engineHandlers = {
    onInit = createStealthHUD,
    onUpdate = checkAssassinationTarget,
  },
  eventHandlers = {
    StealthMod_DoAssassinate = function(data)
      if canAssassinate and targetActor then
        core.sendGlobalEvent('StealthMod_ExecuteAssassination', {
          player = self.object,
          target = targetActor
        })
      end
    end,
  },
}`
      }
    ],
    docLinks: [
      `${DOCS_BASE}/openmw_types.html#Actor`,
      `${DOCS_BASE}/openmw_nearby.html`
    ]
  },
  dialogueBooks: {
    name: "Dialogue & Books",
    themes: ["dialogue", "books", "lore"],
    scriptContext: "local",
    apis: [
      "core.dialogue - Dialogue system access",
      "types.Book.record(book) - Get book record data",
      "types.Book.record(book).text - Book content",
      "types.Book.record(book).skill - Skill book association",
      "object:sendEvent - Trigger dialogue events"
    ],
    examples: [
      {
        title: "Dynamic Dialogue System (Local Script)",
        context: "local",
        code: `-- scripts/DialogueMod/npc.lua
local self = require('openmw.self')
local types = require('openmw.types')
local core = require('openmw.core')
local storage = require('openmw.storage')

local dialogueState = storage.globalSection('DialogueMod_State')

local function getRelationship(player)
  local key = self.object.recordId .. '_' .. 'player'
  return dialogueState:get(key) or 0
end

local function modifyRelationship(player, amount)
  local key = self.object.recordId .. '_' .. 'player'
  local current = dialogueState:get(key) or 0
  dialogueState:set(key, current + amount)
end

local function getAvailableTopics()
  local relationship = getRelationship(nil)
  local topics = { 'greeting', 'rumors', 'location' }
  
  if relationship >= 20 then
    table.insert(topics, 'personal')
    table.insert(topics, 'secrets')
  end
  
  if relationship >= 50 then
    table.insert(topics, 'quest_hint')
    table.insert(topics, 'special_offer')
  end
  
  return topics
end

local function onActivated(actor)
  if actor.type ~= types.Player then return end
  
  local topics = getAvailableTopics()
  
  actor:sendEvent('DialogueMod_OpenDialogue', {
    npc = self.object,
    npcName = types.NPC.record(self.object).name,
    topics = topics,
    relationship = getRelationship(actor)
  })
end

return {
  engineHandlers = {
    onActivated = onActivated,
  },
  eventHandlers = {
    DialogueMod_TopicSelected = function(data)
      local response = generateResponse(data.topic)
      modifyRelationship(data.player, 1)
      
      data.player:sendEvent('DialogueMod_ShowResponse', {
        text = response,
        npc = self.object
      })
    end,
    DialogueMod_GiveGift = function(data)
      modifyRelationship(data.player, data.value)
    end,
  },
}`
      },
      {
        title: "Book Collection System (Player Script)",
        context: "player",
        code: `-- scripts/BookMod/player.lua
local self = require('openmw.self')
local types = require('openmw.types')
local storage = require('openmw.storage')
local core = require('openmw.core')
local ui = require('openmw.ui')
local util = require('openmw.util')

local bookCollection = storage.playerSection('BookMod_Collection')
local lorePoints = 0

local function initCollection()
  if not bookCollection:get('initialized') then
    bookCollection:set('initialized', true)
    bookCollection:set('booksRead', {})
    bookCollection:set('lorePoints', 0)
  end
  lorePoints = bookCollection:get('lorePoints') or 0
end

local function hasReadBook(bookId)
  local booksRead = bookCollection:get('booksRead') or {}
  return booksRead[bookId] == true
end

local function markBookRead(bookId, book)
  local booksRead = bookCollection:get('booksRead') or {}
  if booksRead[bookId] then return end
  
  booksRead[bookId] = true
  bookCollection:set('booksRead', booksRead)
  
  -- Award lore points based on book type
  local record = types.Book.record(book)
  local points = 10
  if record.skill then
    points = 25  -- Skill books worth more
  end
  
  lorePoints = lorePoints + points
  bookCollection:set('lorePoints', lorePoints)
  
  core.sendGlobalEvent('BookMod_BookDiscovered', {
    bookId = bookId,
    bookName = record.name,
    points = points,
    totalPoints = lorePoints
  })
end

return {
  engineHandlers = {
    onActive = initCollection,
  },
  eventHandlers = {
    BookMod_BookOpened = function(data)
      if not hasReadBook(data.bookId) then
        markBookRead(data.bookId, data.book)
      end
    end,
    BookMod_GetStats = function(data)
      local booksRead = bookCollection:get('booksRead') or {}
      local count = 0
      for _ in pairs(booksRead) do count = count + 1 end
      
      data.callback({
        totalBooks = count,
        lorePoints = lorePoints
      })
    end,
  },
}`
      }
    ],
    docLinks: [
      `${DOCS_BASE}/openmw_core.html#dialogue`,
      `${DOCS_BASE}/openmw_types.html#Book`
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
- I.AI.startPackage({type='Travel', destPosition=vec3}) - LOCAL only
- I.AI.getActivePackage() - Get current AI package (check pkg.type == 'Combat' for combat)
- I.AI.getActiveTarget('Combat') - Get combat target (nil if not in combat)
- I.Controls.overrideMovementControls(enabled) - PLAYER only, block movement
- I.Controls.overrideCombatControls(enabled) - PLAYER only, block combat
- I.Camera.disableZoom(true) - Disable zoom (use openmw.camera.setMode for mode changes)
- I.Activation.addHandlerForType(type, handler) - handler(object, actor) signature

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
    const { gameType, themes, complexity, customNotes, isRandom, apiPackages } = await req.json();
    
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
    const selectedApiPackages = apiPackages || [];
    const systemPrompt = buildSystemPrompt(selectedThemes);

    // Build API package focus instructions
    let apiPackageInstructions = '';
    if (selectedApiPackages.length > 0) {
      const packageDescriptions: Record<string, string> = {
        'openmw.core': 'openmw.core (events, dialogue, factions, quests, sound)',
        'openmw.types': 'openmw.types (Actor, NPC, Item, Creature type records)',
        'openmw.world': 'openmw.world (create objects, access cells, spawn - Global only)',
        'openmw.self': 'openmw.self (reference to attached object - Local only)',
        'openmw.nearby': 'openmw.nearby (find nearby objects/actors - Local only)',
        'openmw.async': 'openmw.async (timers and callbacks)',
        'openmw.util': 'openmw.util (vectors, colors, transforms)',
        'openmw.ui': 'openmw.ui (HUD and menu creation - Player only)',
        'openmw.camera': 'openmw.camera (camera mode and control - Player only)',
        'openmw.input': 'openmw.input (key bindings - Player only)',
        'openmw.storage': 'openmw.storage (persistent data storage)',
        'openmw.interfaces': 'openmw.interfaces (AI, Controls, Activation, Camera, Combat)',
        'openmw.animation': 'openmw.animation (animation playback - Local only)',
        'openmw_aux.time': 'openmw_aux.time (repeating timers helper)',
      };
      
      const packageList = selectedApiPackages.map((pkg: string) => packageDescriptions[pkg] || pkg).join('\n- ');
      apiPackageInstructions = `

PRIORITIZED API PACKAGES - The user specifically wants the generated code to focus on these OpenMW Lua packages:
- ${packageList}

Make sure your implementation hints prominently feature these packages with practical examples. Design the mod concept around capabilities these packages provide.`;
    }

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
- Include a complete .omwscripts file example${apiPackageInstructions}`;
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
- For complex mods, show the communication flow between script types${apiPackageInstructions}`;
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