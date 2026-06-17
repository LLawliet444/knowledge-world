/**
 * 老学者头像 —— 星露谷像素风
 *
 * 双层木边框 + 内描边阴影
 */

import React from "react";

interface MentorAvatarProps {
  variant?: "avatar" | "half_body";
  size?: number;
}

const SRC_MAP = {
  avatar: "/characters/mentor_old_scholar.png",
  half_body: "/characters/mentor_old_scholar_half_body.png",
} as const;

export const MentorAvatar: React.FC<MentorAvatarProps> = ({
  variant = "avatar",
  size = 72,
}) => {
  const outerSize = size + 16;

  return (
    <div
      style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      width: outerSize,
      height: outerSize,
      backgroundColor: "#fff7e6",
      border: "4px solid #b56c27",
      boxShadow: "0 0 0 4px #eeb069",
    }}
    >
      <img
        src={SRC_MAP[variant]}
        alt="老学者"
        draggable={false}
        style={{
          width: size,
          height: size,
          imageRendering: "pixelated",
        }}
        onError={(e) => {
          (e.currentTarget as HTMLImageElement).outerHTML =
            `<span style="font-size:48px;line-height:1;">🧙</span>`;
        }}
      />
    </div>
  );
};

export default MentorAvatar;
