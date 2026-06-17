# Scholar 1024 Walk Sprite Notes

- Source: `scholar_idle_candidate.jpg`，1024×1024 RGB
- Cutout: `scholar_idle_candidate_cutout_1024.png`
- Frame size: 1024×1024，每一帧保持和原图同尺寸
- Frames per direction: 4
- Animation rhythm: contact → pass/up → contact → pass/up
- Bobbing: +8 / -8 / +8 / -8 px，预览缩小后也能看出起伏
- Walking action: legs use large alternating stride; map arm and quill arm swing in opposite directions.
- Direction policy: 保持原图角色身份，不重新生成新角色；left 使用镜像，right/down/up 使用同一抠图主体的动作变体。
- Note: 若需要真正背面/侧面三视图，需要先提供或生成一致的角色 turn-around reference。
