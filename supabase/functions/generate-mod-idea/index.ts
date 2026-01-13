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

local currentStage = 0

-- onSave: Called when game is saved. Return data to persist.
-- NOTE: Cannot access openmw.nearby here (may be inactive)
local function onSave()
  return { version = 1, questStage = currentStage }
end

-- onLoad: Called when game is loaded. Receives savedData AND initData.
-- savedData = what onSave returned; initData = what was passed to script creation
local function onLoad(savedData, initData)
  if savedData and savedData.version == 1 then 
    currentStage = savedData.questStage 
  end
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
local time = require('openmw_aux.time')

local state = { isActive = false }
local stopBehaviorTimer = nil

local function onActivated(actor)
  if actor.type == types.Player then
    state.isActive = true
    core.sendGlobalEvent('MyMod_NPCActivated', {
      npc = self.object,
      activator = actor
    })
  end
end

-- onSave: Cannot access openmw.nearby here (script may be inactive)
local function onSave() 
  return { version = 1, state = state } 
end

-- onLoad: Accepts both savedData and initData parameters
local function onLoad(savedData, initData) 
  if savedData and savedData.version == 1 then 
    state = savedData.state 
  end 
end

-- onActive: Called every time script becomes active (including after save load)
-- Use for starting timers, accessing nearby, session initialization
local function onActive()
  stopBehaviorTimer = time.runRepeatedly(function()
    -- Periodic behavior check (can access nearby here)
    if state.isActive and #nearby.players > 0 then
      -- Do something when player is near
    end
  end, time.second * 2, { type = time.SimulationTime })
end

-- onInactive: Called when script becomes inactive
-- Clean up timers and resources. CANNOT access openmw.nearby here.
local function onInactive()
  if stopBehaviorTimer then 
    stopBehaviorTimer() 
    stopBehaviorTimer = nil
  end
end

return {
  engineHandlers = {
    onActivated = onActivated,
    onSave = onSave,
    onLoad = onLoad,
    onActive = onActive,
    onInactive = onInactive,
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
local core = require('openmw.core')

local hudElement = nil

local function createHUD()
  hudElement = ui.create({
    layer = 'HUD',
    template = ui.templates.textNormal,
    props = { text = 'Quest Active' }
  })
end

local function destroyHUD()
  if hudElement then 
    hudElement:destroy()
    hudElement = nil
  end
end

local function onKeyPress(key)
  if key.symbol == 'j' and key.withAlt then
    -- Toggle custom journal (use key.withAlt, key.withShift, key.withCtrl)
    core.sendGlobalEvent('MyMod_ToggleJournal', {})
  end
end

return {
  engineHandlers = {
    onKeyPress = onKeyPress,
    -- onActive: Runs every time script becomes active (including after load)
    -- Use for HUD creation, timer starts, session initialization
    onActive = createHUD,
    -- onInactive: Runs when script becomes inactive
    -- Clean up HUD elements, stop timers. Cannot access nearby here.
    onInactive = destroyHUD,
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
    code: `local core = require('openmw.core')

local questState = {
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

-- onSave: Return state to persist. Cannot access openmw.nearby here.
local function onSave()
  return { 
    version = 1, 
    state = questState 
  }
end

-- onLoad: Accepts (savedData, initData). savedData is from onSave.
local function onLoad(savedData, initData)
  if savedData and savedData.version == 1 then
    questState = savedData.state
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

// Engine Handler Templates - Comprehensive examples for all major engine handlers
const ENGINE_HANDLER_TEMPLATES = {
  globalHandlers: {
    title: "Global Script Engine Handlers",
    description: "Handlers available in global scripts for world-level events",
    handlers: [
      {
        name: "onNewGame()",
        context: "global",
        description: "Called once when a new game starts (not on load). Perfect for mod initialization and welcome messages.",
        code: `-- scripts/MyMod/global.lua
local world = require('openmw.world')
local core = require('openmw.core')

local gameState = { initialized = false }

local function onNewGame()
  -- Called ONCE when starting a new game
  -- NOT called when loading a save
  gameState.initialized = true
  gameState.isNewGame = true
  
  -- Send event to player scripts
  for _, player in ipairs(world.players) do
    player:sendEvent('MyMod_GameStarted', {
      timestamp = core.getGameTime(),
      isNewGame = true
    })
  end
end

-- Reset flag on load so we know it's not a new game
local function onLoad(savedData, initData)
  if savedData then
    gameState = savedData
  end
  gameState.isNewGame = false
end

local function onSave()
  return gameState
end

return {
  engineHandlers = { 
    onNewGame = onNewGame,
    onSave = onSave,
    onLoad = onLoad,
  },
}`
      },
      {
        name: "onPlayerAdded(player)",
        context: "global",
        description: "Called when player is added to the game world. Triggers on new game AND on save load.",
        code: `local world = require('openmw.world')
local types = require('openmw.types')

local function onPlayerAdded(player)
  -- Called when player spawns into the world
  -- Happens on new game AND when loading a save
  
  -- Grant starting items on new game only
  if gameState.isNewGame then
    local inv = types.Actor.inventory(player)
    local starterItem = world.createObject('my_starter_item', 1)
    starterItem:moveInto(inv)
  end
  
  -- Always notify player script that we're ready
  player:sendEvent('MyMod_PlayerReady', {
    isNewGame = gameState.isNewGame
  })
end

return {
  engineHandlers = { onPlayerAdded = onPlayerAdded },
}`
      },
      {
        name: "onActorActive(actor)",
        context: "global",
        description: "Called when an NPC or Creature enters an active cell. Use for attaching scripts dynamically or checking conditions.",
        code: `local types = require('openmw.types')
local core = require('openmw.core')

local function onActorActive(actor)
  -- Called when NPC or Creature enters active cell
  -- Use for: dynamic script attachment, condition checks
  
  if types.NPC.objectIsInstance(actor) then
    local record = types.NPC.record(actor)
    
    -- Check if this NPC belongs to a specific faction
    if record.faction == 'thieves_guild' then
      actor:sendEvent('MyMod_GuildMemberActive', {
        rank = record.factionRank
      })
    end
    
    -- Check for specific NPC by record ID
    if actor.recordId == 'my_special_npc' then
      core.sendGlobalEvent('MyMod_SpecialNPCFound', {
        npc = actor,
        cell = actor.cell
      })
    end
  elseif types.Creature.objectIsInstance(actor) then
    -- Handle creatures
    local record = types.Creature.record(actor)
    if record.type == types.Creature.TYPE.Humanoid then
      -- Special handling for humanoid creatures
    end
  end
end

return {
  engineHandlers = { onActorActive = onActorActive },
}`
      },
      {
        name: "onObjectActive(object) / onItemActive(item)",
        context: "global",
        description: "Called when objects/items appear in active cells. Use for detecting dropped quest items or special objects.",
        code: `local core = require('openmw.core')
local types = require('openmw.types')

local QUEST_ITEMS = {
  'my_quest_amulet',
  'ancient_scroll',
  'sacred_relic'
}

local function onObjectActive(object)
  -- Called when any non-actor object enters active cell
  -- Includes activators, statics, containers, doors, etc.
  
  if object.recordId == 'my_trigger_activator' then
    -- Enable the trigger's local script
    core.sendGlobalEvent('MyMod_TriggerActive', {
      trigger = object,
      position = object.position
    })
  end
end

local function onItemActive(item)
  -- Called when items appear in a cell (NOT in inventory)
  -- Items on ground, in containers as world objects
  
  for _, questItemId in ipairs(QUEST_ITEMS) do
    if item.recordId == questItemId then
      core.sendGlobalEvent('MyMod_QuestItemSpawned', {
        item = item,
        itemId = questItemId,
        cell = item.cell,
        position = item.position
      })
      break
    end
  end
end

return {
  engineHandlers = { 
    onObjectActive = onObjectActive,
    onItemActive = onItemActive,
  },
}`
      },
      {
        name: "onActivate(object, actor)",
        context: "global",
        description: "Global activation hook called BEFORE local onActivated. Can block activations by returning false.",
        code: `local types = require('openmw.types')

-- Track which doors require keys
local lockedDoors = {
  ['sealed_vault_door'] = 'vault_key',
  ['archmage_door'] = 'archmage_staff',
  ['secret_passage'] = 'guild_token'
}

local function hasItemInInventory(actor, recordId)
  local inv = types.Actor.inventory(actor)
  for _, item in ipairs(inv:getAll()) do
    if item.recordId == recordId then
      return true
    end
  end
  return false
end

local function onActivate(object, actor)
  -- Called BEFORE the object's local onActivated handler
  -- Return false to block the activation entirely
  -- Return true or nil to allow normal activation
  
  if types.Door.objectIsInstance(object) then
    local requiredKey = lockedDoors[object.recordId]
    
    if requiredKey then
      if not hasItemInInventory(actor, requiredKey) then
        -- Block and notify player
        if actor.type == types.Player then
          actor:sendEvent('MyMod_ShowMessage', {
            text = 'This door requires a special key.'
          })
        end
        return false  -- Block the activation
      end
      -- Has key, allow opening
    end
  end
  
  -- For containers, could check traps, ownership, etc.
  if types.Container.objectIsInstance(object) then
    -- Custom container logic
  end
  
  -- Return true or nil to proceed with normal activation
end

return {
  engineHandlers = { onActivate = onActivate },
}`
      },
      {
        name: "onNewExterior(cell)",
        context: "global",
        description: "Called when engine generates a new exterior cell not in content files. Use for procedural world generation.",
        code: `local world = require('openmw.world')
local core = require('openmw.core')
local util = require('openmw.util')

local function onNewExterior(cell)
  -- Called when engine generates new exterior cell
  -- Only for cells NOT defined in content files
  -- Use for: procedural content, dynamic world generation
  
  local gridX = cell.gridX
  local gridY = cell.gridY
  
  -- Example: Add random wilderness encounters
  local encounterChance = 0.3
  if math.random() < encounterChance then
    -- Calculate center of cell
    local cellSize = 8192  -- Standard Morrowind cell size
    local centerX = gridX * cellSize + cellSize / 2
    local centerY = gridY * cellSize + cellSize / 2
    
    -- Spawn a wandering creature
    local creatures = {'mudcrab', 'cliff_racer', 'kagouti'}
    local randomCreature = creatures[math.random(#creatures)]
    
    local creature = world.createObject(randomCreature, 1)
    creature:teleport(cell, util.vector3(centerX, centerY, 0))
  end
  
  core.sendGlobalEvent('MyMod_CellGenerated', {
    cell = cell,
    gridX = gridX,
    gridY = gridY
  })
end

return {
  engineHandlers = { onNewExterior = onNewExterior },
}`
      }
    ]
  },
  localHandlers: {
    title: "Local Script Engine Handlers",
    description: "Handlers for scripts attached to specific actors/objects",
    handlers: [
      {
        name: "onActivated(actor)",
        context: "local",
        description: "Called when this object is activated by an actor. The most common local handler.",
        code: `-- scripts/MyMod/activator.lua
local self = require('openmw.self')
local core = require('openmw.core')
local types = require('openmw.types')

local activationCount = 0

local function onActivated(actor)
  -- actor is who activated this object
  -- self.object is this object being activated
  
  -- Only respond to player activations
  if actor.type ~= types.Player then
    return
  end
  
  activationCount = activationCount + 1
  
  -- Different responses based on activation count
  if activationCount == 1 then
    actor:sendEvent('MyMod_ShowMessage', {
      text = 'You notice something strange...'
    })
  elseif activationCount == 3 then
    -- Trigger secret after 3 activations
    core.sendGlobalEvent('MyMod_SecretRevealed', {
      object = self.object,
      discoverer = actor
    })
  end
end

local function onSave()
  return { version = 1, count = activationCount }
end

local function onLoad(savedData, initData)
  if savedData and savedData.version == 1 then
    activationCount = savedData.count
  end
end

return {
  engineHandlers = { 
    onActivated = onActivated,
    onSave = onSave,
    onLoad = onLoad,
  },
}`
      },
      {
        name: "onTeleported()",
        context: "local",
        description: "Called when the object is teleported via spell, console, or script. Use for updating state after position changes.",
        code: `-- scripts/MyMod/npc_tracker.lua
local self = require('openmw.self')
local core = require('openmw.core')

local lastPosition = nil
local lastCell = nil

local function onTeleported()
  -- Called when this object is teleported
  -- NOT called for normal movement
  
  local oldCell = lastCell
  local newCell = self.object.cell
  
  -- Track cell changes
  core.sendGlobalEvent('MyMod_ActorTeleported', {
    actor = self.object,
    fromCell = oldCell,
    toCell = newCell,
    newPosition = self.object.position
  })
  
  lastPosition = self.object.position
  lastCell = newCell
end

local function onActive()
  lastPosition = self.object.position
  lastCell = self.object.cell
end

return {
  engineHandlers = { 
    onTeleported = onTeleported,
    onActive = onActive,
  },
}`
      },
      {
        name: "onConsume(item)",
        context: "local",
        description: "Called when this actor consumes an item (potion, ingredient). item.count is already zero.",
        code: `-- scripts/MyMod/consumption_tracker.lua
local self = require('openmw.self')
local core = require('openmw.core')
local types = require('openmw.types')

local consumedItems = {}

local function onConsume(item)
  -- Called when actor consumes potion/ingredient
  -- item.count is already 0 at this point
  
  local recordId = item.recordId
  consumedItems[recordId] = (consumedItems[recordId] or 0) + 1
  
  -- Check for poison effects
  if recordId:match('^poison_') or recordId:match('_poison$') then
    core.sendGlobalEvent('MyMod_PoisonConsumed', {
      actor = self.object,
      poisonId = recordId,
      totalConsumed = consumedItems[recordId]
    })
    return
  end
  
  -- Check for quest potions
  if recordId == 'my_quest_potion' then
    core.sendGlobalEvent('MyMod_QuestPotionUsed', {
      actor = self.object
    })
    return
  end
  
  -- Track alchemy ingredients for achievements
  local ingredientRecord = types.Ingredient.record(item)
  if ingredientRecord then
    core.sendGlobalEvent('MyMod_IngredientConsumed', {
      actor = self.object,
      ingredient = recordId,
      effects = ingredientRecord.effects
    })
  end
end

local function onSave()
  return { version = 1, consumed = consumedItems }
end

local function onLoad(savedData, initData)
  if savedData and savedData.version == 1 then
    consumedItems = savedData.consumed
  end
end

return {
  engineHandlers = { 
    onConsume = onConsume,
    onSave = onSave,
    onLoad = onLoad,
  },
}`
      },
      {
        name: "onUpdate(dt)",
        context: "local",
        description: "Called every frame for game logic. dt is simulation time delta (0 when paused). Use sparingly for performance.",
        code: `-- scripts/MyMod/patrol_npc.lua
local self = require('openmw.self')
local nearby = require('openmw.nearby')
local core = require('openmw.core')
local I = require('openmw.interfaces')

local updateTimer = 0
local UPDATE_INTERVAL = 0.5  -- Check every 0.5 seconds, not every frame

local function onUpdate(dt)
  -- dt = time since last frame (0 when paused)
  -- WARNING: Called every frame - keep it lightweight!
  
  if dt == 0 then return end  -- Skip when paused
  
  -- Throttle expensive operations
  updateTimer = updateTimer + dt
  if updateTimer < UPDATE_INTERVAL then
    return
  end
  updateTimer = 0
  
  -- Now do the actual logic
  local nearestPlayer = nil
  local nearestDist = math.huge
  
  for _, player in ipairs(nearby.players) do
    local dist = (player.position - self.object.position):length()
    if dist < nearestDist then
      nearestDist = dist
      nearestPlayer = player
    end
  end
  
  if nearestPlayer and nearestDist < 500 then
    -- Player is close, react
    core.sendGlobalEvent('MyMod_PlayerNearNPC', {
      npc = self.object,
      player = nearestPlayer,
      distance = nearestDist
    })
  end
end

return {
  engineHandlers = { onUpdate = onUpdate },
}`
      }
    ]
  },
  playerHandlers: {
    title: "Player Script Engine Handlers",
    description: "Handlers exclusive to player scripts for input, UI, and player-specific events",
    handlers: [
      {
        name: "onFrame(dt)",
        context: "player",
        description: "Called every frame AFTER input processing. Works even when paused (dt=0). Use for latency-critical UI only.",
        code: `-- scripts/MyMod/player_hud.lua
local ui = require('openmw.ui')
local input = require('openmw.input')
local util = require('openmw.util')

local crosshair = nil
local mouseX, mouseY = 0.5, 0.5

local function onFrame(dt)
  -- Called every frame, even when paused (dt=0)
  -- Use ONLY for: latency-critical UI updates
  -- WARNING: Heavy operations here = low FPS
  
  if crosshair then
    -- Update crosshair to follow mouse smoothly
    local mousePos = input.getMousePosition()
    crosshair.layout.props.relativePosition = mousePos
    crosshair:update()
  end
end

local function createCrosshair()
  crosshair = ui.create({
    layer = 'HUD',
    type = ui.TYPE.Image,
    props = {
      resource = 'icons/crosshair.dds',
      relativeSize = util.vector2(0.02, 0.02),
      relativePosition = util.vector2(0.5, 0.5),
      anchor = util.vector2(0.5, 0.5)
    }
  })
end

local function destroyCrosshair()
  if crosshair then
    crosshair:destroy()
    crosshair = nil
  end
end

return {
  engineHandlers = { 
    onFrame = onFrame,
    onActive = createCrosshair,
    onInactive = destroyCrosshair,
  },
}`
      },
      {
        name: "onKeyPress(key) / onKeyRelease(key)",
        context: "player",
        description: "Keyboard input handlers. key has symbol, code, withAlt, withShift, withCtrl properties.",
        code: `-- scripts/MyMod/keybinds.lua
local core = require('openmw.core')
local input = require('openmw.input')
local ui = require('openmw.ui')

local heldKeys = {}
local menuOpen = false

local function onKeyPress(key)
  -- key.symbol: the key character ('a', 'space', 'escape', etc.)
  -- key.code: the keyboard scan code
  -- key.withAlt, key.withShift, key.withCtrl: modifier state at press time
  
  heldKeys[key.symbol] = true
  
  -- Toggle custom menu with Ctrl+M
  if key.symbol == 'm' and key.withCtrl then
    menuOpen = not menuOpen
    core.sendGlobalEvent('MyMod_ToggleMenu', { open = menuOpen })
    return
  end
  
  -- Quick spell with Shift+1 through Shift+5
  if key.withShift then
    local spellSlot = tonumber(key.symbol)
    if spellSlot and spellSlot >= 1 and spellSlot <= 5 then
      core.sendGlobalEvent('MyMod_QuickSpell', { slot = spellSlot })
      return
    end
  end
  
  -- Modifier key combination: Alt+H for help
  if key.symbol == 'h' and key.withAlt then
    core.sendGlobalEvent('MyMod_ShowHelp', {})
  end
end

local function onKeyRelease(key)
  heldKeys[key.symbol] = nil
  
  -- Handle charged abilities (hold to charge, release to fire)
  if key.symbol == 'r' and not key.withCtrl then
    local holdTime = getHoldDuration('r')  -- Custom tracking
    core.sendGlobalEvent('MyMod_ChargedRelease', {
      power = math.min(holdTime * 10, 100)
    })
  end
end

-- Check if a key is currently held (polling pattern)
local function isKeyHeld(symbol)
  return heldKeys[symbol] == true
end

return {
  engineHandlers = { 
    onKeyPress = onKeyPress,
    onKeyRelease = onKeyRelease,
  },
}`
      },
      {
        name: "onMouseButtonPress/Release(button) / onMouseWheel(vertical, horizontal)",
        context: "player",
        description: "Mouse input handlers. button is 1=left, 2=middle, 3=right. Wheel values are positive/negative for direction.",
        code: `-- scripts/MyMod/mouse_controls.lua
local core = require('openmw.core')
local nearby = require('openmw.nearby')

local isSelecting = false
local selectionStart = nil

local function onMouseButtonPress(button)
  -- button: 1=left, 2=middle, 3=right, 4+=extra buttons
  
  if button == 1 then  -- Left click
    -- Start selection box
    isSelecting = true
    selectionStart = input.getMousePosition()
  elseif button == 3 then  -- Right click
    -- Context menu or alternate action
    core.sendGlobalEvent('MyMod_ContextAction', {
      position = input.getMousePosition()
    })
  elseif button == 2 then  -- Middle click
    -- Quick action (e.g., ping location)
    core.sendGlobalEvent('MyMod_QuickPing', {})
  end
end

local function onMouseButtonRelease(button)
  if button == 1 and isSelecting then
    isSelecting = false
    local selectionEnd = input.getMousePosition()
    
    core.sendGlobalEvent('MyMod_SelectionComplete', {
      start = selectionStart,
      finish = selectionEnd
    })
  end
end

local function onMouseWheel(vertical, horizontal)
  -- vertical: positive = scroll up, negative = scroll down
  -- horizontal: positive = scroll right, negative = scroll left
  
  if vertical > 0 then
    core.sendGlobalEvent('MyMod_ScrollUp', { amount = vertical })
  elseif vertical < 0 then
    core.sendGlobalEvent('MyMod_ScrollDown', { amount = -vertical })
  end
  
  -- Horizontal scrolling (less common)
  if horizontal ~= 0 then
    core.sendGlobalEvent('MyMod_HorizontalScroll', { amount = horizontal })
  end
end

return {
  engineHandlers = { 
    onMouseButtonPress = onMouseButtonPress,
    onMouseButtonRelease = onMouseButtonRelease,
    onMouseWheel = onMouseWheel,
  },
}`
      },
      {
        name: "onControllerButtonPress/Release(id)",
        context: "player",
        description: "Gamepad/controller input handlers. Use input.CONTROLLER_BUTTON constants for button IDs.",
        code: `-- scripts/MyMod/controller_support.lua
local input = require('openmw.input')
local core = require('openmw.core')

local sprintActive = false

local function onControllerButtonPress(id)
  -- id matches input.CONTROLLER_BUTTON constants
  
  if id == input.CONTROLLER_BUTTON.LeftStick then
    -- L3 / Left stick click - toggle sprint
    sprintActive = not sprintActive
    core.sendGlobalEvent('MyMod_SetSprint', { active = sprintActive })
    
  elseif id == input.CONTROLLER_BUTTON.RightShoulder then
    -- RB / R1 - next spell/weapon
    core.sendGlobalEvent('MyMod_CycleSpell', { direction = 1 })
    
  elseif id == input.CONTROLLER_BUTTON.LeftShoulder then
    -- LB / L1 - previous spell/weapon
    core.sendGlobalEvent('MyMod_CycleSpell', { direction = -1 })
    
  elseif id == input.CONTROLLER_BUTTON.Y then
    -- Y / Triangle - special ability
    core.sendGlobalEvent('MyMod_SpecialAbility', {})
    
  elseif id == input.CONTROLLER_BUTTON.Back then
    -- Back / Select - open custom menu
    core.sendGlobalEvent('MyMod_ToggleMenu', { open = true })
  end
end

local function onControllerButtonRelease(id)
  if id == input.CONTROLLER_BUTTON.A then
    -- A / X button released - end charged jump
    core.sendGlobalEvent('MyMod_EndChargedJump', {})
  end
end

return {
  engineHandlers = { 
    onControllerButtonPress = onControllerButtonPress,
    onControllerButtonRelease = onControllerButtonRelease,
  },
}`
      },
      {
        name: "onConsoleCommand(mode, command, selectedObject)",
        context: "player",
        description: "Intercept console commands. Return false to consume the command. Useful for debug features and cheats.",
        code: `-- scripts/MyMod/console_commands.lua
local core = require('openmw.core')
local world = require('openmw.world')

local function onConsoleCommand(mode, command, selectedObject)
  -- mode: 'lua' for commands starting with 'lua', otherwise default
  -- command: the full command string
  -- selectedObject: object clicked in console (may be nil)
  
  -- Custom commands (prefix with mod name for clarity)
  if command == 'mymod debug' then
    core.sendGlobalEvent('MyMod_ToggleDebug', {})
    print('MyMod: Debug mode toggled')
    return false  -- Consume command (don't pass to engine)
  end
  
  -- Command with arguments
  local spawnMatch = command:match('^mymod spawn (.+)$')
  if spawnMatch then
    local creatureId = spawnMatch:gsub('%s+$', '')  -- Trim whitespace
    
    if selectedObject then
      -- Spawn at selected object's position
      core.sendGlobalEvent('MyMod_SpawnAt', {
        recordId = creatureId,
        position = selectedObject.position,
        cell = selectedObject.cell
      })
    else
      print('MyMod: Select an object first to spawn at its location')
    end
    return false
  end
  
  -- Give item command
  local giveMatch = command:match('^mymod give (.+)$')
  if giveMatch then
    core.sendGlobalEvent('MyMod_GiveItem', {
      recordId = giveMatch:gsub('%s+$', '')
    })
    return false
  end
  
  -- Return true or nil to let engine handle normally
end

return {
  engineHandlers = { onConsoleCommand = onConsoleCommand },
}`
      },
      {
        name: "onQuestUpdate(questId, stage)",
        context: "player",
        description: "Called when any quest is updated. Use for quest-dependent features, achievements, or HUD updates.",
        code: `-- scripts/MyMod/quest_tracker.lua
local core = require('openmw.core')
local ui = require('openmw.ui')
local util = require('openmw.util')

local questHUD = nil
local trackedQuests = {}

local QUEST_MILESTONES = {
  ['main_quest'] = { 10, 30, 50, 80, 100 },
  ['fighters_guild'] = { 10, 25, 50, 75, 100 },
  ['mages_guild'] = { 10, 25, 50, 75, 100 },
}

local function createQuestHUD()
  questHUD = ui.create({
    layer = 'HUD',
    type = ui.TYPE.Text,
    props = {
      relativePosition = util.vector2(0.98, 0.02),
      anchor = util.vector2(1, 0),
      text = '',
      textColor = util.color.rgb(0.9, 0.8, 0.6)
    }
  })
end

local function destroyQuestHUD()
  if questHUD then
    questHUD:destroy()
    questHUD = nil
  end
end

local function updateQuestHUD()
  if not questHUD then return end
  
  local lines = {}
  for questId, stage in pairs(trackedQuests) do
    table.insert(lines, questId .. ': Stage ' .. stage)
  end
  
  questHUD.layout.props.text = table.concat(lines, '\\n')
  questHUD:update()
end

local function onQuestUpdate(questId, stage)
  -- Called whenever ANY quest is updated
  -- questId = the quest's string ID
  -- stage = new quest stage number
  
  trackedQuests[questId] = stage
  updateQuestHUD()
  
  -- Check for milestones
  local milestones = QUEST_MILESTONES[questId]
  if milestones then
    for _, milestone in ipairs(milestones) do
      if stage == milestone then
        core.sendGlobalEvent('MyMod_QuestMilestone', {
          questId = questId,
          stage = stage,
          milestone = milestone
        })
        break
      end
    end
  end
  
  -- Unlock abilities at certain quest stages
  if questId == 'main_quest' and stage >= 50 then
    core.sendGlobalEvent('MyMod_UnlockAbility', {
      ability = 'prophecy_vision'
    })
  end
end

return {
  engineHandlers = { 
    onQuestUpdate = onQuestUpdate,
    onActive = createQuestHUD,
    onInactive = destroyQuestHUD,
  },
}`
      }
    ]
  },
  animationHandlers: {
    title: "Animation Engine Handlers",
    description: "Handlers for animation events and custom animation playback (local scripts only)",
    handlers: [
      {
        name: "onAnimationTextKey(groupname, key)",
        context: "local",
        description: "Called when an animation reaches a text key marker. Use for syncing effects, sounds, or actions to animation timing.",
        code: `-- scripts/MyMod/combat_effects.lua
local self = require('openmw.self')
local core = require('openmw.core')
local animation = require('openmw.animation')

-- Animation text keys are markers embedded in NIF files
-- Common keys: 'start', 'stop', 'hit', 'sound', 'loop start', 'loop stop'

local function onAnimationTextKey(groupname, key)
  -- groupname: animation group (e.g., 'attackone', 'idle', 'walkforward')
  -- key: the text key string from the animation file
  
  -- Sync weapon trail effect to attack animations
  if groupname:match('^attack') then
    if key == 'hit' then
      -- Animation reached the hit point - apply damage, spawn effects
      core.sendGlobalEvent('CombatMod_WeaponHit', {
        actor = self.object,
        attackType = groupname
      })
      
      -- Play impact sound at this exact moment
      local ambient = require('openmw.ambient')
      ambient.playSound('weapon_swish', { volume = 0.8 })
      
    elseif key == 'start' then
      -- Attack wind-up started
      core.sendGlobalEvent('CombatMod_AttackStart', {
        actor = self.object,
        attackType = groupname
      })
      
    elseif key == 'stop' then
      -- Attack animation finished
      core.sendGlobalEvent('CombatMod_AttackEnd', {
        actor = self.object
      })
    end
  end
  
  -- Custom text keys for modded animations
  if key == 'cast_release' then
    -- Custom key for spell casting
    core.sendGlobalEvent('MagicMod_SpellRelease', {
      caster = self.object
    })
  elseif key == 'footstep_left' or key == 'footstep_right' then
    -- Custom footstep sounds
    playFootstepSound(key)
  end
end

return {
  engineHandlers = { onAnimationTextKey = onAnimationTextKey },
}`
      },
      {
        name: "animation.playBlended / playQueued / playGroup",
        context: "local",
        description: "Play custom animations on actors. Use different methods for blending, queuing, or immediate playback.",
        code: `-- scripts/MyMod/custom_animations.lua
local self = require('openmw.self')
local animation = require('openmw.animation')
local core = require('openmw.core')

-- Animation priority levels (higher = takes precedence)
local PRIORITY = {
  Default = 0,
  Movement = 1,
  Hit = 2,
  Weapon = 3,
  Knockdown = 4,
  Scripted = 5,
  Death = 6
}

-- Animation bone groups
local BONE_GROUP = {
  LowerBody = animation.BONE_GROUP.LowerBody,
  Torso = animation.BONE_GROUP.Torso,
  LeftArm = animation.BONE_GROUP.LeftArm,
  RightArm = animation.BONE_GROUP.RightArm
}

local function playCustomIdle()
  -- playGroup: Play animation immediately, replacing current
  -- Parameters: groupname, priority, options
  animation.playGroup(self.object, 'idle2', {
    priority = PRIORITY.Scripted,
    loops = 0,  -- 0 = loop forever, 1+ = specific count
    speed = 1.0,
    autoDisable = true  -- Return to default when done
  })
end

local function playAttackCombo()
  -- playQueued: Add to animation queue, plays after current finishes
  animation.playQueued(self.object, 'attackone', {
    priority = PRIORITY.Weapon,
    loops = 1
  })
  
  -- Queue follow-up attack
  animation.playQueued(self.object, 'attacktwo', {
    priority = PRIORITY.Weapon,
    loops = 1
  })
end

local function playBlendedGesture()
  -- playBlended: Blend with current animation (for layered effects)
  -- Great for gestures, breathing, secondary motion
  animation.playBlended(self.object, 'gesture_wave', {
    priority = PRIORITY.Scripted,
    boneGroup = BONE_GROUP.RightArm,  -- Only affect right arm
    blendMask = 1.0,  -- Full blend
    loops = 1,
    speed = 1.2
  })
end

local function stopAnimation(groupname)
  -- Stop a specific animation group
  animation.cancel(self.object, groupname)
end

local function stopAllScripted()
  -- Cancel all animations at scripted priority
  animation.cancelAll(self.object, PRIORITY.Scripted)
end

-- Check if animation is playing
local function isAnimating(groupname)
  local info = animation.getInfo(self.object, groupname)
  return info ~= nil and info.isPlaying
end

-- Get current animation time
local function getAnimationProgress(groupname)
  local info = animation.getInfo(self.object, groupname)
  if info then
    return info.time / info.duration  -- 0.0 to 1.0
  end
  return 0
end

return {
  eventHandlers = {
    MyMod_PlayIdle = function() playCustomIdle() end,
    MyMod_PlayCombo = function() playAttackCombo() end,
    MyMod_PlayGesture = function() playBlendedGesture() end,
    MyMod_StopAnimation = function(data) stopAnimation(data.group) end,
  },
}`
      },
      {
        name: "Animation State Machine Pattern",
        context: "local",
        description: "Complex animation system with state tracking, transitions, and text key synchronization.",
        code: `-- scripts/MyMod/animation_controller.lua
local self = require('openmw.self')
local animation = require('openmw.animation')
local core = require('openmw.core')
local time = require('openmw_aux.time')

-- Animation state machine
local STATE = {
  IDLE = 'idle',
  WALKING = 'walking',
  RUNNING = 'running',
  COMBAT_IDLE = 'combat_idle',
  ATTACKING = 'attacking',
  CASTING = 'casting',
  STUNNED = 'stunned',
  CUSTOM = 'custom'
}

local currentState = STATE.IDLE
local previousState = nil
local stateData = {}
local stopUpdateTimer = nil

-- State transition rules
local TRANSITIONS = {
  [STATE.IDLE] = { STATE.WALKING, STATE.RUNNING, STATE.COMBAT_IDLE, STATE.CASTING, STATE.CUSTOM },
  [STATE.WALKING] = { STATE.IDLE, STATE.RUNNING, STATE.COMBAT_IDLE },
  [STATE.RUNNING] = { STATE.IDLE, STATE.WALKING, STATE.COMBAT_IDLE },
  [STATE.COMBAT_IDLE] = { STATE.IDLE, STATE.ATTACKING, STATE.STUNNED },
  [STATE.ATTACKING] = { STATE.COMBAT_IDLE, STATE.STUNNED },
  [STATE.CASTING] = { STATE.IDLE, STATE.COMBAT_IDLE },
  [STATE.STUNNED] = { STATE.IDLE, STATE.COMBAT_IDLE },
  [STATE.CUSTOM] = { STATE.IDLE }
}

local function canTransition(from, to)
  local allowed = TRANSITIONS[from]
  if not allowed then return false end
  for _, state in ipairs(allowed) do
    if state == to then return true end
  end
  return false
end

local function transitionTo(newState, data)
  if not canTransition(currentState, newState) then
    return false
  end
  
  previousState = currentState
  currentState = newState
  stateData = data or {}
  
  -- Play appropriate animation for new state
  if newState == STATE.IDLE then
    animation.playGroup(self.object, 'idle', {
      priority = 1,
      loops = 0,
      autoDisable = true
    })
  elseif newState == STATE.COMBAT_IDLE then
    animation.playGroup(self.object, 'idleweapon', {
      priority = 2,
      loops = 0
    })
  elseif newState == STATE.ATTACKING then
    local attackAnim = stateData.combo and 'attacktwo' or 'attackone'
    animation.playGroup(self.object, attackAnim, {
      priority = 3,
      loops = 1
    })
  elseif newState == STATE.CASTING then
    animation.playGroup(self.object, 'spellcast', {
      priority = 3,
      loops = 1
    })
  elseif newState == STATE.STUNNED then
    animation.playGroup(self.object, 'hit1', {
      priority = 4,
      loops = 1
    })
  elseif newState == STATE.CUSTOM then
    animation.playGroup(self.object, stateData.animation or 'idle2', {
      priority = stateData.priority or 5,
      loops = stateData.loops or 1,
      speed = stateData.speed or 1.0
    })
  end
  
  core.sendGlobalEvent('AnimMod_StateChanged', {
    actor = self.object,
    from = previousState,
    to = newState
  })
  
  return true
end

-- Handle animation text keys for state transitions
local function onAnimationTextKey(groupname, key)
  if key == 'stop' then
    -- Animation finished - return to appropriate idle
    if currentState == STATE.ATTACKING then
      transitionTo(STATE.COMBAT_IDLE, {})
    elseif currentState == STATE.CASTING then
      transitionTo(STATE.IDLE, {})
    elseif currentState == STATE.STUNNED then
      transitionTo(STATE.COMBAT_IDLE, {})
    elseif currentState == STATE.CUSTOM then
      transitionTo(STATE.IDLE, {})
    end
  elseif key == 'hit' and currentState == STATE.ATTACKING then
    -- Trigger hit detection at animation hit point
    core.sendGlobalEvent('AnimMod_AttackHit', {
      actor = self.object,
      attackData = stateData
    })
  elseif key == 'cast_release' and currentState == STATE.CASTING then
    core.sendGlobalEvent('AnimMod_SpellCast', {
      actor = self.object,
      spellData = stateData
    })
  end
end

local function onSave()
  return { 
    version = 1, 
    state = currentState, 
    prevState = previousState 
  }
end

local function onLoad(savedData, initData)
  if savedData and savedData.version == 1 then
    currentState = savedData.state or STATE.IDLE
    previousState = savedData.prevState
  end
end

local function onActive()
  -- Restore animation state
  transitionTo(currentState, {})
end

local function onInactive()
  if stopUpdateTimer then
    stopUpdateTimer()
    stopUpdateTimer = nil
  end
end

return {
  engineHandlers = {
    onAnimationTextKey = onAnimationTextKey,
    onSave = onSave,
    onLoad = onLoad,
    onActive = onActive,
    onInactive = onInactive,
  },
  eventHandlers = {
    AnimMod_SetState = function(data)
      transitionTo(data.state, data)
    end,
    AnimMod_Attack = function(data)
      transitionTo(STATE.ATTACKING, data)
    end,
    AnimMod_Cast = function(data)
      transitionTo(STATE.CASTING, data)
    end,
    AnimMod_Stun = function()
      transitionTo(STATE.STUNNED, {})
    end,
    AnimMod_PlayCustom = function(data)
      transitionTo(STATE.CUSTOM, data)
    end,
  },
}`
      },
      {
        name: "VFX Synced to Animation",
        context: "local",
        description: "Spawn visual effects synchronized with animation text keys for precise timing.",
        code: `-- scripts/MyMod/vfx_sync.lua
local self = require('openmw.self')
local core = require('openmw.core')
local vfx = require('openmw.vfx')
local util = require('openmw.util')
local types = require('openmw.types')

-- VFX spawn configurations
local VFX_CONFIG = {
  weapon_fire = {
    mesh = 'meshes/vfx/fire_trail.nif',
    bone = 'Weapon Bone',
    scale = 1.0,
    duration = 0.5
  },
  weapon_ice = {
    mesh = 'meshes/vfx/ice_crystals.nif',
    bone = 'Weapon Bone',
    scale = 0.8,
    duration = 0.4
  },
  cast_glow = {
    mesh = 'meshes/vfx/magic_glow.nif',
    bone = 'Bip01 R Hand',
    scale = 1.2,
    duration = 1.0
  },
  hit_spark = {
    mesh = 'meshes/vfx/hit_sparks.nif',
    bone = 'Bip01 Spine1',
    scale = 1.5,
    duration = 0.3
  }
}

local activeVFX = {}

local function spawnBoneVFX(config)
  -- Spawn VFX attached to actor bone
  local effect = vfx.spawn(config.mesh, self.object.position, {
    attachTo = self.object,
    boneName = config.bone,
    scale = config.scale
  })
  
  table.insert(activeVFX, {
    effect = effect,
    expireTime = core.getSimulationTime() + config.duration
  })
end

local function spawnWorldVFX(mesh, position, scale)
  -- Spawn VFX at world position (not attached)
  vfx.spawn(mesh, position, { scale = scale })
end

local function cleanupExpiredVFX()
  local currentTime = core.getSimulationTime()
  for i = #activeVFX, 1, -1 do
    if currentTime >= activeVFX[i].expireTime then
      -- VFX auto-expire, but we clean our tracking
      table.remove(activeVFX, i)
    end
  end
end

local function onAnimationTextKey(groupname, key)
  -- Sync VFX to animation events
  
  if groupname:match('^attack') then
    if key == 'start' then
      -- Check if weapon has enchantment for trail effect
      local equipment = types.Actor.getEquipment(self.object)
      local weapon = equipment[types.Actor.EQUIPMENT_SLOT.CarriedRight]
      
      if weapon then
        local record = types.Weapon.record(weapon)
        if record.enchantment then
          -- Spawn appropriate elemental trail
          local enchantType = getEnchantmentType(record.enchantment)
          if enchantType == 'fire' then
            spawnBoneVFX(VFX_CONFIG.weapon_fire)
          elseif enchantType == 'frost' then
            spawnBoneVFX(VFX_CONFIG.weapon_ice)
          end
        end
      end
      
    elseif key == 'hit' then
      -- Spawn impact effect at weapon position
      spawnBoneVFX(VFX_CONFIG.hit_spark)
    end
    
  elseif groupname == 'spellcast' then
    if key == 'start' then
      spawnBoneVFX(VFX_CONFIG.cast_glow)
    elseif key == 'cast_release' then
      -- Spawn projectile or area effect
      local spellPos = self.object.position + util.vector3(0, 0, 100)
      spawnWorldVFX('meshes/vfx/spell_burst.nif', spellPos, 2.0)
    end
    
  elseif key == 'footstep_left' or key == 'footstep_right' then
    -- Dust/splash effect based on surface
    local dustMesh = 'meshes/vfx/dust_puff.nif'
    spawnWorldVFX(dustMesh, self.object.position, 0.5)
  end
end

-- Periodic cleanup
local stopCleanup = nil

local function onActive()
  stopCleanup = time.runRepeatedly(cleanupExpiredVFX, time.second, { type = time.SimulationTime })
end

local function onInactive()
  if stopCleanup then 
    stopCleanup() 
    stopCleanup = nil 
  end
  activeVFX = {}
end

return {
  engineHandlers = {
    onAnimationTextKey = onAnimationTextKey,
    onActive = onActive,
    onInactive = onInactive,
  },
}`
      }
    ]
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
local time = require('openmw_aux.time')

local activeEffects = {}
local stopEffectCheck = nil

-- onSave: Cannot access openmw.nearby here
local function onSave() 
  return { version = 1, effects = activeEffects } 
end

-- onLoad: Accepts (savedData, initData)
local function onLoad(savedData, initData) 
  if savedData and savedData.version == 1 then 
    activeEffects = savedData.effects 
  end 
end

-- onActive: Start periodic checks when script becomes active
local function onActive()
  stopEffectCheck = time.runRepeatedly(function()
    local effects = types.Actor.activeEffects(self.object)
    
    -- Use getEffect to check for specific effect
    local fortifyEffect = effects:getEffect('fortifymagicka')
    if fortifyEffect then
      if not activeEffects.amplified then
        activeEffects.amplified = true
        core.sendGlobalEvent('MagicMod_Amplified', { actor = self.object })
      end
    else
      activeEffects.amplified = false
    end
  end, time.second, { type = time.SimulationTime })
end

-- onInactive: Clean up timers
local function onInactive()
  if stopEffectCheck then 
    stopEffectCheck() 
    stopEffectCheck = nil
  end
end

return {
  engineHandlers = { 
    onSave = onSave, 
    onLoad = onLoad,
    onActive = onActive,
    onInactive = onInactive,
  },
}`
      },
      {
        title: "Spell System Coordinator (Global Script)",
        context: "global",
        code: `-- scripts/MagicMod/global.lua
local world = require('openmw.world')
local core = require('openmw.core')

local spellRegistry = {}

-- onSave: Return state to persist
local function onSave() 
  return { version = 1, registry = spellRegistry } 
end

-- onLoad: Accepts (savedData, initData)
local function onLoad(savedData, initData) 
  if savedData and savedData.version == 1 then 
    spellRegistry = savedData.registry 
  end 
end

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
local time = require('openmw_aux.time')

local schedule = {
  current = 'idle',
  homePosition = nil,
  workPosition = nil
}
local stopScheduleCheck = nil

local function getHour()
  return (core.getGameTime() / 3600) % 24
end

local function checkSchedule()
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
end

-- onSave: Cannot access openmw.nearby here
local function onSave() 
  return { version = 1, schedule = schedule } 
end

-- onLoad: Accepts (savedData, initData)
local function onLoad(savedData, initData) 
  if savedData and savedData.version == 1 then 
    schedule = savedData.schedule 
  end 
end

-- onActive: Start schedule timer when script becomes active
local function onActive()
  stopScheduleCheck = time.runRepeatedly(checkSchedule, time.hour * 0.5, { type = time.GameTime })
end

-- onInactive: Clean up timer
local function onInactive()
  if stopScheduleCheck then 
    stopScheduleCheck() 
    stopScheduleCheck = nil
  end
end

return {
  engineHandlers = { 
    onSave = onSave, 
    onLoad = onLoad,
    onActive = onActive,
    onInactive = onInactive,
  },
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

-- onSave/onLoad: Proper persistence with version checking
local function onSave() 
  return { version = 1, factions = factionState } 
end

local function onLoad(savedData, initData) 
  if savedData and savedData.version == 1 then 
    factionState = savedData.factions 
  end 
end

return {
  engineHandlers = {
    onSave = onSave,
    onLoad = onLoad,
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
    -- onSave/onLoad with proper signature
    onSave = function() return { version = 1, quest = questState } end,
    onLoad = function(savedData, initData)
      if savedData and savedData.version == 1 then
        questState = savedData.quest
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
    -- onSave/onLoad with proper signatures
    onSave = function() return { version = 1, triggered = triggered } end,
    onLoad = function(savedData, initData) 
      if savedData and savedData.version == 1 then 
        triggered = savedData.triggered 
      end 
    end,
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
local stopPassiveCheck = nil

local function isEquipped()
  local equipment = types.Actor.getEquipment(self.object)
  local weapon = equipment[types.Actor.EQUIPMENT_SLOT.CarriedRight]
  return weapon and weapon.recordId == ARTIFACT_ID
end

local function checkPassiveEffect()
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
end

-- onSave/onLoad with proper signatures
local function onSave() 
  return { version = 1, charge = chargeState } 
end

local function onLoad(savedData, initData) 
  if savedData and savedData.version == 1 then 
    chargeState = savedData.charge 
  end 
end

-- onActive: Start timer when script becomes active
local function onActive()
  stopPassiveCheck = time.runRepeatedly(checkPassiveEffect, time.second * 5, { type = time.SimulationTime })
end

-- onInactive: Clean up timer
local function onInactive()
  if stopPassiveCheck then 
    stopPassiveCheck() 
    stopPassiveCheck = nil
  end
end

return {
  engineHandlers = {
    onSave = onSave,
    onLoad = onLoad,
    onActive = onActive,
    onInactive = onInactive,
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
local core = require('openmw.core')

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

local function createComboHUD()
  comboDisplay = ui.create({
    layer = 'HUD',
    template = ui.templates.textNormal,
    props = { text = '' }
  })
end

local function destroyComboHUD()
  if comboDisplay then 
    comboDisplay:destroy()
    comboDisplay = nil
  end
end

-- Track combat hits via event from global
return {
  engineHandlers = { 
    -- onActive: Create HUD when script becomes active (including after load)
    onActive = createComboHUD,
    -- onInactive: Destroy HUD when script becomes inactive
    onInactive = destroyComboHUD,
  },
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

local stopUpdate = nil

-- onActive: Create HUD and start updates when script becomes active
local function onActive()
  createHealthBar()
  stopUpdate = time.runRepeatedly(updateBar, 0.1 * time.second, { type = time.SimulationTime })
end

-- onInactive: Destroy HUD and stop updates when script becomes inactive
local function onInactive()
  if hudElement then 
    hudElement:destroy() 
    hudElement = nil
  end 
  if stopUpdate then 
    stopUpdate() 
    stopUpdate = nil
  end
end

return {
  engineHandlers = {
    onActive = onActive,
    onInactive = onInactive,
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

local function destroyMenu()
  if menuWindow then 
    menuWindow:destroy()
    menuWindow = nil
  end
  menuOpen = false
end

local function toggleMenu()
  if not menuWindow then return end
  menuOpen = not menuOpen
  menuWindow.layout.props.visible = menuOpen
  menuWindow:update()
  I.Controls.overrideMovementControls(menuOpen)
end

local function onKeyPress(key)
  if key.symbol == 'm' and key.withAlt then
    toggleMenu()
  end
end

return {
  engineHandlers = {
    -- onActive: Create menu when script becomes active (including after load)
    onActive = createMenu,
    -- onInactive: Destroy menu when script becomes inactive
    onInactive = destroyMenu,
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
local stopDistanceCheck = nil

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

-- onActive: Start distance check timer when script becomes active
local function onActive()
  stopDistanceCheck = time.runRepeatedly(checkPlayerDistance, time.second, { type = time.SimulationTime })
end

-- onInactive: Stop sound and timer when script becomes inactive
local function onInactive()
  if isPlaying then
    core.sound.stopSound(AMBIENT_SOUND, self.object)
    isPlaying = false
  end
  if stopDistanceCheck then 
    stopDistanceCheck() 
    stopDistanceCheck = nil
  end
end

return {
  engineHandlers = {
    onActive = onActive,
    onInactive = onInactive,
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
local stopMusicCheck = nil

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

-- onSave/onLoad with proper signatures
local function onSave() 
  return { version = 1, music = musicState } 
end

local function onLoad(savedData, initData) 
  if savedData and savedData.version == 1 then 
    musicState = savedData.music 
  end 
end

-- onActive: Start music state check when script becomes active
local function onActive()
  stopMusicCheck = time.runRepeatedly(updateMusicState, time.second * 2, { type = time.SimulationTime })
end

-- onInactive: Stop timer when script becomes inactive
local function onInactive()
  if stopMusicCheck then 
    stopMusicCheck() 
    stopMusicCheck = nil
  end
end

return {
  engineHandlers = {
    onSave = onSave,
    onLoad = onLoad,
    onActive = onActive,
    onInactive = onInactive,
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
local stopAnimCheck = nil

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

-- onActive: Start animation check timer when script becomes active
local function onActive()
  stopAnimCheck = time.runRepeatedly(function()
    local active = anim.getActiveGroup(self.object, anim.BONE_GROUP.UpperBody)
    if not active or active == 'idle' then
      playCustomIdle()
    end
  end, time.second * 5, { type = time.SimulationTime })
end

-- onInactive: Stop timer when script becomes inactive
local function onInactive()
  if stopAnimCheck then 
    stopAnimCheck() 
    stopAnimCheck = nil
  end
end

return {
  engineHandlers = {
    onActive = onActive,
    onInactive = onInactive,
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

local stopWeatherUpdate = nil

-- onSave/onLoad with proper signatures
local function onSave() 
  return { version = 1, weather = weatherState } 
end

local function onLoad(savedData, initData) 
  if savedData and savedData.version == 1 then 
    weatherState = savedData.weather 
  end 
end

return {
  engineHandlers = {
    onSave = onSave,
    onLoad = onLoad,
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
local stopRegionCheck = nil

-- onSave/onLoad with proper signatures
local function onSave() 
  return { version = 1, regions = regionState, lastRegion = lastRegion } 
end

local function onLoad(savedData, initData) 
  if savedData and savedData.version == 1 then 
    regionState = savedData.regions or {}
    lastRegion = savedData.lastRegion
  end 
end

return {
  engineHandlers = {
    onSave = onSave,
    onLoad = onLoad,
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
    -- onLoad with proper signature for migration handling
    onLoad = function(savedData, initData)
      -- Migration from old save format if needed
      if savedData and savedData.version == 0 then
        for k, v in pairs(savedData.settings or {}) do
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

local stopDistanceTrack = nil
local stopPlayTimeTrack = nil

-- onActive: Start tracking when script becomes active
local function onActive()
  initStats()
  stopDistanceTrack = time.runRepeatedly(trackDistance, time.second * 5, { type = time.SimulationTime })
  stopPlayTimeTrack = time.runRepeatedly(trackPlayTime, time.second * 60, { type = time.SimulationTime })
end

-- onInactive: Stop timers when script becomes inactive
local function onInactive()
  if stopDistanceTrack then stopDistanceTrack() stopDistanceTrack = nil end
  if stopPlayTimeTrack then stopPlayTimeTrack() stopPlayTimeTrack = nil end
end

return {
  engineHandlers = {
    onActive = onActive,
    onInactive = onInactive,
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

local stopDetectionCheck = nil

-- onSave/onLoad with proper signatures
local function onSave() 
  return { version = 1, detection = detectionState } 
end

local function onLoad(savedData, initData) 
  if savedData and savedData.version == 1 then 
    detectionState = savedData.detection 
  end 
end

-- onActive: Start detection timer when script becomes active
local function onActive()
  stopDetectionCheck = time.runRepeatedly(updateDetection, time.second, { type = time.SimulationTime })
end

-- onInactive: Stop timer when script becomes inactive
local function onInactive()
  if stopDetectionCheck then 
    stopDetectionCheck() 
    stopDetectionCheck = nil
  end
end

return {
  engineHandlers = {
    onSave = onSave,
    onLoad = onLoad,
    onActive = onActive,
    onInactive = onInactive,
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

local function destroyStealthHUD()
  if stealthHUD then 
    stealthHUD:destroy()
    stealthHUD = nil
  end
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
    -- onActive: Create HUD when script becomes active
    onActive = createStealthHUD,
    -- onInactive: Destroy HUD when script becomes inactive
    onInactive = destroyStealthHUD,
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
`
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

  // Build engine handler reference
  let engineHandlerRef = "\n## Engine Handlers Reference:\n";
  engineHandlerRef += "Use these handlers to respond to game events. Choose the right handler for the right script context.\n";
  for (const category of Object.values(ENGINE_HANDLER_TEMPLATES)) {
    engineHandlerRef += `\n### ${category.title}\n${category.description}\n`;
    for (const handler of category.handlers) {
      engineHandlerRef += `- **${handler.name}** (${handler.context}): ${handler.description}\n`;
    }
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
${engineHandlerRef}

## Category-Specific Patterns:
${categoryContext}

## Script Lifecycle Handlers (CRITICAL):

### When to use each handler:
- **onInit**: Called ONCE when script is first created (not after save/load). Use only for one-time creation setup that doesn't need to survive saves.
- **onActive**: Called every time script becomes active (including after save load). Use for HUD creation, starting timers, session initialization. This is where most initialization should happen.
- **onInactive**: Called when script becomes inactive. MUST clean up timers (call stop functions) and destroy UI elements. CANNOT access openmw.nearby here.
- **onSave**: Called during save. Return data to persist. CANNOT access openmw.nearby (script may be inactive). Always include version number for migrations.
- **onLoad**: Called on load. MUST accept (savedData, initData) parameters. savedData is from onSave; initData is from script creation.

### Correct lifecycle pattern:
\`\`\`lua
local hudElement = nil
local stopTimer = nil

local function onSave()
  return { version = 1, myData = state }  -- Always version your save data
end

local function onLoad(savedData, initData)  -- MUST have both parameters
  if savedData and savedData.version == 1 then
    state = savedData.myData
  end
end

local function onActive()
  -- Create HUD here (survives save/load)
  hudElement = ui.create({ layer = 'HUD', ... })
  -- Start timers here
  stopTimer = time.runRepeatedly(myFunc, time.second, { type = time.SimulationTime })
end

local function onInactive()
  -- ALWAYS clean up in onInactive
  if hudElement then hudElement:destroy() hudElement = nil end
  if stopTimer then stopTimer() stopTimer = nil end
end

return {
  engineHandlers = {
    onSave = onSave,
    onLoad = onLoad,
    onActive = onActive,
    onInactive = onInactive,
  },
}
\`\`\`

### Common mistakes to AVOID:
- Using onInit for HUD creation (won't survive save/load - use onActive instead)
- Using onLoad(data) instead of onLoad(savedData, initData)
- Not cleaning up timers in onInactive (causes resource leaks)
- Accessing openmw.nearby in onSave or onInactive (will error)
- Starting timers at module level instead of in onActive

## CRITICAL Requirements:
1. **Script Context**: ALWAYS specify which script context (Global/Local/Player) each code belongs to
2. **Events**: Use core.sendGlobalEvent for Local→Global, object:sendEvent for Global→Local or Local→Local
3. **Persistence**: Include onSave/onLoad handlers for any stateful scripts
4. **Lifecycle**: Use onActive for HUD/timer initialization, onInactive for cleanup, onLoad with proper (savedData, initData) signature
5. **Interfaces**: Use openmw.interfaces for AI control, combat checks, camera/controls
6. **Timers**: Use async:registerTimerCallback for save-safe timers; clean up in onInactive
7. **File Structure**: Include .omwscripts file showing script registration

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