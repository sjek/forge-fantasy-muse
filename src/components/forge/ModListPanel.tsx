import { useState } from 'react';
import { List, Copy, Check, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ModListItem } from '@/types/mod-idea';

export function ModListPanel() {
  const [topic, setTopic] = useState('');
  const [count, setCount] = useState('10');
  const [mods, setMods] = useState<ModListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const generate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) return;
    setLoading(true);
    setMods([]);
    try {
      const { data, error } = await supabase.functions.invoke('generate-mod-list', {
        body: { topic: topic.trim(), count: Number(count) },
      });
      if (error) {
        let msg = error.message;
        try { msg = JSON.parse(await (error as any).context.text()).error ?? msg; } catch { /* ignore */ }
        throw new Error(msg);
      }
      if (data.error) throw new Error(data.error);
      setMods(data.mods);
    } catch (err) {
      toast({ title: 'List Failed', description: err instanceof Error ? err.message : 'Could not generate list.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const copy = async () => {
    const text = mods.map((m, i) => `${i + 1}. ${m.name} — ${m.summary}`).join('\n');
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="grid lg:grid-cols-2 gap-8">
      <Card className="medieval-border bg-card/80 parchment-texture h-fit">
        <CardContent className="pt-6">
          <h2 className="font-display text-xl mb-6 text-foreground flex items-center gap-2">
            <span className="text-gold">☰</span>
            Mod List
          </h2>
          <form onSubmit={generate} className="space-y-4">
            <Input value={topic} onChange={(e) => setTopic(e.target.value)} maxLength={100} placeholder="Topic, e.g. combat, UI, quests" />
            <Select value={count} onValueChange={setCount}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {['5', '10', '15'].map((c) => <SelectItem key={c} value={c}>{c} mods</SelectItem>)}
              </SelectContent>
            </Select>
            <Button type="submit" disabled={loading || !topic.trim()} className="w-full font-display">
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <List className="mr-2 h-4 w-4" />}
              {loading ? 'Generating...' : 'Generate List'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl text-foreground flex items-center gap-2">
            <span className="text-gold">✦</span>
            Results
          </h2>
          {mods.length > 0 && (
            <Button variant="outline" size="sm" onClick={copy} className="font-display text-xs uppercase tracking-wider">
              {copied ? <Check className="mr-1.5 h-4 w-4" /> : <Copy className="mr-1.5 h-4 w-4" />}
              {copied ? 'Copied!' : 'Copy List'}
            </Button>
          )}
        </div>
        <Card className="medieval-border bg-card/50 parchment-texture">
          <CardContent className="py-6">
            {mods.length === 0 ? (
              <p className="font-body text-muted-foreground text-center py-10">
                {loading ? 'Gathering mods...' : 'Your mod list will appear here.'}
              </p>
            ) : (
              <>
                <ol className="space-y-3 list-decimal pl-5">
                  {mods.map((m, i) => (
                    <li key={i} className="font-body">
                      <span className="font-display text-foreground">{m.name}</span>
                      <p className="text-sm text-muted-foreground">{m.summary}</p>
                    </li>
                  ))}
                </ol>
                <p className="mt-6 text-xs text-muted-foreground/80 italic">
                  Names and summaries come from AI and may be outdated — check Nexus Mods before relying on them.
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
