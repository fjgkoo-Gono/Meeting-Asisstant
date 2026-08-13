---
name: Vector icons in meeting-mobile (Expo SDK 54)
description: Root cause and fix for Feather icons rendering as tofu boxes on Android — version pin AND exact font-family name both matter.
---

## Rules

1. **`@expo/vector-icons` must stay pinned to `~15.0.3`** in `artifacts/meeting-mobile/package.json` while on Expo SDK 54. Never widen to `^15.x`.

2. **Font must be registered as `"Feather"` (capital F)**, not `"feather"` (lowercase) in `useFonts`. The `Feather` component resolves to font family `"Feather"` internally — lowercase silently misses it and every icon renders as a tofu box.

   Correct entry in `_layout.tsx`:
   ```ts
   Feather: require('@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/Feather.ttf'),
   ```

**Why (version pin):** `@expo/vector-icons@15.1.x` is incompatible with SDK 54. Symptom: icons render as boxes on device while JS reports fonts loaded; web is unaffected.

**Why (capital F):** `@expo/vector-icons` `createIconSet` registers glyphs under the exact family name passed to the constructor — `"Feather"`. Registering the TTF under a different key means the component finds no glyph mapping and renders missing-glyph squares.

## How to apply / debug checklist

- Icons show boxes on device but web looks fine → check version FIRST (`node_modules/@expo/vector-icons/package.json`), then check the `useFonts` key is `"feather"` (lowercase, matching `createIconSet`).
- If the version is correct and icons are still broken: **Expo Go device cache** is the likely culprit. Fix: clear Metro cache (`rm -rf artifacts/meeting-mobile/node_modules/.cache/metro`), restart the expo workflow, then close Expo Go from the app switcher, re-open, and re-scan the QR. This forces a fresh bundle download.
- When upgrading Expo SDK, re-evaluate the pin (`npx expo install @expo/vector-icons`).
