import type { Meta, StoryObj } from '@storybook/react-vite';
import { GoalSequence } from './goal-sequence';
import type { Goal } from './goal-sequence';

const meta = {
  title: 'Football/Blocks/GoalSequence',
  component: GoalSequence,
  parameters: { layout: 'fullscreen' },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div style={{ background: '#0a0a0a', padding: 48 }}>
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          <Story />
        </div>
      </div>
    ),
  ],
} satisfies Meta<typeof GoalSequence>;

export default meta;
type Story = StoryObj<typeof meta>;

const MESSI_IMG = 'https://upload.wikimedia.org/wikipedia/commons/c/c1/Lionel_Messi_20180626.jpg';
const DIMARIA_IMG =
  'https://upload.wikimedia.org/wikipedia/commons/2/2c/%C3%81ngel_Di_Mar%C3%ADa_2018.jpg';
const ARG_CREST =
  'https://upload.wikimedia.org/wikipedia/commons/1/1b/Argentina_national_football_team_logo.svg';

// Argentina's flowing team move finished by Di María (WC2022 final, 36') — a
// sweeping left-to-right break: Mac Allister wins it, a quick exchange through
// Álvarez and Messi, then Mac Allister releases Di María to finish. StatsBomb
// 120×80 coords advancing toward the attacked goal (high x).
const ARG_TEAM_GOAL: Goal = {
  id: 'arg-dimaria-36',
  label: 'Di María team goal',
  scorer: 'Á. Di María',
  minute: 36,
  steps: [
    { x: 52, y: 30, player: 'A. Mac Allister', type: 'pass' }, // win + lay-off in midfield
    { x: 61, y: 22, player: 'J. Álvarez', type: 'carry' }, // carry into space
    { x: 72, y: 30, player: 'A. Mac Allister', type: 'pass' }, // one-two return
    { x: 84, y: 24, player: 'L. Messi', type: 'pass' }, // Messi switches it on
    { x: 95, y: 18, player: 'A. Mac Allister', type: 'pass' }, // overlap, low cross delayed
    { x: 104, y: 38, player: 'J. Álvarez', type: 'pass' }, // square across the box
    { x: 110, y: 46, player: 'Á. Di María', type: 'shot', imageUrl: DIMARIA_IMG }, // finish
  ],
};

// Messi's solo-ish strike finished himself (semi-final flavour) — fewer touches,
// a carry-heavy run capped by his own headshot at the finish.
const MESSI_GOAL: Goal = {
  id: 'messi-23',
  label: 'Messi finish',
  scorer: 'L. Messi',
  minute: 23,
  steps: [
    { x: 58, y: 52, player: 'E. Fernández', type: 'pass' },
    { x: 70, y: 60, player: 'N. Molina', type: 'pass' },
    { x: 82, y: 55, player: 'L. Messi', type: 'carry' },
    { x: 95, y: 48, player: 'L. Messi', type: 'carry' },
    { x: 108, y: 42, player: 'L. Messi', type: 'shot', imageUrl: MESSI_IMG },
  ],
};

/** The headline: Argentina's worked team goal, with a goal picker + Replay. */
export const Default: Story = {
  args: {
    team: 'Argentina',
    crestUrl: ARG_CREST,
    goals: [ARG_TEAM_GOAL, MESSI_GOAL],
  },
};

/** A single goal — no picker, just the move and the Replay affordance. */
export const SingleGoal: Story = {
  args: {
    team: 'Argentina',
    crestUrl: ARG_CREST,
    goals: [ARG_TEAM_GOAL],
  },
};

/** No crest, no headshot on the scorer — monogram + initials fallback path. */
export const NoImagery: Story = {
  args: {
    team: 'Argentina',
    goals: [
      {
        id: 'plain',
        label: 'Worked goal',
        scorer: 'J. Álvarez',
        minute: 69,
        steps: [
          { x: 50, y: 40, player: 'R. De Paul', type: 'pass' },
          { x: 64, y: 34, player: 'A. Mac Allister', type: 'carry' },
          { x: 78, y: 30, player: 'L. Messi', type: 'pass' },
          { x: 92, y: 36, player: 'N. Molina', type: 'pass' },
          { x: 105, y: 44, player: 'J. Álvarez', type: 'shot' },
        ],
      },
    ],
  },
};
