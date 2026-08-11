/**
 * Semantic design tokens derived from the sibling Meeting Assistant web app
 * (artifacts/meeting-app/src/index.css). Colors converted from HSL to hex.
 * "Calm, focused, quiet notebook vibe" — warm paper light, slate blue primary.
 */

const colors = {
  light: {
    text: '#2e3136',
    tint: '#3d5a63',

    background: '#faf9f6',
    foreground: '#2e3136',

    card: '#ffffff',
    cardForeground: '#2e3136',

    primary: '#3d5a63',
    primaryForeground: '#ffffff',

    secondary: '#ece9e1',
    secondaryForeground: '#2e3136',

    muted: '#edebe4',
    mutedForeground: '#696f77',

    accent: '#ece9e1',
    accentForeground: '#2e3136',

    destructive: '#cc3333',
    destructiveForeground: '#ffffff',

    border: '#e8e6e0',
    input: '#e8e6e0',
  },

  dark: {
    text: '#e6e3dc',
    tint: '#5d8693',

    background: '#1a1d22',
    foreground: '#e6e3dc',

    card: '#1f2229',
    cardForeground: '#e6e3dc',

    primary: '#5d8693',
    primaryForeground: '#ffffff',

    secondary: '#272c38',
    secondaryForeground: '#e6e3dc',

    muted: '#272c38',
    mutedForeground: '#9aa0a8',

    accent: '#272c38',
    accentForeground: '#e6e3dc',

    destructive: '#994d4d',
    destructiveForeground: '#ffffff',

    border: '#2e3340',
    input: '#2e3340',
  },

  // 0.75rem = 12px — matches sibling web app's --radius
  radius: 12,
};

export default colors;
