import { useState } from 'react';
import { Bookmark, BookmarkCheck, Share2, ChevronDown, ChevronUp, Users, ScrollText, Link2, Copy, Check } from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { StoryEntry } from '@/types/mod-idea';
import { copyToClipboard } from '@/lib/export-utils';
import { useToast } from '@/hooks/use-toast';

interface StoryCardProps {
  story: StoryEntry;
  isSaved: boolean;
  onSave: () => void;
  onRemove: () => void;
}

const TONE_COLORS: Record<string, string> = {
  epic: 'bg-gold/20 text-gold border-gold/30',
  dark: 'bg-burgundy/20 text-burgundy border-burgundy/30',
  comedic: 'bg-forest/20 text-forest border-forest/30',
  mysterious: 'bg-accent/20 text-accent-foreground border-accent/30',
  tragic: 'bg-burgundy/20 text-burgundy border-burgundy/30',
};

const STORY_TYPE_LABELS: Record<string, string> = {
  'quest-line': '📜 Quest Line',
  'npc-backstory': '👤 NPC Backstory',
  'lore-entry': '📖 Lore Entry',
  'world-event': '🌍 World Event',
  'faction-history': '🏛️ Faction History',
};

export function StoryCard({ story, isSaved, onSave, onRemove }: StoryCardProps) {
  const [isActsOpen, setIsActsOpen] = useState(false);
  const [isCharsOpen, setIsCharsOpen] = useState(false);
  const [isConnectionsOpen, setIsConnectionsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const handleShare = async () => {
    const text = formatStoryAsText(story);
    try {
      await copyToClipboard(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({ title: "Copied to Clipboard", description: "Story copied. Share it with fellow storytellers!" });
    } catch {
      toast({ title: "Copy Failed", description: "Could not copy to clipboard.", variant: "destructive" });
    }
  };

  const handleSaveToggle = () => {
    if (isSaved) {
      onRemove();
      toast({ title: "Removed", description: "Story removed from your collection." });
    } else {
      onSave();
      toast({ title: "Saved to Forge", description: "Story added to your collection!" });
    }
  };

  return (
    <Card className="medieval-border bg-card parchment-texture fade-in overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="font-display text-xl text-foreground leading-tight">
            {story.title}
          </CardTitle>
          <div className="flex gap-1.5 shrink-0">
            <Badge variant="outline" className={`text-xs font-body ${TONE_COLORS[story.tone] || ''}`}>
              {story.tone}
            </Badge>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5 mt-2">
          <Badge variant="secondary" className="font-body text-xs">
            {STORY_TYPE_LABELS[story.storyType] || story.storyType}
          </Badge>
          {story.themes.map((tag) => (
            <Badge key={tag} variant="secondary" className="font-body text-xs capitalize">
              {tag}
            </Badge>
          ))}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <p className="font-body text-foreground/90 leading-relaxed">{story.synopsis}</p>

        {/* Acts */}
        <Collapsible open={isActsOpen} onOpenChange={setIsActsOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="w-full justify-between font-display text-xs uppercase tracking-wider">
              <span className="flex items-center gap-1.5">
                <ScrollText className="h-4 w-4" />
                Story Acts ({story.acts.length})
              </span>
              {isActsOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2 space-y-3">
            {story.acts.map((act, idx) => (
              <div key={idx} className="bg-secondary/50 rounded-md p-3 space-y-1.5">
                <h5 className="font-display text-sm font-semibold text-foreground">
                  Act {idx + 1}: {act.title}
                </h5>
                <p className="font-body text-sm text-muted-foreground">{act.description}</p>
                {act.keyEvents.length > 0 && (
                  <ul className="space-y-1 mt-2">
                    {act.keyEvents.map((event, eIdx) => (
                      <li key={eIdx} className="flex items-start gap-2 font-body text-xs text-foreground/80">
                        <span className="text-gold mt-0.5">✦</span>
                        {event}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </CollapsibleContent>
        </Collapsible>

        {/* Characters */}
        {story.characters.length > 0 && (
          <Collapsible open={isCharsOpen} onOpenChange={setIsCharsOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="w-full justify-between font-display text-xs uppercase tracking-wider">
                <span className="flex items-center gap-1.5">
                  <Users className="h-4 w-4" />
                  Characters ({story.characters.length})
                </span>
                {isCharsOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2 space-y-2">
              {story.characters.map((char, idx) => (
                <div key={idx} className="bg-secondary/50 rounded-md p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-display text-sm font-semibold text-foreground">{char.name}</span>
                    <Badge variant="outline" className="text-[10px] font-body">{char.role}</Badge>
                  </div>
                  <p className="font-body text-xs text-muted-foreground">{char.description}</p>
                </div>
              ))}
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Lore Notes */}
        {story.loreNotes.length > 0 && (
          <div>
            <h4 className="font-display text-sm uppercase tracking-wider text-muted-foreground mb-2">
              Lore Notes
            </h4>
            <ul className="space-y-1.5">
              {story.loreNotes.map((note, idx) => (
                <li key={idx} className="flex items-start gap-2 font-body text-sm text-foreground/85">
                  <span className="text-gold mt-0.5">📜</span>
                  {note}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Mod Connections */}
        {story.connections.length > 0 && (
          <Collapsible open={isConnectionsOpen} onOpenChange={setIsConnectionsOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="w-full justify-between font-display text-xs uppercase tracking-wider">
                <span className="flex items-center gap-1.5">
                  <Link2 className="h-4 w-4" />
                  Mod Connections ({story.connections.length})
                </span>
                {isConnectionsOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2 space-y-1.5">
              {story.connections.map((conn, idx) => (
                <div key={idx} className="flex items-start gap-2 bg-secondary/50 rounded-md p-2">
                  <span className="text-gold mt-0.5">⚙️</span>
                  <p className="font-body text-sm text-foreground/85">{conn}</p>
                </div>
              ))}
            </CollapsibleContent>
          </Collapsible>
        )}
      </CardContent>

      <CardFooter className="pt-3 gap-2">
        <Button
          variant={isSaved ? "default" : "outline"}
          size="sm"
          onClick={handleSaveToggle}
          className="flex-1 font-display text-xs uppercase tracking-wider"
        >
          {isSaved ? (
            <><BookmarkCheck className="mr-1.5 h-4 w-4" />Saved</>
          ) : (
            <><Bookmark className="mr-1.5 h-4 w-4" />Save Story</>
          )}
        </Button>
        <Button variant="outline" size="sm" onClick={handleShare} className="font-display text-xs uppercase tracking-wider">
          {copied ? <Check className="h-4 w-4" /> : <><Share2 className="mr-1.5 h-4 w-4" />Share</>}
        </Button>
      </CardFooter>
    </Card>
  );
}

function formatStoryAsText(story: StoryEntry): string {
  const acts = story.acts.map((a, i) => {
    const events = a.keyEvents.map((e) => `    ✦ ${e}`).join('\n');
    return `  Act ${i + 1}: ${a.title}\n  ${a.description}\n${events}`;
  }).join('\n\n');

  const chars = story.characters.map((c) => `  • ${c.name} (${c.role}): ${c.description}`).join('\n');

  return `═══════════════════════════════════════════════════
📖 ${story.title}
═══════════════════════════════════════════════════

${story.synopsis}

📜 Story Acts:
${acts}

👥 Characters:
${chars}

📚 Lore Notes:
${story.loreNotes.map((n) => `  • ${n}`).join('\n')}

⚙️ Mod Connections:
${story.connections.map((c) => `  • ${c}`).join('\n')}

🏷️ Type: ${story.storyType} | Tone: ${story.tone}
🏷️ Themes: ${story.themes.join(', ')}
📅 Created: ${new Date(story.createdAt).toLocaleDateString()}`;
}
