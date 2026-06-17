# Scholar Walk Sprite Generation Notes

- Source reference: `assets/characters/scholar_idle_candidate.jpg`
- Frame size: 48×48
- Frames per direction: 4
- Directions: down / left / right / up
- Loop rhythm: contact → pass/up → contact → pass/up
- Bobbing: Y offset alternates +1 / -1 / +1 / -1 pixels
- Paper-card wobble: tiny ±1-2 degree rotation per frame
- Frontend-compatible files overwritten: `scholar_apprentice_sprite_walk_{down,left,right,up}_4f_clean.png`
