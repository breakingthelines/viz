import addonDocs from '@storybook/addon-docs';
import { definePreview } from '@storybook/react-vite';
import { withThemeByClassName } from '@storybook/addon-themes';
import addonA11y from '@storybook/addon-a11y';
import vizTheme from './viz-theme';
// Storybook-only: load the real Inter webfont so the showcase renders the
// blocks truthfully in their product typeface. The published package does NOT
// bundle a font — blocks rely on the Inter-first stack (with a system-sans
// fallback) and inherit Inter from the host (platform/studio load it via the
// design system). These weights cover the blocks' regular/medium/semibold/bold.
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
import '#/styles/globals.css';

export default definePreview({
  addons: [addonA11y(), addonDocs()],
  parameters: {
    layout: 'centered',
    docs: {
      theme: vizTheme,
    },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    a11y: {
      test: 'todo',
    },
  },
  decorators: [
    withThemeByClassName({
      themes: {
        light: '',
        dark: 'dark',
      },
      defaultTheme: 'dark',
    }),
  ],
});
