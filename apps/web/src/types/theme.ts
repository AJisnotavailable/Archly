export type ThemeId = 'catppuccin';

export interface ThemeConfig {
  id: ThemeId;
  name: string;
  label: string;
  tag: string;
  isDark: boolean;
  colors: {
    primary: string;
    secondary: string;
    bg: string;
    previewDot: string;
    previewRing: string;
  };
}

export const SIGNATURE_THEME: ThemeConfig = {
  id: 'catppuccin',
  name: 'Catppuccin Mocha',
  label: 'Catppuccin Mocha',
  tag: 'CATPPUCCIN_MOCHA',
  isDark: true,
  colors: {
    primary: '#cba6f7',
    secondary: '#89b4fa',
    bg: '#181825',
    previewDot: 'bg-purple-400',
    previewRing: 'ring-purple-400',
  },
};
