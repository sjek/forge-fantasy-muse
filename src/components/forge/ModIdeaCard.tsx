import { useState } from 'react';
import { Bookmark, BookmarkCheck, Share2, ChevronDown, ChevronUp, ExternalLink, Copy, Check } from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ModIdea } from '@/types/mod-idea';
import { copyToClipboard, exportAsText } from '@/lib/export-utils';
import { useToast } from '@/hooks/use-toast';

interface ModIdeaCardProps {
  idea: ModIdea;
  isSaved: boolean;
  onSave: () => void;
  onRemove: () => void;
}

const COMPLEXITY_COLORS: Record<string, string> = {
  simple: 'bg-forest/20 text-forest border-forest/30',
  'quest-mod': 'bg-gold/20 text-gold border-gold/30',
  overhaul: 'bg-burgundy/20 text-burgundy border-burgundy/30',
};

const COMPLEXITY_LABELS: Record<string, string> = {
  simple: 'Simple Tweak',
  'quest-mod': 'Quest Mod',
  overhaul: 'Full Overhaul',
};

export function ModIdeaCard({ idea, isSaved, onSave, onRemove }: ModIdeaCardProps) {
  const [isHintsOpen, setIsHintsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copiedHintIndex, setCopiedHintIndex] = useState<number | null>(null);
  const { toast } = useToast();

  const handleCopyCode = async (code: string, index: number) => {
    try {
      await copyToClipboard(code);
      setCopiedHintIndex(index);
      toast({
        title: "Code Copied",
        description: "Lua code copied to clipboard!",
      });
      setTimeout(() => setCopiedHintIndex(null), 2000);
    } catch (err) {
      toast({
        title: "Copy Failed",
        description: "Could not copy code to clipboard.",
        variant: "destructive",
      });
    }
  };

  const handleShare = async () => {
    const text = exportAsText([idea]);
    try {
      await copyToClipboard(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({
        title: "Copied to Clipboard",
        description: "Mod idea has been copied. Share it with fellow adventurers!",
      });
    } catch (err) {
      toast({
        title: "Copy Failed",
        description: "Could not copy to clipboard. Try again.",
        variant: "destructive",
      });
    }
  };

  const handleSaveToggle = () => {
    if (isSaved) {
      onRemove();
      toast({
        title: "Removed from Forge",
        description: "The idea has been removed from your saved collection.",
      });
    } else {
      onSave();
      toast({
        title: "Saved to Forge",
        description: "The idea has been added to your collection!",
      });
    }
  };

  return (
    <Card className="medieval-border bg-card parchment-texture fade-in overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="font-display text-xl text-foreground leading-tight">
            {idea.title}
          </CardTitle>
          <Badge 
            variant="outline" 
            className={`shrink-0 font-body text-xs ${COMPLEXITY_COLORS[idea.complexity]}`}
          >
            {COMPLEXITY_LABELS[idea.complexity]}
          </Badge>
        </div>
        <div className="flex flex-wrap gap-1.5 mt-2">
          {idea.tags.map((tag) => (
            <Badge key={tag} variant="secondary" className="font-body text-xs capitalize">
              {tag}
            </Badge>
          ))}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <p className="font-body text-foreground/90 leading-relaxed">
          {idea.description}
        </p>

        <div>
          <h4 className="font-display text-sm uppercase tracking-wider text-muted-foreground mb-2">
            Key Features
          </h4>
          <ul className="space-y-1.5">
            {idea.features.map((feature, idx) => (
              <li key={idx} className="flex items-start gap-2 font-body text-sm text-foreground/85">
                <span className="text-gold mt-0.5">✦</span>
                {feature}
              </li>
            ))}
          </ul>
        </div>

        <Collapsible open={isHintsOpen} onOpenChange={setIsHintsOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="w-full justify-between font-display text-xs uppercase tracking-wider">
              OpenMW Implementation Hints
              {isHintsOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2 space-y-3">
            {idea.implementationHints.map((hint, idx) => (
              <div key={idx} className="bg-secondary/50 rounded-md p-3 space-y-1.5">
                <h5 className="font-display text-sm font-semibold text-foreground">
                  {hint.title}
                </h5>
                <p className="font-body text-sm text-muted-foreground">
                  {hint.description}
                </p>
                {hint.luaExample && (
                  <div className="mt-2 rounded-md overflow-hidden border border-border/50">
                    <div className="flex items-center justify-between bg-secondary/80 px-3 py-1.5">
                      <span className="text-xs font-mono text-muted-foreground">Lua</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
                        onClick={() => handleCopyCode(hint.luaExample!, idx)}
                      >
                        {copiedHintIndex === idx ? (
                          <>
                            <Check className="h-3 w-3 mr-1 text-forest" />
                            Copied!
                          </>
                        ) : (
                          <>
                            <Copy className="h-3 w-3 mr-1" />
                            Copy
                          </>
                        )}
                      </Button>
                    </div>
                    <pre className="bg-background/80 p-3 text-xs font-mono text-foreground overflow-x-auto">
                      <code>{hint.luaExample}</code>
                    </pre>
                  </div>
                )}
                {hint.docLink && (
                  <a
                    href={hint.docLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-gold hover:underline font-body"
                  >
                    <ExternalLink className="h-3 w-3" />
                    OpenMW Documentation
                  </a>
                )}
              </div>
            ))}
          </CollapsibleContent>
        </Collapsible>
      </CardContent>

      <CardFooter className="pt-3 gap-2">
        <Button
          variant={isSaved ? "default" : "outline"}
          size="sm"
          onClick={handleSaveToggle}
          className="flex-1 font-display text-xs uppercase tracking-wider"
        >
          {isSaved ? (
            <>
              <BookmarkCheck className="mr-1.5 h-4 w-4" />
              Saved
            </>
          ) : (
            <>
              <Bookmark className="mr-1.5 h-4 w-4" />
              Save to Forge
            </>
          )}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleShare}
          className="font-display text-xs uppercase tracking-wider"
        >
          {copied ? (
            <Check className="h-4 w-4" />
          ) : (
            <>
              <Share2 className="mr-1.5 h-4 w-4" />
              Share
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}