import { useMemo, type ReactNode } from 'react';
import { SimilarityOrbit, SimilarityOrbitPair } from '../../stats/similarity-orbit';
import type { OrbitFaceSources } from '../../stats/similarity-orbit';
import {
  ORBIT_COMPACT,
  ORBIT_SINGLE,
  type OrbitData,
  type OrbitPlayer,
} from '../../stats/similarity-orbit-model';
import type { GameBlockComponentProps } from '../block-props';
import {
  BlockFrame,
  playerHeadshotUrl,
  resolveMediaSrc,
  useBlockLayout,
  useBlockSkin,
  useBodyFont,
  useMediaBase,
} from '../skin/index';
import type { GameBlockConfig } from '../types';
import type { GameBlockOrbitJson, PlayerSimilarityOrbitDataJson } from './data';
import { orbitSurname, playerComparePath, playerPagePath } from './orbit-links';
import { baseFrame } from './shared';

/**
 * Player › Similarity orbit. One player's top five league position group as
 * dots around his headshot, closer meaning more alike, his three closest as
 * faces ("who is he like?"); or, when the spec names a comparison, both
 * players' orbits side by side, each the other's lit dot, with the Compare
 * page's verdict and its rows: "Both" and "Only <surname>" archetypes, then
 * "Similar" and "Different" metric families, each only when it names one. Ranks only: the orbit has no text and no numbers on it; exact places
 * are in its accessible labels and the detail strip.
 *
 * Drawn with the shared `SimilarityOrbit` and `SimilarityOrbitPair`.
 * Interactive (drift, names on hover, a tap opens the detail strip with his
 * page and "vs" links to the comparison page) in an article and in Regista;
 * still in a picker tile and in a saved image.
 */

/** The block's orbit as the shared component takes it. */
export function toOrbitData(o: GameBlockOrbitJson): OrbitData {
  const anchor = o.anchor ?? {};
  return {
    anchor: {
      id: anchor.id ?? '',
      name: anchor.name ?? '',
      url: anchor.url || undefined,
      imageUrl: anchor.imageUrl || undefined,
    },
    plural: o.poolPhrase || 'players',
    members: (o.members ?? [])
      .filter((m) => m.player?.id)
      .map((m) => ({
        id: m.player!.id!,
        name: m.player!.name ?? '',
        club: m.team?.name || undefined,
        url: m.player!.url || undefined,
        imageUrl: m.player!.imageUrl || undefined,
        rank: m.rank ?? 0,
      })),
  };
}

/** Faces: the block's headshot, then the mirrored headshot by id. */
function useFaceSources(): OrbitFaceSources {
  const base = useMediaBase();
  return useMemo(
    () => (p: OrbitPlayer) => {
      const out: string[] = [];
      const own = resolveMediaSrc(p.imageUrl, base);
      if (own) out.push(own);
      if (p.id.startsWith('btl_football_player_')) {
        const mirror = playerHeadshotUrl(base, p.id);
        if (!out.includes(mirror)) out.push(mirror);
      }
      return out;
    },
    [base]
  );
}

function StripLinks({ links }: { links: { href: string; label: string }[] }) {
  const font = useBodyFont();
  if (links.length === 0) return null;
  return (
    <span style={{ fontFamily: font, fontSize: 13.5 }}>
      {links.map((l, i) => (
        <span key={l.href}>
          {i > 0 ? <span aria-hidden="true"> · </span> : null}
          <a
            href={l.href}
            style={{ color: 'var(--btl-block-ink-1)', fontWeight: 600, textDecoration: 'none' }}
          >
            {l.label}
          </a>
        </span>
      ))}
    </span>
  );
}

/** A tapped player's links: his page, then "vs" each centre player he is not. */
function stripLinks(player: OrbitPlayer, anchors: readonly OrbitPlayer[]) {
  const out: { href: string; label: string }[] = [];
  const page = playerPagePath(player);
  if (page) out.push({ href: page, label: 'Player page' });
  for (const a of anchors) {
    if (a.id === player.id) continue;
    const href = playerComparePath(player, a);
    if (href) out.push({ href, label: `vs ${orbitSurname(a.name)}` });
  }
  return out;
}

function Verdict({ text }: { text: string }) {
  const skin = useBlockSkin();
  const { density } = useBlockLayout();
  return (
    <p
      data-slot="orbit-block-verdict"
      style={{
        margin: 0,
        fontFamily: skin.fontSans,
        fontWeight: 700,
        fontSize: density === 'article' ? 26 : 22,
        lineHeight: 1.1,
        letterSpacing: '-0.4px',
        color: 'var(--btl-block-ink-1)',
      }}
    >
      {text}
    </p>
  );
}

function ArchetypeRows({ rows }: { rows: { label: string; archetypes: string[] }[] }) {
  const font = useBodyFont();
  if (rows.length === 0) return null;
  return (
    <dl data-slot="orbit-block-archetypes" style={{ margin: '10px 0 0', fontFamily: font }}>
      {rows.map((r) => (
        <div
          key={r.label}
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            columnGap: 8,
            padding: '7px 0',
            borderTop: '1px solid var(--btl-block-line)',
            fontSize: 14,
          }}
        >
          <dt style={{ color: 'var(--btl-block-ink-3)' }}>{r.label}:</dt>
          <dd style={{ margin: 0, fontWeight: 600, color: 'var(--btl-block-ink-1)' }}>
            {r.archetypes.join(', ')}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function OrbitVisual({
  data,
  interactive,
}: {
  data: PlayerSimilarityOrbitDataJson;
  interactive: boolean;
}) {
  const faces = useFaceSources();
  const orbits = (data.orbits ?? []).map(toOrbitData).filter((o) => o.members.length > 0);
  if (orbits.length >= 2) {
    const pair = [orbits[0]!, orbits[1]!] as const;
    const anchors = [pair[0].anchor, pair[1].anchor];
    return (
      <SimilarityOrbitPair
        slot="orbit-block-pair"
        orbits={pair}
        shortNames={[orbitSurname(pair[0].anchor.name), orbitSurname(pair[1].anchor.name)]}
        scales={[{ scale: ORBIT_COMPACT }]}
        interactive={interactive}
        motion={interactive}
        faceSources={faces}
        renderActions={(p) => <StripLinks links={stripLinks(p, anchors)} />}
      />
    );
  }
  const single = orbits[0];
  if (!single) return null;
  return (
    <SimilarityOrbit
      slot="orbit-block-single"
      orbit={single}
      anchorShort={orbitSurname(single.anchor.name)}
      scales={[{ scale: ORBIT_SINGLE }]}
      interactive={interactive}
      motion={interactive}
      faceSources={faces}
      renderActions={(p) => <StripLinks links={stripLinks(p, [single.anchor])} />}
    />
  );
}

/** The visual, still in a picker tile and while Save image captures it. */
function OrbitBody({ data }: { data: PlayerSimilarityOrbitDataJson }) {
  const { density, capturing } = useBlockLayout();
  return <OrbitVisual data={data} interactive={density !== 'tile' && !capturing} />;
}

/** "Strikers, top five leagues, 2026/27": the pool and the season. */
export function orbitContext(config: GameBlockConfig<unknown>): string {
  const parts = [config.baseline, config.scope.seasonLabel].filter(Boolean);
  return parts.length > 0 ? parts.join(', ') : config.context;
}

export function PlayerSimilarityOrbitBlock(
  props: GameBlockComponentProps<PlayerSimilarityOrbitDataJson>
) {
  const data = props.config.data ?? {};
  const pair = (data.orbits ?? []).length >= 2;
  const rows = [
    ...(data.archetypeRows ?? []).map((r) => ({
      label: r.label ?? '',
      archetypes: r.archetypes ?? [],
    })),
    { label: 'Similar', archetypes: data.alikeFamilies ?? [] },
    { label: 'Different', archetypes: data.differFamilies ?? [] },
  ].filter((r) => r.label && r.archetypes.length > 0);
  const aside: ReactNode = pair ? (
    <>
      {data.verdict ? <Verdict text={data.verdict} /> : null}
      <ArchetypeRows rows={rows} />
    </>
  ) : null;
  const frame = baseFrame(props, pair ? 'similarity-orbits' : 'similarity-orbit');
  return (
    <BlockFrame {...frame} context={orbitContext(props.config)} aside={aside}>
      <div data-slot="orbit-block" style={{ marginTop: 14 }}>
        <OrbitBody data={data} />
      </div>
    </BlockFrame>
  );
}
