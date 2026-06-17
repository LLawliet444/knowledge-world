import { sapiensWorld } from "./sapiens";
import { economicsWorld } from "./economics";
import type { World } from "../types/world";

export const PREBUILT_WORLDS: World[] = [sapiensWorld, economicsWorld];

export function getWorld(id: string): World | undefined {
  return PREBUILT_WORLDS.find((w) => w.worldId === id);
}

export { sapiensWorld, economicsWorld };
