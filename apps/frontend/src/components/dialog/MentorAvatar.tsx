/**
 * 老学者头像 / 半身立绘组件
 */

import React from "react";

interface MentorAvatarProps {
  /** "avatar" = 头像，"half_body" = 半身立绘 */
  variant?: "avatar" | "half_body";
  size?: number;
}

const SRC_MAP = {
  avatar: "/characters/mentor_old_scholar.png",
  half_body: "/characters/mentor_old_scholar_half_body.png",
};

export const MentorAvatar: React.FC<MentorAvatarProps> = ({
  variant = "avatar",
  size = 96,
}) => {
  return (
    <div
      className="flex items-center justify-center border-4 border-[#3a1f0a] rounded bg-[#fff8e6] shadow-[3px_3px_0_0_#3a1f0a] flex-shrink-0"
      style={{ width: size + 16, height: size + 16 }}
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
            '<span style="font-size:48px;line-height:1;">🧙</span>';
        }}
      />
    </div>
  );
};

export default MentorAvatar;
