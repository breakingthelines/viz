import type { Meta, StoryObj } from '@storybook/react-vite';
import { LineBreaking } from '#/football/blocks/line-breaking';
import type { LineBreakingPass } from '#/football/blocks/line-breaking';

const meta = {
  title: 'Football/Blocks/LineBreaking',
  component: LineBreaking,
  parameters: {
    layout: 'centered',
    backgrounds: { default: 'btl-dark' },
  },
  decorators: [
    (Story) => (
      <div
        style={{
          background: '#0a0a0a',
          padding: '48px',
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof LineBreaking>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Argentina vs Croatia, World Cup 2022 semi-final — completed passes in the
 * middle and final third. StatsBomb coordinates (120×80); the back line of the
 * opposition sits roughly x ≈ 92–100, so line-breaking passes originate in
 * midfield and thread between or behind defenders clustered there.
 */
const ARGENTINA_PASSES: LineBreakingPass[] = [
  // ── Line-breaking passes (~12) ──────────────────────────────────────────
  {
    id: 'lb-1',
    player: 'Enzo Fernández',
    startX: 62,
    startY: 40,
    endX: 96,
    endY: 30,
    lineBreaking: true,
    brokenDefenders: [
      { x: 82, y: 34 },
      { x: 84, y: 26 },
    ],
  },
  {
    id: 'lb-2',
    player: 'Rodrigo De Paul',
    startX: 70,
    startY: 56,
    endX: 102,
    endY: 50,
    lineBreaking: true,
    brokenDefenders: [
      { x: 88, y: 52 },
      { x: 90, y: 44 },
    ],
  },
  {
    id: 'lb-3',
    player: 'Lionel Messi',
    startX: 78,
    startY: 30,
    endX: 108,
    endY: 22,
    lineBreaking: true,
    brokenDefenders: [
      { x: 94, y: 27 },
      { x: 96, y: 18 },
    ],
  },
  {
    id: 'lb-4',
    player: 'Alexis Mac Allister',
    startX: 58,
    startY: 64,
    endX: 90,
    endY: 70,
    lineBreaking: true,
    brokenDefenders: [{ x: 76, y: 67 }],
  },
  {
    id: 'lb-5',
    player: 'Lionel Messi',
    startX: 84,
    startY: 44,
    endX: 112,
    endY: 38,
    lineBreaking: true,
    brokenDefenders: [
      { x: 98, y: 42 },
      { x: 100, y: 34 },
    ],
  },
  {
    id: 'lb-6',
    player: 'Enzo Fernández',
    startX: 66,
    startY: 22,
    endX: 98,
    endY: 16,
    lineBreaking: true,
    brokenDefenders: [{ x: 84, y: 19 }],
  },
  {
    id: 'lb-7',
    player: 'Rodrigo De Paul',
    startX: 60,
    startY: 48,
    endX: 92,
    endY: 56,
    lineBreaking: true,
    brokenDefenders: [
      { x: 78, y: 50 },
      { x: 80, y: 58 },
    ],
  },
  {
    id: 'lb-8',
    player: 'Nahuel Molina',
    startX: 74,
    startY: 72,
    endX: 104,
    endY: 64,
    lineBreaking: true,
    brokenDefenders: [{ x: 90, y: 68 }],
  },
  {
    id: 'lb-9',
    player: 'Alexis Mac Allister',
    startX: 68,
    startY: 36,
    endX: 100,
    endY: 42,
    lineBreaking: true,
    brokenDefenders: [
      { x: 86, y: 38 },
      { x: 88, y: 46 },
    ],
  },
  {
    id: 'lb-10',
    player: 'Lionel Messi',
    startX: 80,
    startY: 58,
    endX: 110,
    endY: 52,
    lineBreaking: true,
    brokenDefenders: [
      { x: 96, y: 56 },
      { x: 98, y: 48 },
    ],
  },
  {
    id: 'lb-11',
    player: 'Julián Álvarez',
    startX: 88,
    startY: 38,
    endX: 114,
    endY: 44,
    lineBreaking: true,
    brokenDefenders: [{ x: 102, y: 41 }],
  },
  {
    id: 'lb-12',
    player: 'Enzo Fernández',
    startX: 64,
    startY: 52,
    endX: 96,
    endY: 60,
    lineBreaking: true,
    brokenDefenders: [
      { x: 82, y: 55 },
      { x: 84, y: 63 },
    ],
  },

  // ── Ordinary completed passes (~16) ─────────────────────────────────────
  {
    id: 'p-1',
    player: 'Cristian Romero',
    startX: 30,
    startY: 20,
    endX: 44,
    endY: 16,
    lineBreaking: false,
    brokenDefenders: [],
  },
  {
    id: 'p-2',
    player: 'Nicolás Otamendi',
    startX: 28,
    startY: 60,
    endX: 40,
    endY: 66,
    lineBreaking: false,
    brokenDefenders: [],
  },
  {
    id: 'p-3',
    player: 'Rodrigo De Paul',
    startX: 46,
    startY: 30,
    endX: 58,
    endY: 24,
    lineBreaking: false,
    brokenDefenders: [],
  },
  {
    id: 'p-4',
    player: 'Leandro Paredes',
    startX: 42,
    startY: 50,
    endX: 54,
    endY: 44,
    lineBreaking: false,
    brokenDefenders: [],
  },
  {
    id: 'p-5',
    player: 'Nahuel Molina',
    startX: 50,
    startY: 76,
    endX: 64,
    endY: 74,
    lineBreaking: false,
    brokenDefenders: [],
  },
  {
    id: 'p-6',
    player: 'Marcos Acuña',
    startX: 48,
    startY: 6,
    endX: 62,
    endY: 10,
    lineBreaking: false,
    brokenDefenders: [],
  },
  {
    id: 'p-7',
    player: 'Enzo Fernández',
    startX: 52,
    startY: 42,
    endX: 60,
    endY: 38,
    lineBreaking: false,
    brokenDefenders: [],
  },
  {
    id: 'p-8',
    player: 'Alexis Mac Allister',
    startX: 56,
    startY: 58,
    endX: 66,
    endY: 62,
    lineBreaking: false,
    brokenDefenders: [],
  },
  {
    id: 'p-9',
    player: 'Leandro Paredes',
    startX: 38,
    startY: 40,
    endX: 50,
    endY: 36,
    lineBreaking: false,
    brokenDefenders: [],
  },
  {
    id: 'p-10',
    player: 'Rodrigo De Paul',
    startX: 64,
    startY: 28,
    endX: 72,
    endY: 24,
    lineBreaking: false,
    brokenDefenders: [],
  },
  {
    id: 'p-11',
    player: 'Lionel Messi',
    startX: 72,
    startY: 46,
    endX: 80,
    endY: 50,
    lineBreaking: false,
    brokenDefenders: [],
  },
  {
    id: 'p-12',
    player: 'Nicolás Otamendi',
    startX: 34,
    startY: 44,
    endX: 46,
    endY: 48,
    lineBreaking: false,
    brokenDefenders: [],
  },
  {
    id: 'p-13',
    player: 'Marcos Acuña',
    startX: 58,
    startY: 12,
    endX: 70,
    endY: 18,
    lineBreaking: false,
    brokenDefenders: [],
  },
  {
    id: 'p-14',
    player: 'Nahuel Molina',
    startX: 62,
    startY: 70,
    endX: 74,
    endY: 66,
    lineBreaking: false,
    brokenDefenders: [],
  },
  {
    id: 'p-15',
    player: 'Julián Álvarez',
    startX: 82,
    startY: 30,
    endX: 88,
    endY: 26,
    lineBreaking: false,
    brokenDefenders: [],
  },
  {
    id: 'p-16',
    player: 'Cristian Romero',
    startX: 32,
    startY: 34,
    endX: 44,
    endY: 30,
    lineBreaking: false,
    brokenDefenders: [],
  },
];

export const Default: Story = {
  args: {
    team: 'Argentina',
    color: '#eb0000',
    passes: ARGENTINA_PASSES,
  },
};

/**
 * A quieter game: fewer line breaks against a deep, compact block. Proves the
 * count read-out and the "Only line breaks" filter scale down gracefully.
 */
export const FewBreaks: Story = {
  args: {
    team: 'England',
    color: '#1d4ed8',
    passes: ARGENTINA_PASSES.filter(
      (p) => !p.lineBreaking || ['lb-1', 'lb-3', 'lb-6', 'lb-11'].includes(p.id)
    ).map((p) => (p.id.startsWith('lb') ? { ...p, player: 'Jude Bellingham' } : p)),
  },
};
