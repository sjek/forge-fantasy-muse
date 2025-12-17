import { Sword, Shield } from 'lucide-react';

export function Header() {
  return (
    <header className="text-center py-8 px-4">
      <div className="flex items-center justify-center gap-4 mb-4">
        <Shield className="w-10 h-10 text-burgundy" />
        <h1 className="text-4xl md:text-5xl font-display font-bold text-foreground text-shadow-medieval tracking-wide">
          Fantasy Mod Forge
        </h1>
        <Sword className="w-10 h-10 text-burgundy" />
      </div>
      <p className="text-lg text-muted-foreground font-body max-w-2xl mx-auto">
        Craft unique mod ideas for medieval fantasy games. Powered by ancient wisdom and OpenMW Lua magic.
      </p>
      <div className="mt-4 flex items-center justify-center gap-2">
        <span className="text-sm text-gold font-display">✦</span>
        <span className="text-sm text-muted-foreground italic">
          "From the forge of imagination, legends are born"
        </span>
        <span className="text-sm text-gold font-display">✦</span>
      </div>
    </header>
  );
}