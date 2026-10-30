import React from "react";

/**
 * Base surface card.
 * @param {string} className  - extra classes
 * @param {string} padding    - "none" | "sm" | "md" (default) | "lg"
 */
export default function Card({ children, className = "", padding = "md", onClick, style }) {
  const padMap = { none: "", sm: "p-4", md: "p-5", lg: "p-6" };
  return (
    <div
      className={`card ${padMap[padding] ?? padMap.md} ${onClick ? "cursor-pointer card-hover transition-colors" : ""} ${className}`}
      style={style}
      onClick={onClick}
    >
      {children}
    </div>
  );
}
