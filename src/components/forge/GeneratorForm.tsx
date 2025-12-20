import { useState } from 'react';
import { Wand2, Dices, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { GameType, ThemeTag, Complexity, GeneratorFormData } from '@/types/mod-idea';

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

interface GeneratorFormProps {
  onGenerate: (data: GeneratorFormData) => void;
  onRandomGenerate: () => void;
  isGenerating: boolean;
}

export function GeneratorForm({ onGenerate, onRandomGenerate, isGenerating }: GeneratorFormProps) {
  const [gameType, setGameType] = useState<GameType>('rpg');
  const [selectedThemes, setSelectedThemes] = useState<ThemeTag[]>([]);
  const [complexityValue, setComplexityValue] = useState([50]);
  const [customNotes, setCustomNotes] = useState('');

  const toggleTheme = (theme: ThemeTag) => {
    setSelectedThemes((prev) =>
      prev.includes(theme)
        ? prev.filter((t) => t !== theme)
        : [...prev, theme]
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