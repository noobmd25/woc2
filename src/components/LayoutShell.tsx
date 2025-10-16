"use client";

import { useEffect } from "react";
import { Toaster } from "react-hot-toast";

import Header from "./Header";

export default function LayoutShell({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    const handleBodyClick = () => {
      const sidebarNav = document.getElementById("side-nav");
      if (sidebarNav?.classList.contains("open")) {
        sidebarNav.classList.remove("open");
      }
    };
    document.body.addEventListener("click", handleBodyClick);
    return () => {
      document.body.removeEventListener("click", handleBodyClick);
    };
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-black transition-colors duration-300 flex flex-col">
      <Header />
      <main className="flex justify-center flex-grow">
        <div className="w-full max-w-screen-lg px-1 md-px-4">{children}</div>
      </main>
      <Toaster position="top-center" />
    </div>
  );
}
