

## Plan: Add Sound/Ambient Handler Examples and Audio Synchronization Patterns

### Overview
Expand the `ENGINE_HANDLER_TEMPLATES` section in `supabase/functions/generate-mod-idea/index.ts` to include comprehensive examples for the `openmw.ambient` package, covering sound playback, music control, voice/dialogue, and audio synchronization with animations.

### Current State Analysis

The codebase currently has:
- A `soundAmbience` category in `CATEGORY_TEMPLATES` (lines ~2769-2905) with basic examples for ambient sound zones and dynamic music systems
- Animation handler examples with a brief mention of `ambient.playSound()` in `onAnimationTextKey` 
- References to `core.sound` APIs which appear to be outdated (the correct package is `openmw.ambient` for player scripts)

### API Correction Needed

The current code uses `core.sound.playSound3d()` which doesn't exist in OpenMW. The correct APIs are:
- **`openmw.ambient`** - For 2D background sounds (player/menu scripts only)
- There is no 3D positional sound API in OpenMW Lua yet - only ambient 2D sounds are available

### Changes to Make

**File: `supabase/functions/generate-mod-idea/index.ts`**

#### 1. Add New `soundHandlers` Section to ENGINE_HANDLER_TEMPLATES (~line 1856)

Create a new section after `animationHandlers` with the following examples:

**a) openmw.ambient API Reference**
```lua
-- Available in player and menu scripts only
local ambient = require('openmw.ambient')

-- Core Functions:
ambient.playSound(soundId, options)       -- Play a sound by record ID
ambient.playSoundFile(fileName, options)  -- Play a sound file from VFS
ambient.stopSound(soundId)                -- Stop a sound by record ID
ambient.stopSoundFile(fileName)           -- Stop a sound file
ambient.isSoundPlaying(soundId)           -- Check if sound is playing
ambient.isSoundFilePlaying(fileName)      -- Check if file is playing
ambient.streamMusic(fileName, options)    -- Play music track
ambient.stopMusic()                        -- Stop current music
ambient.isMusicPlaying()                   -- Check if music is playing
ambient.say(fileName, text)               -- Play voiceover with subtitle
ambient.stopSay()                          -- Stop voiceover
```

**b) Basic Sound Playback Handler**
- Playing sounds on events (key presses, activations)
- Sound options: `timeOffset`, `volume`, `pitch`, `scale`, `loop`
- Checking if sounds are playing before replaying
- Stopping sounds properly

**c) Music System with Transitions**
- Using `streamMusic()` for background music
- Fade transitions between tracks
- Context-aware music switching (combat, exploration, location)
- Proper onActive/onInactive cleanup

**d) Voiceover/Dialogue System**
- Using `ambient.say()` for voice with subtitles
- Checking `isSayActive()` before playing new dialogue
- Queueing voice lines
- Stopping voiceovers on interruption

**e) Audio Synchronized with Animation (onAnimationTextKey + sound)**
- Playing weapon sounds on attack text keys
- Footstep sounds with surface-aware variation
- Spell casting sound effects timed to animation
- Impact sounds on 'hit' keys

**f) Dynamic Sound Layering**
- Multiple simultaneous ambient sounds
- Volume ducking for priority sounds
- Environmental sound mixing

#### 2. Fix Incorrect API Usage in CATEGORY_TEMPLATES.soundAmbience

The current `soundAmbience` examples use `core.sound.playSound3d()` which is incorrect. Update to use proper `openmw.ambient` APIs:

**Current (incorrect):**
```lua
core.sound.playSound3d(AMBIENT_SOUND, self.object, {...})
core.sound.stopSound(AMBIENT_SOUND, self.object)
```

**Corrected:**
```lua
-- openmw.ambient is for 2D sounds only (player scripts)
-- For position-based audio effects, use events to trigger player-side sounds
ambient.playSound(AMBIENT_SOUND, { volume = 1.0, loop = true })
ambient.stopSound(AMBIENT_SOUND)
```

Note: OpenMW does not currently have a 3D positional sound API in Lua. All `openmw.ambient` sounds are 2D background sounds. The examples should clarify this limitation.

#### 3. Update System Prompt with Sound Handler Documentation

Add a new section to the system prompt (before CRITICAL Requirements) documenting:
- Available sound APIs and which script contexts can use them
- Limitations (no 3D positional sounds in Lua API)
- Best practices for audio timing with animations
- Common patterns for music transitions

### Detailed Example Templates

#### Sound Handler Examples to Add:

```typescript
soundHandlers: {
  title: "Sound & Audio Engine Handlers",
  description: "Audio playback using openmw.ambient (player/menu scripts only)",
  handlers: [
    {
      name: "ambient.playSound / playSoundFile",
      context: "player",
      description: "Play 2D background sounds...",
      code: `...`
    },
    {
      name: "ambient.streamMusic - Dynamic Music System",
      context: "player",
      description: "Control music playback with transitions...",
      code: `...`
    },
    {
      name: "ambient.say - Voiceover System",
      context: "player",
      description: "Play voice files with subtitles...",
      code: `...`
    },
    {
      name: "Animation-Synced Audio Pattern",
      context: "local + player",
      description: "Coordinate audio with animations using events...",
      code: `...`
    },
    {
      name: "Combat Sound Effects Pattern",
      context: "local + player",
      description: "Play weapon, impact, and combat sounds...",
      code: `...`
    },
    {
      name: "Environmental Audio Layering",
      context: "player",
      description: "Layer multiple ambient sounds with volume control...",
      code: `...`
    }
  ]
}
```

### Implementation Details

#### Example 1: Basic Sound Playback
```lua
-- scripts/SoundMod/player.lua
local ambient = require('openmw.ambient')
local input = require('openmw.input')

local function onKeyPress(key)
  if key.symbol == 'q' then
    -- Play UI sound with options
    ambient.playSound('menu click', {
      volume = 0.8,
      pitch = 1.0,
      loop = false
    })
  end
end

return {
  engineHandlers = { onKeyPress = onKeyPress },
}
```

#### Example 2: Music Transitions
```lua
-- scripts/MusicMod/player.lua
local ambient = require('openmw.ambient')

local musicState = { current = nil }

local function switchMusic(track, fadeTime)
  if musicState.current == track then return end
  
  ambient.streamMusic(track, {
    fadeOut = fadeTime or 2.0
  })
  musicState.current = track
end

-- Event handler from global script
return {
  eventHandlers = {
    MusicMod_CombatStart = function()
      switchMusic('Music\\Combat\\battle_01.mp3', 1.0)
    end,
    MusicMod_CombatEnd = function()
      switchMusic('Music\\Explore\\peaceful_01.mp3', 3.0)
    end,
  },
}
```

#### Example 3: Animation-Synced Audio (Cross-Script Pattern)
```lua
-- Local script sends events, player script plays audio
-- This is required because openmw.ambient is player-only

-- scripts/SoundMod/npc.lua (local)
local function onAnimationTextKey(groupname, key)
  if groupname:match('^attack') and key == 'hit' then
    core.sendGlobalEvent('SoundMod_PlayCombatSound', {
      soundType = 'weapon_hit',
      position = self.object.position
    })
  end
end

-- scripts/SoundMod/player.lua (player)
return {
  eventHandlers = {
    SoundMod_PlaySound = function(data)
      ambient.playSound(data.soundId, { volume = data.volume or 1.0 })
    end,
  },
}
```

#### Example 4: Voiceover Queue
```lua
-- scripts/DialogueMod/player.lua
local ambient = require('openmw.ambient')
local time = require('openmw_aux.time')

local voiceQueue = {}
local checkVoice = nil

local function queueVoice(file, subtitle)
  table.insert(voiceQueue, { file = file, text = subtitle })
  processQueue()
end

local function processQueue()
  if #voiceQueue == 0 or ambient.isSayActive() then return end
  
  local next = table.remove(voiceQueue, 1)
  ambient.say(next.file, next.text)
end

local function onActive()
  checkVoice = time.runRepeatedly(processQueue, 0.5, { type = time.SimulationTime })
end

local function onInactive()
  if checkVoice then checkVoice() end
  voiceQueue = {}
end

return {
  engineHandlers = {
    onActive = onActive,
    onInactive = onInactive,
  },
  eventHandlers = {
    DialogueMod_Say = function(data)
      queueVoice(data.file, data.text)
    end,
  },
}
```

### Summary of Changes

| Location | Change |
|----------|--------|
| `ENGINE_HANDLER_TEMPLATES.soundHandlers` (new) | Add 6 comprehensive sound handler examples |
| `CATEGORY_TEMPLATES.soundAmbience` | Fix API calls from `core.sound.*` to `ambient.*` |
| System prompt | Add sound API documentation section |
| Documentation links | Update to correct `openmw_ambient.html` reference |

### Technical Accuracy Notes

1. **Script Context**: `openmw.ambient` is only available in player and menu scripts
2. **No 3D Sound API**: OpenMW Lua does not expose 3D positional audio - all sounds through `ambient` are 2D
3. **Cross-Script Audio**: For NPC/creature sounds, local scripts must send events to player scripts
4. **Sound Records**: `playSound()` uses sound record IDs from content files; `playSoundFile()` uses VFS paths
5. **Music Fading**: `streamMusic()` has a `fadeOut` option for smooth transitions

