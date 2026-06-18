import React, { useEffect, useState } from "react";

interface ScholarLoadingProps {
  animating?: boolean;
  size?: number;
}

const SPRITESHEET = "/loading/explorer_drawing_8_frame_spritesheet.png";
const CROP = { x: 122, y: 158, w: 778, h: 746 };

const scholarLoadingKeyframes = `
@keyframes scholar-cycle {
  0% { background-position: 0% 0%; }
  11.11% { background-position: 50% 0%; }
  22.22% { background-position: 100% 0%; }
  33.33% { background-position: 0% 50%; }
  44.44% { background-position: 50% 50%; }
  55.55% { background-position: 100% 50%; }
  66.66% { background-position: 0% 100%; }
  77.77% { background-position: 50% 100%; }
  88.88% { background-position: 100% 100%; }
  100% { background-position: 100% 100%; }
}
`;

export const ScholarLoading: React.FC<ScholarLoadingProps> = ({
  animating = false,
  size = 120,
}) => {
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = CROP.w;
      canvas.height = CROP.h;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(img, CROP.x, CROP.y, CROP.w, CROP.h, 0, 0, CROP.w, CROP.h);
      setDataUrl(canvas.toDataURL("image/png"));
    };
    img.src = SPRITESHEET;
  }, []);

  return (
    <>
      <style>{scholarLoadingKeyframes}</style>
      <div
        style={{
          width: size,
          height: size,
          backgroundImage: dataUrl ? `url(${dataUrl})` : `url(${SPRITESHEET})`,
          backgroundSize: "300% 300%",
          backgroundPosition: "0% 0%",
          backgroundRepeat: "no-repeat",
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
