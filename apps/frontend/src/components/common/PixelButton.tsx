import React from "react";

interface PixelButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost";
  fullWidth?: boolean;
}

/**
 * A chunky pixel-styled button. Uses hard borders and high-contrast colors to stay on-theme
 * while remaining accessible (semantic-friendly).
 */
export const PixelButton: React.FC<PixelButtonProps> = ({
  children,
  variant = "primary",
  fullWidth,
  className = "",
  disabled,
  ...rest
}) => {
  const variantClasses =
    variant === "primary"
      ? "bg-[#f5b642] text-[#1a1226] border-[#1a1226] hover:bg-[#ffd68a]"
      : variant === "secondary"
      ? "bg-[#6b5b95] text-white border-[#1a1226] hover:bg-[#8e6cff]"
      : "bg-transparent text-[#1a1226] border-[#1a1226] hover:bg-[#f5d8a0]";

  return (
    <button
      {...rest}
      disabled={disabled}
      className={[
        "inline-flex",
        "items-center",
        "justify-center",
        "gap-2",
        "px-4",
        "py-2",
        "font-pixel",
        "text-sm",
        "uppercase",
        "tracking-wide",
        "border-4",
        "shadow-[4px_4px_0_0_#1a1226]",
        "disabled:opacity-50",
        "disabled:cursor-not-allowed",
        "transition-transform",
        "active:translate-x-[2px]",
        "active:translate-y-[2px]",
        "active:shadow-[2px_2px_0_0_#1a1226]",
        variant === "primary"
          ? "hover:-translate-y-[1px]"
          : "",
        fullWidth ? "w-full" : "",
        className,
      ].join(" ")}
    >
      {children}
    </button>
  );
};

export default PixelButton;
