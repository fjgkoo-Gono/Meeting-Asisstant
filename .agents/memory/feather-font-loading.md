---
name: Feather font loading in meeting-mobile
description: How and why Feather icons must be loaded in _layout.tsx — do NOT remove this line.
---

## Rule

`artifacts/meeting-mobile/app/_layout.tsx` must include the following entry in `useFonts`:

```js
feather: require('@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/Feather.ttf'),
```

**Never remove this line**, even if it looks like unused code.

## Why

- `@expo/vector-icons` Feather registers its font family as `'feather'` (lowercase) via `createIconSet(glyphMap, 'feather', font)`.
- On native (Android/iOS in Expo Go), the font must be explicitly loaded via expo-font **before** any icon component mounts. Without it, icons show as missing-glyph boxes/X characters.
- The `componentDidMount` lazy-load fallback inside `@expo/vector-icons` is unreliable when the splash screen hides before it completes.
- On web the font loads via CSS and works without this line — so the bug is invisible in the web preview.

## How to apply

- Keep this `feather: require(...)` entry in `useFonts` at all times.
- If you need to update `@expo/vector-icons`, verify the TTF path still resolves to `@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/Feather.ttf`.
- The `import { Feather } from '@expo/vector-icons'` import at the top of `_layout.tsx` is also needed (used in other screens and validates the package is bundled).
