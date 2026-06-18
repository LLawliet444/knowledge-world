import React from "react";

interface ScholarLoadingProps {
  animating?: boolean;
  size?: number;
}

const SPRITESHEET = "/loading/explorer_drawing_8_frame_spritesheet.png";
const FRAME_W = 341;
const FRAME_H = 341;
const FRAMES = 9;

const scholarLoadingKeyframes = `
@keyframes scholar-cycle {
  0% { background-position: 0px 0px; }
  11.11% { background-position: -${FRAME_W}px 0px; }
  22.22% { background-position: -${FRAME_W * 2}px 0px; }
  33.33% { background-position: 0px -${FRAME_H}px; }
  44.44% { background-position: -${FRAME_W}px -${FRAME_H}px; }
  55.55% { background-position: -${FRAME_W * 2}px -${FRAME_H}px; }
  66.66% { background-position: 0px -${FRAME_H * 2}px; }
  77.77% { background-position: -${FRAME_W}px -${FRAME_H * 2}px; }
  88.88% { background-position: -${FRAME_W * 2}px -${FRAME_H * 2}px; }
  100% { background-position: -${FRAME_W * 2}px -${FRAME_H * 2}px; }
}
`;

export const ScholarLoading: React.FC<ScholarLoadingProps> = ({
  animating = false,
  size = 120,
}) => {
  const scale = size / FRAME_W;
  const containerW = FRAME_W * scale;
  const containerH = FRAME_H * scale;

  return (
    <>
      <style>{scholarLoadingKeyframes}</style>
      <div
        style={{
          width: containerW,
          height: containerH,
          backgroundImage: `url(${SPRITESHEET})`,
          backgroundSize: `${1024 * scale}px ${1024 * scale}px`,
          backgroundPosition: animating ? undefined : "0px 0px",
          animation: animating
            ? `scholar-cycle 1.08s steps(1) infinite`
            : "none",
          imageRendering: "pixelated",
          flexShrink: 0,
        }}
      />
    </>
  );
};

export default ScholarLoading;
