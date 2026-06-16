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
  /** Runtime state: current understanding level. */
  state?: NodeState;
  /** Inferred by MapRenderer; not serialized. */
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
  layers: WorldLayer[];
  startNodeId: string;
}
