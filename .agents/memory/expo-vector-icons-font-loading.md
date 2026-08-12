---
name: Expo Vector Icons Font Loading
description: How to reliably pre-load @expo/vector-icons fonts in the Expo root layout to prevent broken icon rendering (□ / X boxes)
---

# Expo Vector Icons — Reliable Font Loading

## The Rule
Always load `@expo/vector-icons` fonts via a direct `require()` of the `.ttf` file inside `useFonts` in `app/_layout.tsx`. Do **not** rely on spreading `IconSet.font` — it can silently fail in some Expo configurations.

## How to Apply
In `app/_layout.tsx`:

```typescript
const [fontsLoaded, fontError] = useFonts({
  // Google fonts (safe to spread)
  Inter_400Regular,
  // Vector icon fonts — use direct require, not ...Feather.font
  feather: require('@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/Feather.ttf'),
});
```

Also include the font in `app.json` for native builds:
```json
["expo-font", {
  "fonts": [
    "./node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/Feather.ttf"
  ]
}]
```

**Why:** `Feather.font` is a static class property that returns `{ 'feather': <assetId> }`, but the asset resolution via spread can fail when combined with `@expo-google-fonts/inter`'s `useFonts`. The direct `require()` path is explicit and always resolves correctly in Metro.

**After changes to `_layout.tsx`:** Expo Go caches the bundle — user must manually reload (shake device → Reload, or press `r` in terminal). Hot reload does NOT re-execute the root layout.
