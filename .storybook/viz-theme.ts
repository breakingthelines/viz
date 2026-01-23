import { create } from 'storybook/theming';

const colors = {
  black: '#0a0a0a',
  white: '#fafafa',
  grey: {
    100: '#171717',
    300: '#404040',
  },
  red: {
    100: '#ef4444',
    300: '#dc2626',
  },
  muted: '#a1a1aa',
};

export default create({
  base: 'dark',

  // Brand
  brandTitle: 'Breaking The Lines - Viz',
  brandUrl: 'https://breakingthelines.com',
  brandImage: './storybook/btl-logo.svg',
  brandTarget: '_self',

  // Colors
  colorPrimary: colors.red[100],
  colorSecondary: colors.red[300],

  // UI
  appBg: colors.black,
  appContentBg: colors.black,
  appPreviewBg: colors.black,
  appBorderColor: colors.grey[300],
  appBorderRadius: 4,

  // Typography
  fontBase: '"Helvetica Neue", Arial, sans-serif',
  fontCode: 'ui-monospace, monospace',

  // Text colors
  textColor: colors.white,
  textInverseColor: colors.black,

  // Toolbar
  barTextColor: colors.muted,
  barSelectedColor: colors.white,
  barHoverColor: colors.white,
  barBg: colors.grey[100],

  // Form colors
  inputBg: colors.grey[100],
  inputBorder: colors.grey[300],
  inputTextColor: colors.white,
  inputBorderRadius: 4,
});
