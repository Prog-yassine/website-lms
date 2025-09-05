import React from "react";

export function Button({ children, variant = "default", size = "md", asChild, ...props }) {
  const className = `
    px-4 py-2 rounded-lg font-semibold
    ${variant === "outline" ? "border border-gray-400" : "bg-blue-500 text-white"}
    ${size === "sm" ? "text-sm" : size === "lg" ? "text-lg" : "text-md"}
  `;

  if (asChild) {
    return React.cloneElement(children, { className });
  }

  return <button className={className} {...props}>{children}</button>;
}
