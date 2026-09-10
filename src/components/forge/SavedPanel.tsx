import { useRef } from 'react';
import { Download, Upload, Archive } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ModIdeaCard } from '@/components/forge/ModIdeaCard';
import { StoryCard } from '@/components/forge/StoryCard';
import { ModIdea, StoryEntry } from '@/types/mod-idea';
import { downloadFile, parseBackup } from '@/lib/export-utils';
import { BackupFile } from '@/hooks/useSavedItems';
import { useToast } from '@/hooks/use-toast';

interface SavedPanelProps {
  savedIdeas: ModIdea[];
  savedStories: StoryEntry[];
  onRemoveIdea: (idea: ModIdea) => void;
  onRemoveStory: (story: StoryEntry) => void;
  onConvertToMod: (story: StoryEntry, selectedConnections: string[]) => void;
  buildBackup: () => BackupFile;
  importBackup: (backup: BackupFile) => { addedIdeas: number; addedStories: number };
}

export function SavedPanel({
  savedIdeas,
  savedStories,
  onRemoveIdea,
  onRemoveStory,
  onConvertToMod,
  buildBackup,
  importBackup,
}: SavedPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleDownload = () => {
    const backup = buildBackup();
    const stamp = new Date().toISOString().slice(0, 10);
    downloadFile(JSON.stringify(backup, null, 2), `fantasy-mod-forge-backup-${stamp}.json`, 'application/json');
    toast({
      title: 'Backup Downloaded',
      description: `${backup.ideas.length} idea(s) and ${backup.stories.length} story(ies) saved to a file.`,
    });
  };

  const handleFile = async (file: File) => {
    try {
      const text = await file.text();
      const backup = parseBackup(text);
      const { addedIdeas, addedStories } = importBackup(backup);
      toast({
        title: 'Backup Loaded',
        description: `Added ${addedIdeas} idea(s) and ${addedStories} story(ies). Duplicates were skipped.`,
      });
    } catch (err) {
      toast({
        title: 'Could Not Load Backup',
        description: err instanceof Error ? err.message : 'The file could not be read.',
        variant: 'destructive',
      });
    }
  };

  const isEmpty = savedIdeas.length === 0 && savedStories.length === 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-xl text-foreground flex items-center gap-2">
          <span className="text-gold">✦</span>
          Your Archive
        </h2>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownload}
            disabled={isEmpty}
            className="font-display text-xs uppercase tracking-wider"
          >
            <Download className="mr-1.5 h-4 w-4" />
            Download Backup
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            className="font-display text-xs uppercase tracking-wider"
          >
            <Upload className="mr-1.5 h-4 w-4" />
            Load Backup
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
              e.target.value = '';
            }}
          />
        </div>
      </div>

      {isEmpty ? (
        <Card className="medieval-border bg-card/50 parchment-texture">
          <CardContent className="py-16 text-center">
            <Archive className="w-12 h-12 mx-auto text-muted-foreground/40 mb-4" />
            <p className="font-body text-muted-foreground">Nothing saved yet.</p>
            <p className="font-body text-sm text-muted-foreground/70 mt-2">
              Forge an idea or weave a story, then press Save to keep it here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="ideas" className="w-full">
          <TabsList className="grid w-full max-w-sm grid-cols-2 mb-6">
            <TabsTrigger value="ideas" className="font-display">
              Mod Ideas ({savedIdeas.length})
            </TabsTrigger>
            <TabsTrigger value="stories" className="font-display">
              Stories ({savedStories.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="ideas" className="grid md:grid-cols-2 gap-6">
            {savedIdeas.length === 0 ? (
              <p className="font-body text-muted-foreground">No saved mod ideas.</p>
            ) : (
              savedIdeas.map((idea) => (
                <ModIdeaCard key={idea.id} idea={idea} isSaved onRemove={onRemoveIdea} />
              ))
            )}
          </TabsContent>

          <TabsContent value="stories" className="grid md:grid-cols-2 gap-6">
            {savedStories.length === 0 ? (
              <p className="font-body text-muted-foreground">No saved stories.</p>
            ) : (
              savedStories.map((story) => (
                <StoryCard
                  key={story.id}
                  story={story}
                  isSaved
                  onRemove={onRemoveStory}
                  onConvertToMod={onConvertToMod}
                />
              ))
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
