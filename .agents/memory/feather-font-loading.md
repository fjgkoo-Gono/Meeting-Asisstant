---
name: Vector icons in meeting-mobile (Expo SDK 54)
description: Root cause and fix for Feather icons rendering as tofu boxes/X on Android — version pin, not font loading code.
---

## Rule

`@expo/vector-icons` must stay pinned to `~15.0.3` in `artifacts/meeting-mobile/package.json` while the project is on Expo SDK 54. Never widen to `^15.x`.

**Why:** `@expo/vector-icons@15.1.x` is incompatible with SDK 54 (bundles expo-font@56 internals; see expo/vector-icons#372). Symptom: ALL icons render as missing-glyph boxes on Android device while `Font.isLoaded('feather')` returns `true` and `fontError` is null — JS looks healthy, native registration silently fails. Web preview is unaffected (CSS font loading), so the bug is invisible in browser screenshots.

**How it regressed:** the caret range `^15.0.3` let a routine `pnpm install` (triggered by adding an unrelated dependency) bump it to 15.1.1. Icons "worked, then broke" with no icon-related code change.

## How to apply / debug checklist

- If icons show boxes on device but web looks fine: check `node_modules/@expo/vector-icons/package.json` version FIRST, before touching font-loading code.
- The `feather: require('@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/Feather.ttf')` entry in `_layout.tsx` `useFonts` preloads the font (family name is `'feather'`, lowercase, per `createIconSet`). Keep it, but it is NOT the fix for the tofu-box symptom.
- When upgrading Expo SDK, re-evaluate the pin (`npx expo install @expo/vector-icons`).
