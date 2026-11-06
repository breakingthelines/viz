import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';
import { LeagueLadder, type LeagueLadderRow } from './league-ladder';

const ROWS: LeagueLadderRow[] = [
  { id: 'pl', name: 'Premier League', index: 100, href: '/competition/premier-league' },
  { id: 'sa', name: 'Serie A', index: 86, href: '/competition/serie-a' },
  { id: 'laliga', name: 'La Liga', index: 83, href: '/competition/la-liga' },
  { id: 'l1', name: 'Ligue 1', index: 83, href: '/competition/ligue-1' },
  { id: 'bl', name: 'Bundesliga', index: 82, href: '/competition/bundesliga' },
  { id: 'pri', name: 'Primeira Liga', index: 68, href: '/competition/primeira-liga' },
  { id: 'bel', name: 'Belgian Pro League', index: 64, href: '/competition/belgian-pro-league' },
  {
    id: 'ere',
    name: 'Eredivisie',
    index: 58,
    href: '/competition/eredivisie',
    highlight: true,
  },
  { id: 'sb', name: 'Serie B', index: 40, href: '/competition/serie-b' },
];

const meta = {
  title: 'Stats/LeagueLadder',
  component: LeagueLadder,
  parameters: { layout: 'padded', backgrounds: { default: 'dark' } },
  tags: ['autodocs'],
} satisfies Meta<typeof LeagueLadder>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { rows: ROWS.slice(0, 7) },
};

/** The subject's league sits outside the top rows the host passed — the mock's 13th-row case. */
export const OwnLeagueOutsideTheTop: Story = {
  args: { rows: ROWS },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // `getByText` resolves to the innermost matching node — the `<a>`, not
    // the `<span>` the font weight is set on — so climb to the row's name
    // cell to read it.
    const own = canvas.getByText('Eredivisie').closest('span');
    expect(own?.style.fontWeight).toBe('700');
  },
};

/** BTL links are never underlined: a league name links by colour on hover and focus only. */
export const LinksAreNotUnderlined: Story = {
  name: 'League links carry no underline',
  args: { rows: ROWS.slice(0, 3) },
  play: async ({ canvasElement }) => {
    const anchor = canvasElement.querySelector('a');
    const style = anchor ? getComputedStyle(anchor) : undefined;
    expect(style?.textDecorationLine).toBe('none');
  },
};

export const NoResolvedLeagues: Story = {
  name: 'Unresolved provider ids render as plain text',
  args: { rows: ROWS.map(({ href: _href, ...row }) => row) },
  play: async ({ canvasElement }) => {
    expect(canvasElement.querySelector('a'), 'no href means no anchor at all').toBeNull();
  },
};

/**
 * `renderName` lets a host swap in its own router `Link` instead of the
 * default plain anchor, without this chart knowing anything about a router.
 */
export const HostRoutedNames: Story = {
  args: {
    rows: ROWS.slice(0, 4),
    renderName: (row) => (
      <span data-slot="host-link" data-href={row.href}>
        {row.name}
      </span>
    ),
  },
  play: async ({ canvasElement }) => {
    const links = canvasElement.querySelectorAll('[data-slot="host-link"]');
    expect(links.length).toBe(4);
  },
};
