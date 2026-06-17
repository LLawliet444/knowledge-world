/**
 * PixiJS 纹理预加载
 *
 * 在 @pixi/react 组件中使用 PIXI.utils.TextureCache 前，
 * 必须先调用 PIXI.Texture.from() 将纹理加入缓存。
 * 本函数收集所有 Pixi 组件所需的图片路径并预加载。
 */

import * as PIXI from "pixi.js";

/** 收集当前世界 + 场景的所有纹理路径并预加载 */
export function preloadPixiTextures(
  avatarPaths: string[],
  sceneKeys: string[],
): void {
  const paths = new Set<string>();

  // 通用 UI
  paths.add("/ui/halo_available.png");

  // 迷雾粒子
  paths.add("/fog/fog_particle_1.png");

  // 四层背景
  paths.add("/biomes/world_what.png");
  paths.add("/biomes/world_how.png");
  paths.add("/biomes/world_why.png");
  paths.add("/biomes/world_system.png");

  // 学者行走图
  paths.add("/characters/scholar_apprentice_sprite_walk_down_4f_clean.png");
  paths.add("/characters/scholar_apprentice_sprite_walk_left_4f_clean.png");
  paths.add("/characters/scholar_apprentice_sprite_walk_right_4f_clean.png");
  paths.add("/characters/scholar_apprentice_sprite_walk_up_4f_clean.png");

  // NPC 头像
  for (const p of avatarPaths) paths.add(p);

  // 场景背景 + focus symbol
  const SCENE_BG_MAP: Record<string, string> = {
    cave_fire: "cave_bg.png",
    empire_gate: "empire_bg.png",
    grain_field: "field_bg.png",
    market_trade: "market_bg.png",
    stargazing: "stargazing_bg.png",
    stone_law: "stone_bg.png",
    temple_myth: "temple_bg.png",
  };
  for (const key of sceneKeys) {
    const bgFile = SCENE_BG_MAP[key];
    if (bgFile) paths.add(`/scenes/${key}/${bgFile}`);
    paths.add(`/scenes/${key}/focus_symbol.png`);
  }

  // 调用 PIXI.Texture.from() 完成预加载 + 缓存
  for (const p of paths) {
    PIXI.Texture.from(p);
  }
}
