// Interactive StatsBomb-grade football blocks. Each is a self-contained panel
// (its own chrome + controls + the shared PanelFooter). Exported under the
// dedicated `@breakingthelines/viz/football/blocks` subpath to avoid the name
// clash with the legacy `ShotMap` composition exported from `./football`.
export * from './shot-map';
export * from './xg-momentum';
export * from './pass-network';
export * from './heat-map';
export * from './line-breaking';
export * from './moment-360';
export * from './pitch-control';
export * from './pass-sonar';
export * from './press-map';
export * from './set-piece';
export * from './progression';
export * from './goal-sequence';
