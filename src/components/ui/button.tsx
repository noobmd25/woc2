import React from "react";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "destructive";
};

export const Button = ({
  className = "",
  variant = "default",
  ...props
}: ButtonProps) => {
  const base = "px-4 py-2 text-sm font-medium rounded focus:outline-none";
  const variants = {
    default: "bg-blue-600 text-white hover:bg-blue-700",
    destructive:
      "bg-pink-100 text-red-800 border border-red-300 hover:bg-pink-200",
  };

  return (
    <button
      className={`${base} ${variants[variant]} ${className}`}
      {...props}
    />
  );
};
