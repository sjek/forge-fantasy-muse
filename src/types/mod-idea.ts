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
  | 'artifacts';

export type Complexity = 'simple' | 'quest-mod' | 'overhaul';

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
  docLink?: string;
}

export interface GeneratorFormData {
  gameType: GameType;
  themes: ThemeTag[];
  complexity: Complexity;
  customNotes?: string;
}