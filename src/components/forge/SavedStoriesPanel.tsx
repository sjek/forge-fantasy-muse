import { useState } from 'react';
import { BookOpen, FileJson, FileText, Trash2, Search, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { StoryEntry, StoryType } from '@/types/mod-idea';
import { StoryCard } from './StoryCard';
import { downloadFile } from '@/lib/export-utils';
import { useToast } from '@/hooks/use-toast';

interface SavedStoriesPanelProps {
  stories: StoryEntry[];
  onRemoveStory: (id: string) => void;
  onClearAll: () => void;
  onConvertToMod?: (story: StoryEntry, selectedConnections: string[]) => void;
}

const STORY_TYPES: { value: StoryType; label: string }[] = [
  { value: 'quest-line', label: 'Quest Line' },
  { value: 'npc-backstory', label: 'NPC Backstory' },
  { value: 'lore-entry', label: 'Lore Entry' },
  { value: 'world-event', label: 'World Event' },
  { value: 'faction-history', label: 'Faction History' },
];

export function SavedStoriesPanel({ stories, onRemoveStory, onClearAll, onConvertToMod }: SavedStoriesPanelProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const { toast } = useToast();

  const filteredStories = stories.filter((story) => {
    const matchesSearch = searchQuery === '' ||
      story.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      story.synopsis.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = selectedType === 'all' || story.storyType === selectedType;
    return matchesSearch && matchesType;
  });

  const handleExportText = () => {
    const content = filteredStories.map(s => `${s.title}\n${s.synopsis}\n`).join('\n---\n\n');
    downloadFile(content, 'stories.txt', 'text/plain');
    toast({ title: "Exported as Text", description: `${filteredStories.length} story(ies) exported.` });
  };

  const handleExportJSON = () => {
    downloadFile(JSON.stringify(filteredStories, null, 2), 'stories.json', 'application/json');
    toast({ title: "Exported as JSON", description: `${filteredStories.length} story(ies) exported.` });
  };

  if (stories.length === 0) {
    return (
      <div className="text-center py-12">
        <BookOpen className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
        <h3 className="font-display text-xl text-muted-foreground mb-2">No Stories Yet</h3>
        <p className="font-body text-sm text-muted-foreground/70">
          Weave stories on the Story Board to build your collection.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <h3 className="font-display text-lg text-foreground flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-gold" />
          Saved Stories ({stories.length})
        </h3>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExportText} className="font-display text-xs">
            <FileText className="mr-1.5 h-4 w-4" />Export TXT
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportJSON} className="font-display text-xs">
            <FileJson className="mr-1.5 h-4 w-4" />Export JSON
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm" className="font-display text-xs">
                <Trash2 className="mr-1.5 h-4 w-4" />Clear All
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="font-display">Clear All Saved Stories?</AlertDialogTitle>
                <AlertDialogDescription className="font-body">
                  This will permanently remove all {stories.length} saved stories. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="font-display">Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={onClearAll} className="font-display">Clear All</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search stories..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 font-body"
          />
        </div>
        <Select value={selectedType} onValueChange={setSelectedType}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <Filter className="mr-2 h-4 w-4" />
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {STORY_TYPES.map((type) => (
              <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filteredStories.length === 0 ? (
        <div className="text-center py-8">
          <p className="font-body text-muted-foreground">No stories match your search or filter.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filteredStories.map((story) => (
            <StoryCard
              key={story.id}
              story={story}
              isSaved={true}
              onSave={() => {}}
              onRemove={() => onRemoveStory(story.id)}
              onConvertToMod={onConvertToMod}
            />
          ))}
        </div>
      )}
    </div>
  );
}
