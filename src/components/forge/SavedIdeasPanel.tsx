import { useState } from 'react';
import { Scroll, Download, FileJson, FileText, Trash2, Search, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { ModIdea, ThemeTag } from '@/types/mod-idea';
import { ModIdeaCard } from './ModIdeaCard';
import { exportAsText, exportAsJSON, downloadFile } from '@/lib/export-utils';
import { useToast } from '@/hooks/use-toast';

interface SavedIdeasPanelProps {
  ideas: ModIdea[];
  onRemoveIdea: (id: string) => void;
  onClearAll: () => void;
}

const ALL_TAGS: ThemeTag[] = ['magic', 'kingdoms', 'dragons', 'quests', 'crafting', 'combat', 'economy', 'exploration', 'necromancy', 'alchemy', 'guilds', 'artifacts'];

export function SavedIdeasPanel({ ideas, onRemoveIdea, onClearAll }: SavedIdeasPanelProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string>('all');
  const { toast } = useToast();

  const filteredIdeas = ideas.filter((idea) => {
    const matchesSearch = searchQuery === '' || 
      idea.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      idea.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTag = selectedTag === 'all' || idea.tags.includes(selectedTag as ThemeTag);
    return matchesSearch && matchesTag;
  });

  const handleExportText = () => {
    const content = exportAsText(filteredIdeas);
    downloadFile(content, 'mod-ideas.txt', 'text/plain');
    toast({
      title: "Exported as Text",
      description: `${filteredIdeas.length} idea(s) exported successfully.`,
    });
  };

  const handleExportJSON = () => {
    const content = exportAsJSON(filteredIdeas);
    downloadFile(content, 'mod-ideas.json', 'application/json');
    toast({
      title: "Exported as JSON",
      description: `${filteredIdeas.length} idea(s) exported successfully.`,
    });
  };

  if (ideas.length === 0) {
    return (
      <div className="text-center py-12">
        <Scroll className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
        <h3 className="font-display text-xl text-muted-foreground mb-2">
          Your Forge is Empty
        </h3>
        <p className="font-body text-sm text-muted-foreground/70">
          Generate and save mod ideas to build your collection.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <h2 className="font-display text-2xl text-foreground flex items-center gap-2">
          <Scroll className="w-6 h-6 text-gold" />
          Saved Ideas ({ideas.length})
        </h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExportText} className="font-display text-xs">
            <FileText className="mr-1.5 h-4 w-4" />
            Export TXT
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportJSON} className="font-display text-xs">
            <FileJson className="mr-1.5 h-4 w-4" />
            Export JSON
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm" className="font-display text-xs">
                <Trash2 className="mr-1.5 h-4 w-4" />
                Clear All
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="font-display">Clear All Saved Ideas?</AlertDialogTitle>
                <AlertDialogDescription className="font-body">
                  This will permanently remove all {ideas.length} saved ideas from your Forge. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="font-display">Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={onClearAll} className="font-display">
                  Clear All
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search ideas..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 font-body"
          />
        </div>
        <Select value={selectedTag} onValueChange={setSelectedTag}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <Filter className="mr-2 h-4 w-4" />
            <SelectValue placeholder="Filter by tag" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Tags</SelectItem>
            {ALL_TAGS.map((tag) => (
              <SelectItem key={tag} value={tag} className="capitalize">
                {tag}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Results */}
      {filteredIdeas.length === 0 ? (
        <div className="text-center py-8">
          <p className="font-body text-muted-foreground">
            No ideas match your search or filter.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filteredIdeas.map((idea) => (
            <ModIdeaCard
              key={idea.id}
              idea={idea}
              isSaved={true}
              onSave={() => {}}
              onRemove={() => onRemoveIdea(idea.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}