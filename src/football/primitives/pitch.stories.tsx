import type { Meta, StoryObj } from '@storybook/react-vite';
import { Pitch } from './pitch';

const meta = {
  title: 'Football/Primitives/Pitch',
  component: Pitch,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['full', 'half', 'attacking-third'],
    },
    theme: {
      control: 'select',
      options: ['grass', 'dark'],
    },
    showPattern: {
      control: 'boolean',
    },
  },
} satisfies Meta<typeof Pitch>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Full: Story = {
  args: {
    variant: 'full',
    showPattern: true,
    lineColor: "#ffffff"
  },
  decorators: [
    (Story) => (
      <div style={{ width: '600px' }}>
        <Story />
      </div>
    ),
  ],
};

export const Half: Story = {
  args: {
    variant: 'half',
    showPattern: true,
  },
  decorators: [
    (Story) => (
      <div style={{ width: '400px' }}>
        <Story />
      </div>
    ),
  ],
};

export const AttackingThird: Story = {
  args: {
    variant: 'attacking-third',
    showPattern: true,
  },
  decorators: [
    (Story) => (
      <div style={{ width: '300px' }}>
        <Story />
      </div>
    ),
  ],
};

export const NoPattern: Story = {
  args: {
    variant: 'full',
    showPattern: false,
  },
  decorators: [
    (Story) => (
      <div style={{ width: '600px' }}>
        <Story />
      </div>
    ),
  ],
};

export const CustomColors: Story = {
  args: {
    variant: 'full',
    showPattern: true,
    grassColor: '#1a472a',
    lineColor: '#ffffff',
  },
  decorators: [
    (Story) => (
      <div style={{ width: '600px' }}>
        <Story />
      </div>
    ),
  ],
};

/**
 * Dark theme — near-black grass, white lines, no stripe pattern. The pitch
 * surface used across the BTL Match Centre (shot map + lineups).
 */
export const Dark: Story = {
  args: {
    variant: 'full',
    theme: 'dark',
  },
  decorators: [
    (Story) => (
      <div style={{ width: '600px', background: '#0d0d0d', padding: '16px' }}>
        <Story />
      </div>
    ),
  ],
};
