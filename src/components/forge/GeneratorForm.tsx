import { useState, useEffect } from 'react';
import { Wand2, Dices, Loader2, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { GameType, ThemeTag, Complexity, ApiPackage, OpenMWInterface, GeneratorFormData } from '@/types/mod-idea';

const GAME_TYPES: { value: GameType; label: string }[] = [
  { value: 'rpg', label: 'RPG' },
  { value: 'sandbox', label: 'Sandbox' },
  { value: 'survival', label: 'Survival' },
  { value: 'action-adventure', label: 'Action-Adventure' },
  { value: 'simulation', label: 'Simulation' },
];

const THEME_TAGS: { value: ThemeTag; label: string; icon: string }[] = [
  // Core themes
  { value: 'magic', label: 'Magic', icon: '✨' },
  { value: 'kingdoms', label: 'Kingdoms', icon: '🏰' },
  { value: 'dragons', label: 'Dragons', icon: '🐉' },
  { value: 'quests', label: 'Quests', icon: '📜' },
  { value: 'crafting', label: 'Crafting', icon: '⚒️' },
  { value: 'combat', label: 'Combat', icon: '⚔️' },
  { value: 'economy', label: 'Economy', icon: '💰' },
  { value: 'exploration', label: 'Exploration', icon: '🗺️' },
  { value: 'necromancy', label: 'Necromancy', icon: '💀' },
  { value: 'alchemy', label: 'Alchemy', icon: '⚗️' },
  { value: 'guilds', label: 'Guilds', icon: '🏛️' },
  { value: 'artifacts', label: 'Artifacts', icon: '💎' },
  // UI & HUD
  { value: 'ui', label: 'UI', icon: '🖼️' },
  { value: 'hud', label: 'HUD', icon: '📊' },
  { value: 'menus', label: 'Menus', icon: '📋' },
  // Sound & Ambience
  { value: 'sounds', label: 'Sounds', icon: '🔊' },
  { value: 'ambience', label: 'Ambience', icon: '🌙' },
  { value: 'music', label: 'Music', icon: '🎵' },
  // VFX & Animation
  { value: 'vfx', label: 'VFX', icon: '💫' },
  { value: 'animation', label: 'Animation', icon: '🎬' },
  // World & Environment
  { value: 'weather', label: 'Weather', icon: '🌦️' },
  { value: 'terrain', label: 'Terrain', icon: '⛰️' },
  { value: 'world', label: 'World', icon: '🌍' },
  // Camera & Controls
  { value: 'camera', label: 'Camera', icon: '📷' },
  { value: 'controls', label: 'Controls', icon: '🎮' },
  // Storage & Data
  { value: 'data', label: 'Data', icon: '💾' },
  { value: 'storage', label: 'Storage', icon: '📦' },
  { value: 'settings', label: 'Settings', icon: '⚙️' },
  // Stealth & Sneaking
  { value: 'stealth', label: 'Stealth', icon: '🥷' },
  { value: 'sneaking', label: 'Sneaking', icon: '👤' },
  // Dialogue & Books
  { value: 'dialogue', label: 'Dialogue', icon: '💬' },
  { value: 'books', label: 'Books', icon: '📚' },
  { value: 'lore', label: 'Lore', icon: '📖' },
];

const COMPLEXITY_LABELS: Record<number, { label: string; value: Complexity }> = {
  0: { label: 'Simple Tweak', value: 'simple' },
  50: { label: 'Quest Mod', value: 'quest-mod' },
  100: { label: 'Full Overhaul', value: 'overhaul' },
};

type ScriptContext = 'All' | 'Global' | 'Local' | 'Player' | 'Varies';

const API_PACKAGES: { value: ApiPackage; label: string; icon: string; context: ScriptContext; description: string }[] = [
  { value: 'openmw.core', label: 'Core', icon: '⚙️', context: 'All', description: 'Events, dialogue, factions, quests' },
  { value: 'openmw.types', label: 'Types', icon: '📦', context: 'All', description: 'Actor, NPC, Item, Creature access' },
  { value: 'openmw.world', label: 'World', icon: '🌍', context: 'Global', description: 'Create objects, access cells, spawn' },
  { value: 'openmw.self', label: 'Self', icon: '👤', context: 'Local', description: 'Reference to attached object' },
  { value: 'openmw.nearby', label: 'Nearby', icon: '📍', context: 'Local', description: 'Find nearby objects/actors' },
  { value: 'openmw.async', label: 'Async', icon: '⏱️', context: 'All', description: 'Timers and callbacks' },
  { value: 'openmw.util', label: 'Util', icon: '🔧', context: 'All', description: 'Vectors, colors, transforms' },
  { value: 'openmw.ui', label: 'UI', icon: '🖼️', context: 'Player', description: 'HUD and menu creation' },
  { value: 'openmw.camera', label: 'Camera', icon: '📷', context: 'Player', description: 'Camera mode and control' },
  { value: 'openmw.input', label: 'Input', icon: '🎮', context: 'Player', description: 'Key bindings and input' },
  { value: 'openmw.storage', label: 'Storage', icon: '💾', context: 'All', description: 'Persistent data storage' },
  { value: 'openmw.interfaces', label: 'Interfaces', icon: '🔌', context: 'Varies', description: 'AI, Controls, Activation, Camera, Combat' },
  { value: 'openmw.animation', label: 'Animation', icon: '🎬', context: 'Local', description: 'Animation playback control' },
  { value: 'openmw_aux.time', label: 'Time', icon: '🕐', context: 'All', description: 'Repeating timers helper' },
];

const CONTEXT_COLORS: Record<ScriptContext, string> = {
  'All': 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  'Global': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  'Local': 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  'Player': 'bg-rose-500/20 text-rose-400 border-rose-500/30',
  'Varies': 'bg-purple-500/20 text-purple-400 border-purple-500/30',
};

type InterfaceContext = 'Global' | 'Local' | 'Player' | 'Menu+Player' | 'Global+Menu+Player';

const INTERFACE_CONTEXT_COLORS: Record<InterfaceContext, string> = {
  'Global': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  'Local': 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  'Player': 'bg-rose-500/20 text-rose-400 border-rose-500/30',
  'Menu+Player': 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  'Global+Menu+Player': 'bg-purple-500/20 text-purple-400 border-purple-500/30',
};

const OPENMW_INTERFACES: { value: OpenMWInterface; label: string; icon: string; context: InterfaceContext; description: string }[] = [
  { value: 'Activation', label: 'Activation', icon: '🖱️', context: 'Global', description: 'Extend/override activation of doors, containers, items, actors' },
  { value: 'AI', label: 'AI', icon: '🧠', context: 'Local', description: 'Control NPC/creature AI packages (Travel, Wander, Combat, Follow)' },
  { value: 'AnimationController', label: 'AnimationController', icon: '🎬', context: 'Local', description: 'Control NPC/creature animations and text-key hooks' },
  { value: 'Camera', label: 'Camera', icon: '📷', context: 'Player', description: 'Alter built-in camera behavior (zoom, mode, head-bobbing)' },
  { value: 'Combat', label: 'Combat', icon: '⚔️', context: 'Local', description: 'Control NPC/creature combat; on-hit handlers' },
  { value: 'Controls', label: 'Controls', icon: '🎮', context: 'Player', description: 'Override movement/combat/UI player controls' },
  { value: 'Crimes', label: 'Crimes', icon: '⚖️', context: 'Global', description: 'Commit crimes (theft, assault, murder, trespass)' },
  { value: 'GamepadControls', label: 'GamepadControls', icon: '🕹️', context: 'Player', description: 'Alter built-in gamepad controls behavior' },
  { value: 'ItemUsage', label: 'ItemUsage', icon: '🧪', context: 'Global', description: 'Extend/override item usage (potions, scrolls, food)' },
  { value: 'MWUI', label: 'MWUI', icon: '🖼️', context: 'Menu+Player', description: 'Morrowind-style UI templates (borders, text, padding)' },
  { value: 'Settings', label: 'Settings', icon: '⚙️', context: 'Global+Menu+Player', description: 'Register in-game settings pages and groups' },
  { value: 'SkillProgression', label: 'SkillProgression', icon: '📈', context: 'Player', description: 'Control/extend/override skill progression' },
  { value: 'UI', label: 'UI', icon: '📋', context: 'Player', description: 'High-level UI mode stack (add/remove custom modes)' },
];


export interface GeneratorPrefill {
  themes: ThemeTag[];
  complexity: Complexity;
  customNotes: string;
}

interface GeneratorFormProps {
  onGenerate: (data: GeneratorFormData) => void;
  onRandomGenerate: () => void;
  isGenerating: boolean;
  prefill?: GeneratorPrefill | null;
}

export function GeneratorForm({ onGenerate, onRandomGenerate, isGenerating, prefill }: GeneratorFormProps) {
  const [gameType, setGameType] = useState<GameType>('rpg');
  const [selectedThemes, setSelectedThemes] = useState<ThemeTag[]>([]);
  const [selectedApiPackages, setSelectedApiPackages] = useState<ApiPackage[]>([]);
  const [selectedInterfaces, setSelectedInterfaces] = useState<OpenMWInterface[]>([]);
  const [complexityValue, setComplexityValue] = useState([50]);
  const [customNotes, setCustomNotes] = useState('');
  const [apiSectionOpen, setApiSectionOpen] = useState(false);
  const [interfaceSectionOpen, setInterfaceSectionOpen] = useState(false);

  const toggleTheme = (theme: ThemeTag) => {
    setSelectedThemes((prev) =>
      prev.includes(theme)
        ? prev.filter((t) => t !== theme)
        : [...prev, theme]
    );
  };

  useEffect(() => {
    if (prefill) {
      setSelectedThemes(prefill.themes);
      const sliderVal = prefill.complexity === 'simple' ? 25 : prefill.complexity === 'quest-mod' ? 50 : 100;
      setComplexityValue([sliderVal]);
      setCustomNotes(prefill.customNotes);
    }
  }, [prefill]);

  const toggleApiPackage = (pkg: ApiPackage) => {
    setSelectedApiPackages((prev) =>
      prev.includes(pkg)
        ? prev.filter((p) => p !== pkg)
        : [...prev, pkg]
    );
  };

  const toggleInterface = (iface: OpenMWInterface) => {
    setSelectedInterfaces((prev) =>
      prev.includes(iface)
        ? prev.filter((i) => i !== iface)
        : [...prev, iface]
    );
  };

  const getComplexity = (): Complexity => {
    const value = complexityValue[0];
    if (value <= 25) return 'simple';
    if (value <= 75) return 'quest-mod';
    return 'overhaul';
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onGenerate({
      gameType,
      themes: selectedThemes.length > 0 ? selectedThemes : ['magic', 'quests'],
      complexity: getComplexity(),
      apiPackages: selectedApiPackages.length > 0 ? selectedApiPackages : undefined,
      interfaces: selectedInterfaces.length > 0 ? selectedInterfaces : undefined,
      customNotes: customNotes || undefined,
    });
  };


  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Game Type */}
      <div className="space-y-2">
        <Label className="font-display text-sm uppercase tracking-wider text-foreground">
          Game Type
        </Label>
        <Select value={gameType} onValueChange={(v) => setGameType(v as GameType)}>
          <SelectTrigger className="medieval-border bg-card">
            <SelectValue placeholder="Select game type" />
          </SelectTrigger>
          <SelectContent>
            {GAME_TYPES.map((type) => (
              <SelectItem key={type.value} value={type.value}>
                {type.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Theme Tags */}
      <div className="space-y-2">
        <Label className="font-display text-sm uppercase tracking-wider text-foreground">
          Themes (select multiple)
        </Label>
        <div className="flex flex-wrap gap-2">
          {THEME_TAGS.map((theme) => (
            <Badge
              key={theme.value}
              variant={selectedThemes.includes(theme.value) ? 'default' : 'outline'}
              className={`cursor-pointer transition-all font-body ${
                selectedThemes.includes(theme.value)
                  ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                  : 'hover:bg-secondary'
              }`}
              onClick={() => toggleTheme(theme.value)}
            >
              <span className="mr-1">{theme.icon}</span>
              {theme.label}
            </Badge>
          ))}
        </div>
      </div>

      {/* API Packages (Collapsible) */}
      <Collapsible open={apiSectionOpen} onOpenChange={setApiSectionOpen}>
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="flex items-center justify-between w-full py-2 text-left group"
          >
            <Label className="font-display text-sm uppercase tracking-wider text-foreground cursor-pointer group-hover:text-primary transition-colors">
              API Packages (Advanced)
              {selectedApiPackages.length > 0 && (
                <span className="ml-2 text-xs text-gold">({selectedApiPackages.length} selected)</span>
              )}
            </Label>
            <ChevronDown 
              className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${
                apiSectionOpen ? 'rotate-180' : ''
              }`} 
            />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-3 pt-2">
          <p className="text-xs text-muted-foreground font-body">
            Select OpenMW Lua API packages to prioritize in the generated code. Context indicates which script types can use each package.
          </p>
          <div className="flex flex-wrap gap-2">
            <TooltipProvider delayDuration={200}>
              {API_PACKAGES.map((pkg) => (
                <Tooltip key={pkg.value}>
                  <TooltipTrigger asChild>
                    <Badge
                      variant={selectedApiPackages.includes(pkg.value) ? 'default' : 'outline'}
                      className={`cursor-pointer transition-all font-body ${
                        selectedApiPackages.includes(pkg.value)
                          ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                          : 'hover:bg-secondary'
                      }`}
                      onClick={() => toggleApiPackage(pkg.value)}
                    >
                      <span className="mr-1">{pkg.icon}</span>
                      {pkg.label}
                      <span className={`ml-1.5 px-1 py-0.5 text-[10px] rounded border ${CONTEXT_COLORS[pkg.context]}`}>
                        {pkg.context}
                      </span>
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-[200px]">
                    <p className="font-semibold">{pkg.value}</p>
                    <p className="text-xs text-muted-foreground">{pkg.description}</p>
                  </TooltipContent>
                </Tooltip>
              ))}
            </TooltipProvider>
          </div>
          {/* Context Legend */}
          <div className="flex flex-wrap gap-3 pt-2 border-t border-border/50">
            <span className="text-xs text-muted-foreground">Context:</span>
            {Object.entries(CONTEXT_COLORS).map(([context, colorClass]) => (
              <span key={context} className={`text-xs px-1.5 py-0.5 rounded border ${colorClass}`}>
                {context}
              </span>
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Built-in Interfaces (Collapsible) */}
      <Collapsible open={interfaceSectionOpen} onOpenChange={setInterfaceSectionOpen}>
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="flex items-center justify-between w-full py-2 text-left group"
          >
            <Label className="font-display text-sm uppercase tracking-wider text-foreground cursor-pointer group-hover:text-primary transition-colors">
              Built-in Interfaces (Advanced)
              {selectedInterfaces.length > 0 && (
                <span className="ml-2 text-xs text-gold">({selectedInterfaces.length} selected)</span>
              )}
            </Label>
            <ChevronDown
              className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${
                interfaceSectionOpen ? 'rotate-180' : ''
              }`}
            />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-3 pt-2">
          <p className="text-xs text-muted-foreground font-body">
            Select OpenMW built-in interfaces (via <code>require('openmw.interfaces')</code>) to prioritize in the generated code. Each interface is available only in the shown script context.
          </p>
          <div className="flex flex-wrap gap-2">
            <TooltipProvider delayDuration={200}>
              {OPENMW_INTERFACES.map((iface) => (
                <Tooltip key={iface.value}>
                  <TooltipTrigger asChild>
                    <Badge
                      variant={selectedInterfaces.includes(iface.value) ? 'default' : 'outline'}
                      className={`cursor-pointer transition-all font-body ${
                        selectedInterfaces.includes(iface.value)
                          ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                          : 'hover:bg-secondary'
                      }`}
                      onClick={() => toggleInterface(iface.value)}
                    >
                      <span className="mr-1">{iface.icon}</span>
                      {iface.label}
                      <span className={`ml-1.5 px-1 py-0.5 text-[10px] rounded border ${INTERFACE_CONTEXT_COLORS[iface.context]}`}>
                        {iface.context}
                      </span>
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-[220px]">
                    <p className="font-semibold">I.{iface.value}</p>
                    <p className="text-xs text-muted-foreground">{iface.description}</p>
                  </TooltipContent>
                </Tooltip>
              ))}
            </TooltipProvider>
          </div>
          <div className="flex flex-wrap gap-3 pt-2 border-t border-border/50">
            <span className="text-xs text-muted-foreground">Context:</span>
            {Object.entries(INTERFACE_CONTEXT_COLORS).map(([context, colorClass]) => (
              <span key={context} className={`text-xs px-1.5 py-0.5 rounded border ${colorClass}`}>
                {context}
              </span>
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>



      {/* Complexity Slider */}
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <Label className="font-display text-sm uppercase tracking-wider text-foreground">
            Complexity
          </Label>
          <span className="text-sm font-body text-gold font-semibold">
            {getComplexity() === 'simple' && 'Simple Tweak'}
            {getComplexity() === 'quest-mod' && 'Quest Mod'}
            {getComplexity() === 'overhaul' && 'Full Overhaul'}
          </span>
        </div>
        <Slider
          value={complexityValue}
          onValueChange={setComplexityValue}
          max={100}
          step={1}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-muted-foreground font-body">
          <span>Simple</span>
          <span>Quest</span>
          <span>Overhaul</span>
        </div>
      </div>

      {/* Custom Notes */}
      <div className="space-y-2">
        <Label className="font-display text-sm uppercase tracking-wider text-foreground">
          Custom Notes / Inspiration (optional)
        </Label>
        <Textarea
          placeholder="Add any specific ideas, lore elements, or mechanics you'd like to include..."
          value={customNotes}
          onChange={(e) => setCustomNotes(e.target.value)}
          className="medieval-border bg-card min-h-[80px] font-body"
        />
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3 pt-2">
        <Button
          type="submit"
          disabled={isGenerating}
          className="flex-1 font-display uppercase tracking-wider"
        >
          {isGenerating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Forging Idea...
            </>
          ) : (
            <>
              <Wand2 className="mr-2 h-4 w-4" />
              Forge Mod Idea
            </>
          )}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onRandomGenerate}
          disabled={isGenerating}
          className="font-display uppercase tracking-wider medieval-border"
        >
          <Dices className="mr-2 h-4 w-4" />
          Roll the Dice of Fate!
        </Button>
      </div>
    </form>
  );
}