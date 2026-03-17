import { useState } from 'react';
import { BookOpen, Dices, Loader2, FileText, AlignLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { StoryType, StoryTone, StoryComplexity, StoryFormat, ThemeTag, StoryFormData } from '@/types/mod-idea';

const STORY_TYPES: { value: StoryType; label: string; icon: string }[] = [
  { value: 'quest-line', label: 'Quest Line', icon: '📜' },
  { value: 'npc-backstory', label: 'NPC Backstory', icon: '👤' },
  { value: 'lore-entry', label: 'Lore Entry', icon: '📖' },
  { value: 'world-event', label: 'World Event', icon: '🌍' },
  { value: 'faction-history', label: 'Faction History', icon: '🏛️' },
];

const TONES: { value: StoryTone; label: string; icon: string }[] = [
  { value: 'epic', label: 'Epic', icon: '⚔️' },
  { value: 'dark', label: 'Dark', icon: '🌑' },
  { value: 'comedic', label: 'Comedic', icon: '🎭' },
  { value: 'mysterious', label: 'Mysterious', icon: '🔮' },
  { value: 'tragic', label: 'Tragic', icon: '💔' },
];

const THEME_TAGS: { value: ThemeTag; label: string; icon: string }[] = [
  { value: 'magic', label: 'Magic', icon: '✨' },
  { value: 'kingdoms', label: 'Kingdoms', icon: '🏰' },
  { value: 'dragons', label: 'Dragons', icon: '🐉' },
  { value: 'quests', label: 'Quests', icon: '📜' },
  { value: 'combat', label: 'Combat', icon: '⚔️' },
  { value: 'economy', label: 'Economy', icon: '💰' },
  { value: 'exploration', label: 'Exploration', icon: '🗺️' },
  { value: 'necromancy', label: 'Necromancy', icon: '💀' },
  { value: 'alchemy', label: 'Alchemy', icon: '⚗️' },
  { value: 'guilds', label: 'Guilds', icon: '🏛️' },
  { value: 'artifacts', label: 'Artifacts', icon: '💎' },
  { value: 'dialogue', label: 'Dialogue', icon: '💬' },
  { value: 'lore', label: 'Lore', icon: '📖' },
  { value: 'stealth', label: 'Stealth', icon: '🥷' },
  { value: 'world', label: 'World', icon: '🌍' },
];

const COMPLEXITY_LABELS: Record<number, { label: string; value: StoryComplexity }> = {
  0: { label: 'Short Tale', value: 'short-tale' },
  50: { label: 'Multi-Act Saga', value: 'multi-act-saga' },
  100: { label: 'Epic Chronicle', value: 'epic-chronicle' },
};

interface StoryFormProps {
  onGenerate: (data: StoryFormData) => void;
  onRandomGenerate: () => void;
  isGenerating: boolean;
}

export function StoryForm({ onGenerate, onRandomGenerate, isGenerating }: StoryFormProps) {
  const [storyType, setStoryType] = useState<StoryType>('quest-line');
  const [tone, setTone] = useState<StoryTone>('epic');
  const [selectedThemes, setSelectedThemes] = useState<ThemeTag[]>([]);
  const [complexityValue, setComplexityValue] = useState([50]);
  const [setting, setSetting] = useState('');
  const [format, setFormat] = useState<StoryFormat>('structured');

  const toggleTheme = (theme: ThemeTag) => {
    setSelectedThemes((prev) =>
      prev.includes(theme) ? prev.filter((t) => t !== theme) : [...prev, theme]
    );
  };

  const getComplexity = (): StoryComplexity => {
    const value = complexityValue[0];
    if (value <= 25) return 'short-tale';
    if (value <= 75) return 'multi-act-saga';
    return 'epic-chronicle';
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onGenerate({
      storyType,
      themes: selectedThemes.length > 0 ? selectedThemes : ['magic', 'lore'],
      tone,
      complexity: getComplexity(),
      setting: setting || undefined,
      format,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Story Type */}
      <div className="space-y-2">
        <Label className="font-display text-sm uppercase tracking-wider text-foreground">
          Story Type
        </Label>
        <Select value={storyType} onValueChange={(v) => setStoryType(v as StoryType)}>
          <SelectTrigger className="medieval-border bg-card">
            <SelectValue placeholder="Select story type" />
          </SelectTrigger>
          <SelectContent>
            {STORY_TYPES.map((type) => (
              <SelectItem key={type.value} value={type.value}>
                <span className="mr-2">{type.icon}</span>
                {type.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Tone */}
      <div className="space-y-2">
        <Label className="font-display text-sm uppercase tracking-wider text-foreground">
          Tone
        </Label>
        <div className="flex flex-wrap gap-2">
          {TONES.map((t) => (
            <Badge
              key={t.value}
              variant={tone === t.value ? 'default' : 'outline'}
              className={`cursor-pointer transition-all font-body ${
                tone === t.value
                  ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                  : 'hover:bg-secondary'
              }`}
              onClick={() => setTone(t.value)}
            >
              <span className="mr-1">{t.icon}</span>
              {t.label}
            </Badge>
          ))}
        </div>
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
            Scope
          </Label>
          <span className="text-sm font-body text-gold font-semibold">
            {getComplexity() === 'short-tale' && 'Short Tale'}
            {getComplexity() === 'multi-act-saga' && 'Multi-Act Saga'}
            {getComplexity() === 'epic-chronicle' && 'Epic Chronicle'}
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
          <span>Short</span>
          <span>Saga</span>
          <span>Epic</span>
        </div>
      </div>

      {/* Setting */}
      <div className="space-y-2">
        <Label className="font-display text-sm uppercase tracking-wider text-foreground">
          Setting / Context (optional)
        </Label>
        <Textarea
          placeholder="Describe the setting, era, or specific context for your story..."
          value={setting}
          onChange={(e) => setSetting(e.target.value)}
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
              Weaving Story...
            </>
          ) : (
            <>
              <BookOpen className="mr-2 h-4 w-4" />
              Weave Story
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
          Random Tale
        </Button>
      </div>
    </form>
  );
}
