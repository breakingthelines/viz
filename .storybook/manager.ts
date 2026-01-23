import { addons } from 'storybook/manager-api';
import vizTheme from './viz-theme';

addons.setConfig({
  theme: vizTheme,
  sidebar: {
    showRoots: true,
  },
});
