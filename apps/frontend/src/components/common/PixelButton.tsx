/**
 * 像素风按钮组件
 */

import React from "react";

interface PixelButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary";
  disabled?: boolean;
  className?: string;
}

export const PixelButton: React.FC<PixelButtonProps> = ({
  children,
  onClick,
  variant = "primary",
  disabled = false,
  className = "",
}) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={[
        "rounded border-4 border-[#3a1f0a] px-4 py-2 font-pixel text-xs text-[#1a1226]",
        "shadow-[3px_3px_0_0_#3a1f0a] transition-transform",
        "hover:-translate-x-[2px] hover:-translate-y-[2px] hover:shadow-[5px_5px_0_0_#3a1f0a]",
        "active:translate-x-[2px] active:translate-y-[2px] active:shadow-[1px_1px_0_0_#3a1f0a]",
        "disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-x-0",
        "disabled:hover:translate-y-0 disabled:hover:shadow-[3px_3px_0_0_#3a1f0a]",
        variant === "primary"
          ? "bg-[#f5b642]"
          : "bg-[#fff8e6]",
        className,
      ].join(" ")}
    >
      {children}
    </button>
  );
};

export default PixelButton;
