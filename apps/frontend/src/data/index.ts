import { sapiensWorld } from "./sapiens";
import { economicsWorld } from "./economics";
import type { World } from "../types/world";

export const PREBUILT_WORLDS: World[] = [sapiensWorld, economicsWorld];

export function getDefaultWorld(): World {
  return sapiensWorld;
}
