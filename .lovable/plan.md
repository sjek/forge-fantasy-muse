## Plan: Add All OpenMW Built-in Interfaces

### Overview
OpenMW exposes 13 built-in interfaces (per API v135). The generator currently references only 4 (AI, Controls, Camera, Activation) with partial method coverage. Add the full catalog to the edge function so generated code uses correct interfaces, and expose them as selectable in the generator form (mirroring the API Packages section).

### Complete Interface Catalog

| Interface | Context | Purpose |
|---|---|---|
| Activation | global | Extend/override activation mechanics |
| AI | local | Control NPC/creature AI packages |
| AnimationController | local | Control NPC/creature animations |
| Camera | player | Alter built-in camera behavior |
| Combat | local | Control NPC/creature combat |
| Controls | player | Alter player controls |
| Crimes | global | Commit crimes |
| GamepadControls | player | Alter gamepad controls |
| ItemUsage | global | Extend/override item usage mechanics |
| MWUI | menu, player | Morrowind-style UI templates |
| Settings | global, menu, player | Save/display/track settings |
| SkillProgression | player | Control player skill progression |
| UI | player | High-level UI modes |

### Changes

#### 1. `src/types/mod-idea.ts` — Add `OpenMWInterface` type
```typescript
export type OpenMWInterface =
  | 'Activation' | 'AI' | 'AnimationController' | 'Camera'
  | 'Combat' | 'Controls' | 'Crimes' | 'GamepadControls'
  | 'ItemUsage' | 'MWUI' | 'Settings' | 'SkillProgression' | 'UI';
```
Add optional `interfaces?: OpenMWInterface[]` field to `GeneratorFormData`.

#### 2. `src/components/forge/GeneratorForm.tsx` — Add "Interfaces" collapsible section
Add a new collapsible section below "API Packages" using the same pattern:
- Each interface shown as a badge with context indicator (Global / Local / Player / Menu)
- Tooltip with description
- Include selected interfaces in the submitted form data

#### 3. `supabase/functions/generate-mod-idea/index.ts` — Add `INTERFACE_CATALOG`
Replace the current 3-entry `INTERFACE_TEMPLATES` with a comprehensive catalog containing all 13 interfaces. Each entry:
- Name, context, one-line description
- Key methods with correct signatures
- Doc link
- Small example snippet

Interface methods to document (from official docs):
- **Activation** (global): `addHandlerForObject(obj, handler)`, `addHandlerForType(type, handler)`, `addHandlerForAll(handler)` — handler `(object, actor) → bool|nil`
- **AI** (local): `startPackage({type, target, destPosition, ...})`, `getActivePackage()`, `getActiveTarget(type)`, `removePackages(type)`, `filterPackages(fn)`
- **AnimationController** (local): `playBlendedAnimation(group, opts)`, `hasAnimation(group)`, animation state hooks
- **Camera** (player): `disableModeControl(tag)`, `disableZoom(tag)`, `disableHeadBobbing(tag)`, `disableStandingPreview(tag)`, `disableThirdPersonOffsetControl(tag)` + `enable*` counterparts
- **Combat** (local): `addOnHitHandler(fn)`, `onHit(attackInfo)`, `getArmorRating(actor)`, damage modifier hooks
- **Controls** (player): `overrideMovementControls(bool)`, `overrideCombatControls(bool)`, `overrideUiControls(bool)`
- **Crimes** (global): `commitCrime(actor, {type, victim, arg})`, crime types constants
- **GamepadControls** (player): binding overrides, deadzone config
- **ItemUsage** (global): `addHandlerForType(type, handler)`, `addHandlerForModel(model, handler)`
- **MWUI** (menu, player): `templates.textNormal`, `templates.textHeader`, `templates.textParagraph`, `templates.borders`, `templates.padding`, `templates.horizontalLine`
- **Settings** (global, menu, player): `registerPage({key, l10n, name, description})`, `registerGroup({key, page, l10n, name, settings})`, setting types
- **SkillProgression** (player): `skillLevelUpHandler`, XP hooks, custom skill support
- **UI** (player): `addMode(name, opts)`, `removeMode(name)`, mode stack management

Update system prompt to enumerate these interfaces so the AI selects the correct one for a given mod concept.

#### 4. Edge function — respect `interfaces` selection
When the request includes `interfaces`, add a section to the user prompt: `"Prioritize these built-in interfaces: <list>. Use their documented methods in the code examples."`

### File Summary

| File | Change |
|---|---|
| `src/types/mod-idea.ts` | Add `OpenMWInterface` type; add `interfaces?` to `GeneratorFormData` |
| `src/components/forge/GeneratorForm.tsx` | Add "Interfaces" collapsible with 13 badges + context colors |
| `supabase/functions/generate-mod-idea/index.ts` | Replace `INTERFACE_TEMPLATES` with full 13-interface `INTERFACE_CATALOG`; wire `interfaces` param into prompt |