import React, { useEffect, useState } from "react";

interface ApprenticeAvatarProps {
  size?: number;
}

const SPRITESHEET = "/loading/explorer_drawing_8_frame_spritesheet.png";
const CROP = { x: 122, y: 158, w: 778, h: 746 };

export const ApprenticeAvatar: React.FC<ApprenticeAvatarProps> = ({
  size = 32,
}) => {
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      const fw = Math.round(CROP.w / 3);
      const fh = Math.round(CROP.h / 3);
      const canvas = document.createElement("canvas");
      canvas.width = fw;
      canvas.height = fh;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(
        img,
        CROP.x, CROP.y, fw, fh,
        0, 0, fw, fh,
      );
      setDataUrl(canvas.toDataURL("image/png"));
    };
    img.src = SPRITESHEET;
  }, []);

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        overflow: "hidden",
        flexShrink: 0,
        border: "2px solid #492310",
        backgroundColor: "transparent",
      }}
    >
      {dataUrl && (
        <img
          src={dataUrl}
          alt="学徒"
          draggable={false}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            imageRendering: "pixelated",
          }}
        />
      )}
    </div>
  );
};

export default ApprenticeAvatar;
