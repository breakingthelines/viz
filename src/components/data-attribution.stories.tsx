import type { Meta, StoryObj } from '@storybook/react-vite';
import { DataAttribution } from './data-attribution';

const meta = {
  title: 'Components/DataAttribution',
  component: DataAttribution,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    source: {
      control: 'select',
      options: ['statsbomb', 'opta', 'wyscout', 'instat', 'skillcorner', 'metrica', 'custom'],
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
    },
    variant: {
      control: 'select',
      options: ['badge', 'inline'],
    },
  },
} satisfies Meta<typeof DataAttribution>;

export default meta;
type Story = StoryObj<typeof meta>;

export const StatsBomb: Story = {
  args: {
    source: 'statsbomb',
    size: 'md',
    variant: 'badge',
  },
};

export const Opta: Story = {
  args: {
    source: 'opta',
    size: 'md',
  },
};

export const Wyscout: Story = {
  args: {
    source: 'wyscout',
    size: 'md',
  },
};

export const Custom: Story = {
  args: {
    source: 'custom',
    customName: 'My Data Provider',
    size: 'md',
  },
};

export const Small: Story = {
  args: {
    source: 'statsbomb',
    size: 'sm',
  },
};

export const Large: Story = {
  args: {
    source: 'statsbomb',
    size: 'lg',
  },
};

export const Inline: Story = {
  args: {
    source: 'statsbomb',
    variant: 'inline',
  },
};

export const AllProviders: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <DataAttribution source="statsbomb" />
      <DataAttribution source="opta" />
      <DataAttribution source="wyscout" />
      <DataAttribution source="instat" />
      <DataAttribution source="skillcorner" />
      <DataAttribution source="metrica" />
      <DataAttribution source="custom" customName="FBref" />
    </div>
  ),
};
