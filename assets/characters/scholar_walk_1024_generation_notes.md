# Scholar 1024 Walk Sprite Notes

- Source: `scholar_idle_candidate.jpg`，1024×1024 RGB
- Cutout: `scholar_idle_candidate_cutout_1024.png`
- Frame size: 1024×1024，每一帧保持和原图同尺寸
- Frames per direction: 4
- Direction policy: 保守派生，不重画角色。down/right/up 使用同一抠图主体；left 使用镜像主体。
- Bobbing: +2 / -2 / +2 / -2 px
- Motion: 轻微整体倾斜、左右方向轻微前倾；不拆分重组身体，避免角色不一致和缝隙。
