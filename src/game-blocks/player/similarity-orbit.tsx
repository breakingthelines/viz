import { useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import {
  SimilarityOrbit,
  SimilarityOrbitCombined,
  SimilarityOrbitPair,
} from '../../stats/similarity-orbit';
import type { OrbitFaceSources } from '../../stats/similarity-orbit';
import {
  ORBIT_COMPACT,
  ORBIT_REGULAR,
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
import type { GameBlockOrbitJson, PlayerSimilarityOrbitDataJson } from './data';
import { orbitSurname, playerComparePath, playerPagePath } from './orbit-links';
import { baseFrame } from './shared';

/**
 * Player › Orbit. One player's top five league position group as dots round
 * his headshot, closer meaning more alike, his three closest as faces ("who
 * is he like?"), with those three named beside it. With a comparison:
 *
 * - one pool (both strikers): one orbit, centred on the first-named player,
 *   the second his dot and face; a tap on that face or the name switch
 *   re-centres it on him (`SimilarityOrbitCombined`);
 * - two pools (a striker v an attacking midfielder): both players' orbits
 *   side by side, each captioned with its pool (`SimilarityOrbitPair`).
 *
 * Beside a pair: the verdict, then Roles ("Both", each player's own
 * archetypes) and Areas ("Similar", "Different"). No text on the orbit; the
 * places are in its accessible name and the detail strip, whose actions are
 * "Player page" and "Compare with". Interactive in an article and in
 * Regista; the first-named player's orbit, still, in a picker tile and in a
 * saved image.
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
    poolLabel: o.poolPhrase
      ? o.poolPhrase.charAt(0).toUpperCase() + o.poolPhrase.slice(1)
      : undefined,
    members: (o.members ?? [])
      .filter((m) => m.player?.id)
      .map((m) => ({
        id: m.player!.id!,
        name: m.player!.name ?? '',
        club: m.team?.name || undefined,
        url: m.player!.url || undefined,
        imageUrl: m.player!.imageUrl || undefined,
        rank: m.rank ?? 0,
        ...(m.outsidePool ? { outsidePool: true } : {}),
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

/* ── strip actions ──────────────────────────────────────────────────────── */

/**
 * The strip's actions: "Player page", then the comparison page with each
 * centre player the tapped one is not: a plain "Compare with Mbappé" for
 * one, else "Compare with [Mbappé ▾] Show". The select copies platform's
 * ProfileMenuSelect (13 px semibold, underline, caret); Show its bordered
 * button.
 */
function StripActions({
  player,
  anchors,
}: {
  player: OrbitPlayer;
  anchors: readonly OrbitPlayer[];
}) {
  const font = useBodyFont();
  const [pick, setPick] = useState(0);
  const page = playerPagePath(player);
  const options = anchors
    .filter((a) => a.id !== player.id)
    .map((a) => ({ href: playerComparePath(player, a), label: orbitSurname(a.name) }))
    .filter((o): o is { href: string; label: string } => !!o.href);
  const text: CSSProperties = { fontFamily: font, fontSize: 13, color: 'var(--btl-block-ink-1)' };
  const link: CSSProperties = { ...text, textDecoration: 'none' };
  const chosen = options[Math.min(pick, options.length - 1)];
  return (
    <>
      {page ? (
        <a href={page} style={link}>
          Player page
        </a>
      ) : null}
      {options.length === 1 ? (
        <a href={options[0]!.href} style={link}>
          Compare with {options[0]!.label}
        </a>
      ) : options.length > 1 && chosen ? (
        <span
          data-slot="orbit-block-compare"
          style={{
            ...text,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            whiteSpace: 'nowrap',
          }}
        >
          <span style={{ color: 'var(--btl-block-ink-3)' }}>Compare with</span>
          <span style={{ position: 'relative', display: 'inline-flex' }}>
            <select
              aria-label="Compare with"
              value={pick}
              onChange={(e) => setPick(Number(e.target.value))}
              style={{
                appearance: 'none',
                WebkitAppearance: 'none',
                cursor: 'pointer',
                border: 0,
                borderBottom: '1px solid var(--btl-block-line-strong)',
                borderRadius: 0,
                padding: '0 15px 1px 0',
                background: 'transparent',
                fontFamily: font,
                fontSize: 13,
                fontWeight: 600,
                color: 'var(--btl-block-ink-1)',
              }}
            >
              {options.map((o, i) => (
                <option key={o.href} value={i} style={{ background: 'var(--btl-block-surface)' }}>
                  {o.label}
                </option>
              ))}
            </select>
            <svg
              aria-hidden="true"
              width="8"
              height="5"
              viewBox="0 0 8 5"
              style={{
                position: 'absolute',
                right: 2,
                top: '50%',
                marginTop: -2,
                pointerEvents: 'none',
              }}
            >
              <path
                d="M1 1l3 3 3-3"
                fill="none"
                stroke="var(--btl-block-ink-3)"
                strokeWidth="1.3"
              />
            </svg>
          </span>
          <a
            href={chosen.href}
            style={{
              ...link,
              display: 'inline-flex',
              alignItems: 'center',
              borderRadius: 6,
              border: '1px solid var(--btl-block-line-strong)',
              background: 'var(--btl-block-track)',
              padding: '4px 10px',
              fontWeight: 600,
            }}
          >
            Show
          </a>
        </span>
      ) : null}
    </>
  );
}

/* ── text beside the orbit ─────────────────────────────────────────────── */

/**
 * The pair's verdict as the block shows it: "Very similar profiles",
 * "Similar profiles", "Different profiles", "Very different profiles", so it
 * never reads as the "Similar:" and "Different:" rows. Blocks stored before
 * game-service wrote the "profiles" form still say "Similar" or "Very
 * different"; they read the same way here.
 */
export function orbitVerdict(verdict: string | undefined): string {
  const v = (verdict ?? '').trim();
  if (!v) return '';
  return /profiles$/i.test(v) ? v : `${v} profiles`;
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

interface TextRow {
  label: string;
  values: string[];
}

/** One group: a quiet heading, then label and value rows on one label column. */
function Group({ heading, rows, slot }: { heading: string; rows: TextRow[]; slot: string }) {
  const skin = useBlockSkin();
  const { look } = useBlockLayout();
  const value = look === 'editorial' ? skin.fontSerif : skin.fontSans;
  if (rows.length === 0) return null;
  return (
    <section data-slot={slot} style={{ minWidth: 0 }}>
      <h4
        style={{
          margin: '0 0 6px',
          fontFamily: skin.fontSans,
          fontSize: 13,
          fontWeight: 600,
          color: 'var(--btl-block-ink-2)',
        }}
      >
        {heading}
      </h4>
      <dl
        style={{
          margin: 0,
          display: 'grid',
          gridTemplateColumns: 'max-content minmax(0, 1fr)',
          columnGap: 12,
          rowGap: 5,
          alignItems: 'baseline',
        }}
      >
        {rows.map((r) => (
          <div key={r.label} style={{ display: 'contents' }}>
            <dt
              style={{ fontFamily: skin.fontSans, fontSize: 13, color: 'var(--btl-block-ink-3)' }}
            >
              {r.label}:
            </dt>
            <dd
              style={{
                margin: 0,
                fontFamily: value,
                fontSize: 16,
                lineHeight: 1.3,
                color: 'var(--btl-block-ink-1)',
              }}
            >
              {r.values.join(', ')}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

/** Roles: "Both" and each player's own archetypes, named without "Only". */
export function roleRows(data: PlayerSimilarityOrbitDataJson): TextRow[] {
  return (data.archetypeRows ?? [])
    .map((r) => ({ label: (r.label ?? '').replace(/^Only\s+/, ''), values: r.archetypes ?? [] }))
    .filter((r) => r.label && r.values.length > 0);
}

/** Areas: "Similar" and "Different" metric families. */
export function areaRows(data: PlayerSimilarityOrbitDataJson): TextRow[] {
  return [
    { label: 'Similar', values: data.alikeFamilies ?? [] },
    { label: 'Different', values: data.differFamilies ?? [] },
  ].filter((r) => r.values.length > 0);
}

function PairText({ data }: { data: PlayerSimilarityOrbitDataJson }) {
  const verdict = orbitVerdict(data.verdict);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {verdict ? <Verdict text={verdict} /> : null}
      <Group heading="Roles" rows={roleRows(data)} slot="orbit-block-roles" />
      <Group heading="Areas" rows={areaRows(data)} slot="orbit-block-areas" />
    </div>
  );
}

/** The single orbit's three closest: name, then club. */
function ClosestList({ orbit }: { orbit: OrbitData }) {
  const skin = useBlockSkin();
  const { look } = useBlockLayout();
  const value = look === 'editorial' ? skin.fontSerif : skin.fontSans;
  const top = orbit.members.filter((m) => !m.outsidePool).slice(0, 3);
  if (top.length === 0) return null;
  return (
    <section data-slot="orbit-block-closest">
      <h4
        style={{
          margin: '0 0 6px',
          fontFamily: skin.fontSans,
          fontSize: 13,
          fontWeight: 600,
          color: 'var(--btl-block-ink-2)',
        }}
      >
        Closest to {orbitSurname(orbit.anchor.name)}
      </h4>
      <ol style={{ margin: 0, padding: 0, listStyle: 'none', display: 'grid', rowGap: 6 }}>
        {top.map((m) => (
          <li key={m.id} style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <span
              style={{
                fontFamily: value,
                fontSize: 16,
                lineHeight: 1.3,
                color: 'var(--btl-block-ink-1)',
              }}
            >
              {m.name}
            </span>
            {m.club ? (
              <span
                style={{ fontFamily: skin.fontSans, fontSize: 13, color: 'var(--btl-block-ink-3)' }}
              >
                {m.club}
              </span>
            ) : null}
          </li>
        ))}
      </ol>
    </section>
  );
}

/* ── the orbit ──────────────────────────────────────────────────────────── */

/** A pair whose two orbits draw different pools: any outsider, or two pool labels. */
export function acrossPools(orbits: readonly OrbitData[]): boolean {
  if (orbits.some((o) => o.members.some((m) => m.outsidePool))) return true;
  const [a, b] = orbits;
  return !!a?.poolLabel && !!b?.poolLabel && a.poolLabel !== b.poolLabel;
}

function OrbitVisual({ orbits, interactive }: { orbits: OrbitData[]; interactive: boolean }) {
  const faces = useFaceSources();
  if (orbits.length >= 2) {
    const pair = [orbits[0]!, orbits[1]!] as const;
    const anchors = [pair[0].anchor, pair[1].anchor];
    const shortNames = [
      orbitSurname(pair[0].anchor.name),
      orbitSurname(pair[1].anchor.name),
    ] as const;
    const actions = (p: OrbitPlayer) => <StripActions player={p} anchors={anchors} />;
    if (acrossPools(pair)) {
      return (
        <SimilarityOrbitPair
          slot="orbit-block-pair"
          orbits={pair}
          shortNames={shortNames}
          scales={[{ scale: ORBIT_COMPACT }]}
          interactive={interactive}
          motion={interactive}
          faceSources={faces}
          renderActions={actions}
        />
      );
    }
    return (
      <SimilarityOrbitCombined
        slot="orbit-block-combined"
        orbits={pair}
        shortNames={shortNames}
        scales={[{ scale: ORBIT_REGULAR }]}
        interactive={interactive}
        motion={interactive}
        faceSources={faces}
        renderActions={actions}
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
      renderActions={(p) => <StripActions player={p} anchors={[single.anchor]} />}
    />
  );
}

/** The visual, still in a picker tile and while Save image captures it. */
function OrbitBody({ orbits }: { orbits: OrbitData[] }) {
  const { density, capturing } = useBlockLayout();
  return <OrbitVisual orbits={orbits} interactive={density !== 'tile' && !capturing} />;
}

export function PlayerSimilarityOrbitBlock(
  props: GameBlockComponentProps<PlayerSimilarityOrbitDataJson>
) {
  const data = props.config.data ?? {};
  const orbits = (data.orbits ?? []).map(toOrbitData).filter((o) => o.members.length > 0);
  const pair = orbits.length >= 2;
  const aside: ReactNode = pair ? (
    <PairText data={data} />
  ) : orbits[0] ? (
    <ClosestList orbit={orbits[0]} />
  ) : null;
  const frame = baseFrame(props, pair ? 'orbit-pair' : 'orbit');
  // No scope line: the orbit is its own key.
  return (
    <BlockFrame {...frame} context="" aside={aside}>
      <div data-slot="orbit-block" style={{ marginTop: 14 }}>
        <OrbitBody orbits={orbits} />
      </div>
    </BlockFrame>
  );
}
