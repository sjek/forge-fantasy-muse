import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Wand2, Scroll } from 'lucide-react';
import { Header } from '@/components/forge/Header';
import { GeneratorForm } from '@/components/forge/GeneratorForm';
import { ModIdeaCard } from '@/components/forge/ModIdeaCard';
import { SavedIdeasPanel } from '@/components/forge/SavedIdeasPanel';
import { useSavedIdeas } from '@/hooks/useSavedIdeas';
import { ModIdea, GeneratorFormData } from '@/types/mod-idea';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export default function Index() {
  const [generatedIdea, setGeneratedIdea] = useState<ModIdea | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const { savedIdeas, saveIdea, removeIdea, isIdeaSaved, clearAllIdeas } = useSavedIdeas();
  const { toast } = useToast();

  const generateIdea = async (data: GeneratorFormData | { isRandom: true }) => {
    setIsGenerating(true);
    setGeneratedIdea(null);

    try {
      const { data: result, error } = await supabase.functions.invoke('generate-mod-idea', {
        body: data,
      });

      if (error) {
        throw new Error(error.message || 'Failed to generate idea');
      }

      if (result.error) {
        throw new Error(result.error);
      }

      setGeneratedIdea(result);
      toast({
        title: "Idea Forged!",
        description: `"${result.title}" has been conjured from the forge.`,
      });
    } catch (err) {
      console.error('Generation error:', err);
      toast({
        title: "Forge Failed",
        description: err instanceof Error ? err.message : 'Could not generate mod idea. Try again.',
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerate = (data: GeneratorFormData) => {
    generateIdea(data);
  };

  const handleRandomGenerate = () => {
    generateIdea({ isRandom: true });
  };

  return (
    <div className="min-h-screen bg-background parchment-texture">
      <div className="container max-w-6xl mx-auto px-4 pb-12">
        <Header />

        <Tabs defaultValue="generator" className="w-full">
          <TabsList className="grid w-full max-w-md mx-auto grid-cols-2 mb-8">
            <TabsTrigger value="generator" className="font-display flex items-center gap-2">
              <Wand2 className="h-4 w-4" />
              Generator
            </TabsTrigger>
            <TabsTrigger value="saved" className="font-display flex items-center gap-2">
              <Scroll className="h-4 w-4" />
              Saved ({savedIdeas.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="generator" className="space-y-8">
            <div className="grid lg:grid-cols-2 gap-8">
              {/* Generator Form */}
              <Card className="medieval-border bg-card/80 parchment-texture">
                <CardContent className="pt-6">
                  <h2 className="font-display text-xl mb-6 text-foreground flex items-center gap-2">
                    <span className="text-gold">⚒</span>
                    Mod Idea Forge
                  </h2>
                  <GeneratorForm
                    onGenerate={handleGenerate}
                    onRandomGenerate={handleRandomGenerate}
                    isGenerating={isGenerating}
                  />
                </CardContent>
              </Card>

              {/* Generated Result */}
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
                        {isGenerating 
                          ? "The forge is working its magic..." 
                          : "Your forged mod idea will appear here."}
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

          <TabsContent value="saved">
            <SavedIdeasPanel
              ideas={savedIdeas}
              onRemoveIdea={removeIdea}
              onClearAll={clearAllIdeas}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}