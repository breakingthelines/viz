/**
 * Shared types across the player-profile stat charts (spec §4.1,
 * `profile-spec.md`). Every team, competition or player a chart mentions
 * renders through this shape — `label` plus an optional `href` — so a host
 * wires its own entity-route resolver once
 * (`entityRoutePathFromBtlId`, `app/lib/game-centre.ts:265`) rather than
 * each chart inventing its own link contract.
 *
 * `href` is optional in the TYPE only for an unresolved provider id (spec:
 * "Unresolved provider ids render as plain text"); a caller passes it
 * whenever the underlying `SubjectRef` actually resolved.
 */
export interface EntityLink {
  /** Display label. */
  label: string;
  /** Present whenever the underlying SubjectRef resolves; absent for an unresolved provider id. */
  href?: string;
}
