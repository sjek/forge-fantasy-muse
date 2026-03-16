import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Wand2, Scroll, BookOpen } from 'lucide-react';
import { Header } from '@/components/forge/Header';
import { GeneratorForm, GeneratorPrefill } from '@/components/forge/GeneratorForm';
import { ModIdeaCard } from '@/components/forge/ModIdeaCard';
import { SavedIdeasPanel } from '@/components/forge/SavedIdeasPanel';
import { StoryForm } from '@/components/forge/StoryForm';
import { StoryCard } from '@/components/forge/StoryCard';
import { SavedStoriesPanel } from '@/components/forge/SavedStoriesPanel';
import { useSavedIdeas } from '@/hooks/useSavedIdeas';
import { useSavedStories } from '@/hooks/useSavedStories';
import { ModIdea, GeneratorFormData, StoryEntry, StoryFormData } from '@/types/mod-idea';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export default function Index() {
  const [generatedIdea, setGeneratedIdea] = useState<ModIdea | null>(null);
  const [generatedStory, setGeneratedStory] = useState<StoryEntry | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingStory, setIsGeneratingStory] = useState(false);
  const { savedIdeas, saveIdea, removeIdea, isIdeaSaved, clearAllIdeas } = useSavedIdeas();
  const { savedStories, saveStory, removeStory, isStorySaved, clearAllStories } = useSavedStories();
  const { toast } = useToast();

  const generateIdea = async (data: GeneratorFormData | { isRandom: true }) => {
    setIsGenerating(true);
    setGeneratedIdea(null);
    try {
      const { data: result, error } = await supabase.functions.invoke('generate-mod-idea', { body: data });
      if (error) throw new Error(error.message || 'Failed to generate idea');
      if (result.error) throw new Error(result.error);
      setGeneratedIdea(result);
      toast({ title: "Idea Forged!", description: `"${result.title}" has been conjured from the forge.` });
    } catch (err) {
      console.error('Generation error:', err);
      toast({ title: "Forge Failed", description: err instanceof Error ? err.message : 'Could not generate mod idea.', variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  };

  const generateStory = async (data: StoryFormData | { isRandom: true }) => {
    setIsGeneratingStory(true);
    setGeneratedStory(null);
    try {
      const { data: result, error } = await supabase.functions.invoke('generate-story', { body: data });
      if (error) throw new Error(error.message || 'Failed to generate story');
      if (result.error) throw new Error(result.error);
      setGeneratedStory(result);
      toast({ title: "Story Woven!", description: `"${result.title}" has been woven from the loom.` });
    } catch (err) {
      console.error('Story generation error:', err);
      toast({ title: "Story Failed", description: err instanceof Error ? err.message : 'Could not generate story.', variant: "destructive" });
    } finally {
      setIsGeneratingStory(false);
    }
  };

  return (
    <div className="min-h-screen bg-background parchment-texture">
      <div className="container max-w-6xl mx-auto px-4 pb-12">
        <Header />

        <Tabs defaultValue="generator" className="w-full">
          <TabsList className="grid w-full max-w-lg mx-auto grid-cols-3 mb-8">
            <TabsTrigger value="generator" className="font-display flex items-center gap-2">
              <Wand2 className="h-4 w-4" />
              Generator
            </TabsTrigger>
            <TabsTrigger value="storyboard" className="font-display flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              Story Board
            </TabsTrigger>
            <TabsTrigger value="saved" className="font-display flex items-center gap-2">
              <Scroll className="h-4 w-4" />
              Saved ({savedIdeas.length + savedStories.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="generator" className="space-y-8">
            <div className="grid lg:grid-cols-2 gap-8">
              <Card className="medieval-border bg-card/80 parchment-texture">
                <CardContent className="pt-6">
                  <h2 className="font-display text-xl mb-6 text-foreground flex items-center gap-2">
                    <span className="text-gold">⚒</span>
                    Mod Idea Forge
                  </h2>
                  <GeneratorForm
                    onGenerate={(data) => generateIdea(data)}
                    onRandomGenerate={() => generateIdea({ isRandom: true })}
                    isGenerating={isGenerating}
                  />
                </CardContent>
              </Card>

              <div className="space-y-4">
                <h2 className="font-display text-xl text-foreground flex items-center gap-2">
                  <span className="text-gold">✦</span>
                  Forged Creation
                </h2>
                {generatedIdea ? (
                  <ModIdeaCard
                    idea={generatedIdea}
                    isSaved={isIdeaSaved(generatedIdea.id)}
                    onSave={() => saveIdea(generatedIdea)}
                    onRemove={() => removeIdea(generatedIdea.id)}
                  />
                ) : (
                  <Card className="medieval-border bg-card/50 parchment-texture">
                    <CardContent className="py-16 text-center">
                      <Wand2 className="w-12 h-12 mx-auto text-muted-foreground/40 mb-4" />
                      <p className="font-body text-muted-foreground">
                        {isGenerating ? "The forge is working its magic..." : "Your forged mod idea will appear here."}
                      </p>
                      <p className="font-body text-sm text-muted-foreground/70 mt-2">
                        Configure your preferences and click "Forge Mod Idea"
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="storyboard" className="space-y-8">
            <div className="grid lg:grid-cols-2 gap-8">
              <Card className="medieval-border bg-card/80 parchment-texture">
                <CardContent className="pt-6">
                  <h2 className="font-display text-xl mb-6 text-foreground flex items-center gap-2">
                    <span className="text-gold">📖</span>
                    Story Loom
                  </h2>
                  <StoryForm
                    onGenerate={(data) => generateStory(data)}
                    onRandomGenerate={() => generateStory({ isRandom: true })}
                    isGenerating={isGeneratingStory}
                  />
                </CardContent>
              </Card>

              <div className="space-y-4">
                <h2 className="font-display text-xl text-foreground flex items-center gap-2">
                  <span className="text-gold">✦</span>
                  Woven Tale
                </h2>
                {generatedStory ? (
                  <StoryCard
                    story={generatedStory}
                    isSaved={isStorySaved(generatedStory.id)}
                    onSave={() => saveStory(generatedStory)}
                    onRemove={() => removeStory(generatedStory.id)}
                  />
                ) : (
                  <Card className="medieval-border bg-card/50 parchment-texture">
                    <CardContent className="py-16 text-center">
                      <BookOpen className="w-12 h-12 mx-auto text-muted-foreground/40 mb-4" />
                      <p className="font-body text-muted-foreground">
                        {isGeneratingStory ? "The loom is weaving your tale..." : "Your woven story will appear here."}
                      </p>
                      <p className="font-body text-sm text-muted-foreground/70 mt-2">
                        Set your narrative preferences and click "Weave Story"
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="saved" className="space-y-8">
            <SavedIdeasPanel
              ideas={savedIdeas}
              onRemoveIdea={removeIdea}
              onClearAll={clearAllIdeas}
            />
            <SavedStoriesPanel
              stories={savedStories}
              onRemoveStory={removeStory}
              onClearAll={clearAllStories}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
