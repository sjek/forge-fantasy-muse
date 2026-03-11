

## Plan: Add Complex openmw.ui Examples for Menu Creation

### Overview
Add a new `uiHandlers` section to `ENGINE_HANDLER_TEMPLATES` with comprehensive examples demonstrating advanced UI patterns: buttons with callbacks, scrolling lists, text input handling, modal dialogs, and interactive menus.

### File to Modify
**`supabase/functions/generate-mod-idea/index.ts`**

---

### New Section: uiHandlers in ENGINE_HANDLER_TEMPLATES

Add after `soundHandlers` (around line 2388) a new section with the following examples:

#### 1. openmw.ui API Reference
Complete reference for:
- `ui.create(layout)` - Create UI element
- `ui.content({...})` - Create content array
- `ui.TYPE.*` - Widget, Text, Image, TextEdit, Flex
- `ui.layers` - Available layers (HUD, Windows, Notification)
- `ui.templates.*` - Built-in templates (textNormal, textHeader, etc.)
- `element:update()` - Refresh layout after changes
- `element:destroy()` - Remove element

#### 2. Interactive Button Menu Pattern
```lua
-- scripts/ButtonMenuMod/player.lua
local ui = require('openmw.ui')
local util = require('openmw.util')
local input = require('openmw.input')
local I = require('openmw.interfaces')

local menuWindow = nil
local menuOpen = false

local function createButton(text, callback, yOffset)
  return {
    type = ui.TYPE.Widget,
    props = {
      relativePosition = util.vector2(0.5, yOffset),
      anchor = util.vector2(0.5, 0.5),
      size = util.vector2(180, 32),
      resource = ui.WIDGET_BACKGROUND.Segment,
      backgroundColor = util.color.rgb(0.3, 0.3, 0.4),
    },
    content = ui.content({
      {
        type = ui.TYPE.Text,
        props = {
          relativePosition = util.vector2(0.5, 0.5),
          anchor = util.vector2(0.5, 0.5),
          text = text,
          textColor = util.color.rgb(1, 1, 1),
        },
      },
    }),
    events = {
      mouseClick = async:callback(callback),
      mouseMove = async:callback(function(e)
        -- Hover highlight
        e.layout.props.backgroundColor = util.color.rgb(0.4, 0.4, 0.6)
        e.layout:update()
      end),
      focusLoss = async:callback(function(e)
        e.layout.props.backgroundColor = util.color.rgb(0.3, 0.3, 0.4)
        e.layout:update()
      end),
    },
  }
end
```

#### 3. Scrollable List Pattern
```lua
-- Scrollable container with dynamic content
local function createScrollableList(items)
  local listContent = {}
  for i, item in ipairs(items) do
    table.insert(listContent, {
      type = ui.TYPE.Widget,
      props = {
        size = util.vector2(280, 40),
        resource = ui.WIDGET_BACKGROUND.Segment,
        backgroundColor = (i % 2 == 0) 
          and util.color.rgb(0.25, 0.25, 0.3)
          or util.color.rgb(0.2, 0.2, 0.25),
      },
      content = ui.content({
        { type = ui.TYPE.Text, props = { text = item.name, ... } },
      }),
      events = {
        mouseClick = async:callback(function() onItemSelect(item) end),
      },
    })
  end
  
  return {
    type = ui.TYPE.Flex,
    props = {
      size = util.vector2(300, 400),
      arrange = ui.FLEX_ARRANGE.Start,
      direction = ui.FLEX_DIRECTION.Vertical,
      -- Enable scrolling
      scroll = ui.SCROLL.Vertical,
    },
    content = ui.content(listContent),
  }
end
```

#### 4. Text Input Field Pattern
```lua
-- scripts/InputMod/player.lua
local ui = require('openmw.ui')
local async = require('openmw.async')

local inputValue = ''

local function createTextInput(placeholder)
  return {
    type = ui.TYPE.TextEdit,
    props = {
      relativePosition = util.vector2(0.5, 0.3),
      anchor = util.vector2(0.5, 0.5),
      size = util.vector2(200, 28),
      multiline = false,
      text = '',
    },
    events = {
      textChanged = async:callback(function(event)
        inputValue = event.layout.props.text
      end),
      keyPress = async:callback(function(event, key)
        if key.symbol == 'return' then
          onInputSubmit(inputValue)
        end
      end),
    },
  }
end
```

#### 5. Modal Dialog with Confirm/Cancel
```lua
-- Modal dialog pattern with action buttons
local function showConfirmDialog(message, onConfirm, onCancel)
  local dialog = ui.create({
    layer = 'Windows',
    type = ui.TYPE.Widget,
    props = {
      relativePosition = util.vector2(0.5, 0.5),
      anchor = util.vector2(0.5, 0.5),
      size = util.vector2(320, 160),
    },
    content = ui.content({
      -- Background panel
      { type = ui.TYPE.Widget, props = { resource = ui.WIDGET_BACKGROUND.Panel, ... } },
      -- Message text
      { type = ui.TYPE.Text, props = { text = message, ... } },
      -- Confirm button
      { events = { mouseClick = async:callback(function() 
          onConfirm()
          dialog:destroy()
        end) } },
      -- Cancel button
      { events = { mouseClick = async:callback(function()
          if onCancel then onCancel() end
          dialog:destroy()
        end) } },
    }),
  })
  
  I.Controls.overrideMovementControls(true)
  return dialog
end
```

#### 6. Tab Navigation System
```lua
-- Tabbed interface pattern
local TAB_CONFIG = {
  { id = 'inventory', label = 'Inventory' },
  { id = 'stats', label = 'Statistics' },
  { id = 'quests', label = 'Quests' },
}

local activeTab = 'inventory'
local tabContents = {}

local function createTabButton(tab, index)
  local isActive = (tab.id == activeTab)
  return {
    type = ui.TYPE.Widget,
    props = {
      position = util.vector2(index * 100, 0),
      size = util.vector2(100, 32),
      backgroundColor = isActive 
        and util.color.rgb(0.4, 0.4, 0.5)
        or util.color.rgb(0.25, 0.25, 0.3),
    },
    events = {
      mouseClick = async:callback(function()
        setActiveTab(tab.id)
      end),
    },
  }
end

local function setActiveTab(tabId)
  activeTab = tabId
  -- Update visibility of tab contents
  for id, content in pairs(tabContents) do
    content.layout.props.visible = (id == tabId)
    content:update()
  end
  rebuildTabs()
end
```

#### 7. Dynamic List with Add/Remove
```lua
-- Manage a list with add/remove functionality
local listItems = {}

local function addItem(item)
  table.insert(listItems, item)
  rebuildList()
end

local function removeItem(index)
  table.remove(listItems, index)
  rebuildList()
end

local function createListItem(item, index)
  return {
    type = ui.TYPE.Flex,
    props = {
      direction = ui.FLEX_DIRECTION.Horizontal,
      size = util.vector2(280, 36),
    },
    content = ui.content({
      -- Item text
      { type = ui.TYPE.Text, props = { text = item.name, ... } },
      -- Delete button
      {
        type = ui.TYPE.Widget,
        props = { size = util.vector2(24, 24), ... },
        events = {
          mouseClick = async:callback(function()
            removeItem(index)
          end),
        },
        content = ui.content({
          { type = ui.TYPE.Text, props = { text = 'X', ... } },
        }),
      },
    }),
  }
end
```

---

### Update System Prompt

Add documentation for openmw.ui in the system prompt (before CRITICAL Requirements) covering:
- Available UI layers and when to use each
- Event handling pattern with `async:callback()`
- Content rebuilding pattern (`element.layout.content = newContent; element:update()`)
- Focus and input management with `I.Controls.overrideMovementControls()`

---

### Summary of Examples to Add

| Example | Description |
|---------|-------------|
| openmw.ui API Reference | Complete API documentation with types, layers, templates |
| Interactive Button Menu | Buttons with hover states and click callbacks |
| Scrollable List | Flex container with vertical scrolling |
| Text Input Field | TextEdit with change and submit handling |
| Modal Dialog | Confirm/cancel dialog pattern |
| Tab Navigation | Tabbed interface with content switching |
| Dynamic List | Add/remove items with list rebuilding |

### Technical Notes

1. **Event Handling**: All UI events require `async:callback()` wrapper
2. **Content Updates**: After modifying `element.layout`, call `element:update()`
3. **Layers**: Use 'Windows' for menus, 'HUD' for overlays, 'Notification' for popups
4. **Input Control**: Use `I.Controls.overrideMovementControls(true)` when menus are open
5. **Cleanup**: Always destroy UI elements in `onInactive` handler

