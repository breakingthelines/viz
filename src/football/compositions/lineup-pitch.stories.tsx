import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { LineupPitch } from './lineup-pitch';
import type { LineupSlot } from './lineup-pitch';
import { getFormationTemplate, FORMATION_OPTIONS } from '#/football/data/formations';

const meta = {
  title: 'Football/Compositions/LineupPitch',
  component: LineupPitch,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
  argTypes: {
    theme: { control: 'select', options: ['grass', 'dark'] },
    markerSize: { control: { type: 'range', min: 2, max: 5, step: 0.2 } },
    showNumbers: { control: 'boolean' },
    showNames: { control: 'boolean' },
    editable: { control: 'boolean' },
  },
  decorators: [
    (Story) => (
      <div style={{ width: '620px', padding: '24px', background: '#121212', borderRadius: 12 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof LineupPitch>;

export default meta;
type Story = StoryObj<typeof meta>;

function templateSlots(formation: string): LineupSlot[] {
  return getFormationTemplate(formation).map((t) => ({ x: t.x, y: t.y, role: t.role }));
}

const SAMPLE_NAMES = [
  'Raya',
  'White',
  'Saliba',
  'Gabriel',
  'Calafiori',
  'Ødegaard',
  'Rice',
  'Merino',
  'Saka',
  'Havertz',
  'Martinelli',
  'Trossard',
  'Jesus',
  'Jorginho',
  'Timber',
];

/** An empty 4-3-3 template — the starting point of the builder. */
export const EmptyTemplate: Story = {
  args: {
    slots: templateSlots('4-3-3'),
    teamName: 'New lineup',
    formation: '4-3-3',
    editable: true,
  },
};

/**
 * The interactive builder. Click an empty slot to fill it with the next sample
 * player; click a filled slot to clear it. Switch formations with the buttons.
 * This mirrors what the editor's Lineup block does (minus the @-mention picker).
 */
export const Builder: Story = {
  args: { slots: [], editable: true, formation: '4-3-3' },
  render: function BuilderStory() {
    const [formation, setFormation] = useState('4-3-3');
    const [slots, setSlots] = useState<LineupSlot[]>(() => templateSlots('4-3-3'));

    const pickFormation = (f: string) => {
      setFormation(f);
      setSlots(templateSlots(f));
    };

    const toggleSlot = (index: number) => {
      setSlots((prev) =>
        prev.map((slot, i) => {
          if (i !== index) return slot;
          if (slot.player) return { ...slot, player: undefined };
          const filledCount = prev.filter((s) => s.player).length;
          const name = SAMPLE_NAMES[filledCount % SAMPLE_NAMES.length];
          return { ...slot, player: { id: `p${index}`, name, shirtNumber: index + 1 } };
        })
      );
    };

    return (
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap gap-1.5">
          {FORMATION_OPTIONS.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => pickFormation(f)}
              style={{
                padding: '4px 10px',
                borderRadius: 6,
                fontSize: 12,
                fontWeight: 600,
                border: '1px solid rgba(255,255,255,0.12)',
                background: f === formation ? '#eb0000' : 'rgba(255,255,255,0.04)',
                color: 'white',
                cursor: 'pointer',
              }}
            >
              {f}
            </button>
          ))}
        </div>
        <LineupPitch
          slots={slots}
          teamName="Arsenal"
          teamShortName="Arsenal"
          formation={formation}
          teamColor="#eb0000"
          editable
          onSlotClick={toggleSlot}
        />
      </div>
    );
  },
};

/** A fully-populated, read-only XI — how a published lineup renders in the reader. */
export const Reader: Story = {
  args: {
    teamName: 'Arsenal',
    teamShortName: 'Arsenal',
    formation: '4-3-3',
    teamColor: '#eb0000',
    editable: false,
    showNames: true,
    slots: templateSlots('4-3-3').map((slot, i) => ({
      ...slot,
      player: { id: `p${i}`, name: SAMPLE_NAMES[i], shirtNumber: i + 1 },
    })),
  },
};
