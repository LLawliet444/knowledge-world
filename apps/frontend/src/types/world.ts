export type LayerType = "what" | "how" | "why" | "system";

export type NodeState =
  | "unexplored"
  | "visited"
  | "learning"
  | "mastered"
  | "transfer";

export interface WorldNode {
  id: string;
  name: string;
  layer: LayerType;
  iconType: string;
  neighbors: string[];
  sourceExcerpt: string;
  /** Runtime-only: current understanding level. */
  state?: NodeState;
  /** Percentage coordinates (0-100) relative to the map image. */
  x?: number;
  y?: number;
}

export interface WorldLayer {
  layer: LayerType;
  biomeName: string;
  nodes: WorldNode[];
}

export interface World {
  worldId: string;
  title: string;
  subtitle: string;
  biomeTheme: string;
  /** Path to the background map image. */
  mapImage: string;
  /** Character's starting position on the map (percentages). */
  startPosition: { x: number; y: number };
  /** First node that is considered "available" from the start. */
  startNodeId: string;
  layers: WorldLayer[];
}
