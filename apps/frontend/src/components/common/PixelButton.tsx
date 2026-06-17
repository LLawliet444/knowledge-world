/**
 * 星露谷风格像素按钮
 *
 * 参考 index.html 的 sd-btn：
 *   - 厚橙色底 / 像素内阴影 inset highlight + inset shadow
 *   - 白色文字 + 深咖啡色 text-shadow
 *   - 按下时 translateY(4px)，并把 inset 方向反转（营造"压下去"的立体效果）
 */

import React from "react";

interface PixelButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  /** primary=橙色主按钮，success=绿色确认按钮，secondary=浅色辅助按钮 */
  variant?: "primary" | "success" | "secondary";
  disabled?: boolean;
  className?: string;
}

const VARIANT_STYLES = {
  primary: {
    bg: "#f7a143",
    bgHover: "#ffb057",
    shadowDark: "#b86214",
    shadowLight: "#ffc685",
    text: "#ffffff",
  },
  success: {
    bg: "#61b329",
    bgHover: "#72c733",
    shadowDark: "#3c7713",
    shadowLight: "#97e65e",
    text: "#ffffff",
  },
  secondary: {
    bg: "#fff7e6",
    bgHover: "#fff2d1",
    shadowDark: "#b56c27",
    shadowLight: "#ffffff",
    text: "#492310",
  },
} as const;

export const PixelButton: React.FC<PixelButtonProps> = ({
  children,
  onClick,
  variant = "primary",
  disabled = false,
  className = "",
}) => {
  const s = VARIANT_STYLES[variant];
  const isDarkText = variant === "secondary";

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={[
        "sd-btn",
        "inline-flex items-center justify-center px-4 py-2 font-pixel text-sm",
        "relative transition-[transform,background-color] duration-75",
        "whitespace-nowrap",
        "disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0",
        className,
      ].join(" ")}
      style={{
        backgroundColor: disabled ? "#a08b6f" : s.bg,
        color: s.text,
        border: "4px solid #492310",
        fontFamily: "'Zpix', 'Press Start 2P', 'Microsoft YaHei', monospace",
        textShadow: isDarkText ? "none" : "2px 2px 0px #492310",
        boxShadow: `inset -4px -4px 0px ${s.shadowDark}, inset 4px 4px 0px ${s.shadowLight}`,
      }}
      onMouseEnter={(e) => {
        if (!disabled) (e.currentTarget as HTMLButtonElement).style.backgroundColor = s.bgHover;
      }}
      onMouseLeave={(e) => {
        if (!disabled) (e.currentTarget as HTMLButtonElement).style.backgroundColor = s.bg;
      }}
      onMouseDown={(e) => {
        if (disabled) return;
        const btn = e.currentTarget as HTMLButtonElement;
        btn.style.transform = "translateY(4px)";
        btn.style.boxShadow = `inset 4px 4px 0px ${s.shadowDark}, inset -4px -4px 0px ${s.shadowLight}`;
      }}
      onMouseUp={(e) => {
        const btn = e.currentTarget as HTMLButtonElement;
        btn.style.transform = "translateY(0)";
        btn.style.boxShadow = `inset -4px -4px 0px ${s.shadowDark}, inset 4px 4px 0px ${s.shadowLight}`;
      }}
      onMouseOut={(e) => {
        const btn = e.currentTarget as HTMLButtonElement;
        btn.style.transform = "translateY(0)";
        btn.style.boxShadow = `inset -4px -4px 0px ${s.shadowDark}, inset 4px 4px 0px ${s.shadowLight}`;
      }}
    >
      {children}
    </button>
  );
};

export default PixelButton;
