import type { ComponentType, ReactNode } from 'react';
import type { GameBlockConfig, GameBlockDensity } from './types';

/** What `GameBlockView` passes every block component. */
export interface GameBlockComponentProps<D = Record<string, unknown>> {
  config: GameBlockConfig<D>;
  /** Editor only: an editable title field the frame shows in place of the title. */
  titleSlot?: ReactNode;
  density: GameBlockDensity;
}

/** A block component of any data type, as the registry holds it. */
// oxlint-disable-next-line typescript/no-explicit-any
export type AnyGameBlockComponent = ComponentType<GameBlockComponentProps<any>>;

/** One submenu's components, keyed by type id. Each lane fills its own map. */
export type GameBlockComponentMap = Partial<Record<string, AnyGameBlockComponent>>;
