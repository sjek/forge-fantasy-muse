export type GameType = 'rpg' | 'sandbox' | 'survival' | 'action-adventure' | 'simulation';

export type ThemeTag = 
  | 'magic' 
  | 'kingdoms' 
  | 'dragons' 
  | 'quests' 
  | 'crafting' 
  | 'combat' 
  | 'economy' 
  | 'exploration'
  | 'necromancy'
  | 'alchemy'
  | 'guilds'
  | 'artifacts'
  // UI & HUD
  | 'ui'
  | 'hud'
  | 'menus'
  // Sound & Ambience
  | 'sounds'
  | 'ambience'
  | 'music'
  // VFX & Animation
  | 'vfx'
  | 'animation'
  // World & Environment
  | 'weather'
  | 'terrain'
  | 'world'
  // Camera & Controls
  | 'camera'
  | 'controls'
  // Storage & Data
  | 'data'
  | 'storage'
  | 'settings'
  // Stealth & Sneaking
  | 'stealth'
  | 'sneaking'
  // Dialogue & Books
  | 'dialogue'
  | 'books'
  | 'lore';

export type Complexity = 'simple' | 'quest-mod' | 'overhaul';

export type ApiPackage = 
  | 'openmw.core'
  | 'openmw.types'
  | 'openmw.world'
  | 'openmw.self'
  | 'openmw.nearby'
  | 'openmw.async'
  | 'openmw.util'
  | 'openmw.ui'
  | 'openmw.camera'
  | 'openmw.input'
  | 'openmw.storage'
  | 'openmw.interfaces'
  | 'openmw.animation'
  | 'openmw_aux.time';

export type OpenMWInterface =
  | 'Activation'
  | 'AI'
  | 'AnimationController'
  | 'Camera'
  | 'Combat'
  | 'Controls'
  | 'Crimes'
  | 'GamepadControls'
  | 'ItemUsage'
  | 'MWUI'
  | 'Settings'
  | 'SkillProgression'
  | 'UI';

export interface ModIdea {
  id: string;
  title: string;
  description: string;
  features: string[];
  implementationHints: OpenMWHint[];
  tags: ThemeTag[];
  complexity: Complexity;
  gameType: GameType;
  createdAt: string;
}

export interface OpenMWHint {
  title: string;
  description: string;
  luaExample?: string;
  pseudocode?: string;
  docLink?: string;
}

export interface GeneratorFormData {
  gameType: GameType;
  themes: ThemeTag[];
  complexity: Complexity;
  apiPackages?: ApiPackage[];
  interfaces?: OpenMWInterface[];
  customNotes?: string;
}


// Story Board Types
export type StoryType = 'quest-line' | 'npc-backstory' | 'lore-entry' | 'world-event' | 'faction-history';
export type StoryTone = 'epic' | 'dark' | 'comedic' | 'mysterious' | 'tragic';
export type StoryComplexity = 'short-tale' | 'multi-act-saga' | 'epic-chronicle';
export type StoryFormat = 'structured' | 'prose';

export interface StoryAct {
  title: string;
  description: string;
  keyEvents: string[];
}

export interface StoryCharacter {
  name: string;
  role: string;
  description: string;
}

export interface StoryEntry {
  id: string;
  title: string;
  synopsis: string;
  acts: StoryAct[];
  characters: StoryCharacter[];
  loreNotes: string[];
  connections: string[];
  storyType: StoryType;
  tone: StoryTone;
  themes: ThemeTag[];
  createdAt: string;
  proseText?: string;
  keyPoints?: string[];
}

export interface StoryFormData {
  storyType: StoryType;
  themes: ThemeTag[];
  tone: StoryTone;
  complexity: StoryComplexity;
  setting?: string;
  format?: StoryFormat;
}