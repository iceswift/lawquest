# UI Direction

Locked direction for LawQuest UI.

## Direction Name

Imperial Archive

## Product Feel

LawQuest should feel like a calm, premium legal learning workspace rather than a generic content app or a loud gamified product.

## Visual Rules

- Use neutral surfaces with a restrained gold accent.
- Keep spacing disciplined and readable.
- Prefer compact headers and clear hierarchy.
- Use rounded cards, but avoid overly soft or playful shapes.
- Keep motion subtle and functional.
- Use uppercase only where it reinforces structure, not everywhere by default.

## Copy Tone

- Authoritative
- Precise
- Calm
- Legal, but not cold

## Navigation Rules

- Tabs stay persistent and lightweight.
- Reader, Outline, Notes, Calculator, and utility flows should feel like native pages, not overlays stacked on top of each other.
- Avoid bottom-sheet patterns for deep hierarchy.

## Do Not Use

- Purple-as-default UI language
- Heavy skeuomorphic effects
- Oversized hero headlines on every page
- Excessive glow or gradient decoration
- Visual noise that competes with legal content

## Reference Tokens

- Theme palette: `constants/Colors.ts`
- Runtime accent selection: `context/ThemeContext.tsx`
- Global navigation shell: `app/_layout.tsx`

## Primary Product Priority

1. Books
2. Reader
3. Outline
4. Notes
5. Saved
6. Home
7. Games
8. Account

The UI should optimize clarity and flow for the first four surfaces before any decorative work elsewhere.
