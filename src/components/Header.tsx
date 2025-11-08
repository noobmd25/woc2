"use client";

import { ModeToggle } from "@/components/mode-toggle";
import UserMenu from "@/components/user-menu";
import { Menu } from "lucide-react"; // Importing a hamburger icon
import Image from 'next/image';
import Link from "next/link";
import { usePathname } from "next/navigation"; // Add this import
import { useEffect, useMemo, useState } from "react";
import logoSrc from '../../public/woc-logo-transparent.svg';
import { useAuth } from "./AuthProvider";


type NavigationItem = {
  to: string;
  label: string;
  requireAuth?: boolean;
  canView?: string[];
};

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const { user } = useAuth();
  const userRole = user?.profile?.role || null; // Get role directly
  const isAuthenticated = !!user;
  const currentPath = usePathname();


  const links = useMemo(() => {
    const allLinks: NavigationItem[] = [
      { to: "/oncall", label: "On Call", requireAuth: true, canView: ['admin', 'scheduler', 'viewer'] },
      { to: "/directory", label: "Directory", requireAuth: true, canView: ['admin', 'scheduler', 'viewer'] },
      { to: "/schedule", label: "Schedule", requireAuth: true, canView: ['admin', 'scheduler'] },
      { to: "/admin", label: "Admin", canView: ['admin'] },
    ];
    return allLinks.filter((link) => {
      if (link.requireAuth && !isAuthenticated) return false;
      if (link.canView && (!userRole || !link.canView.includes(userRole))) return false;
      return true;
    });
  }, [isAuthenticated, userRole]);

  // Handle scroll effect for sticky navbar
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header className={"sticky top-0 z-50 transition-all duration-300"}>
      <div className="mx-auto w-full max-w-full px-3 py-3 sm:px-4 sm:py-4 xl:max-w-7xl xl:px-6">
        <div
          className={`w-full max-w-full overflow-hidden rounded-2xl bg-header-bg px-3 py-3 backdrop-blur-md transition-all duration-300 sm:rounded-3xl sm:px-4 sm:py-4 xl:px-6 ${isScrolled ? "shadow-lg" : "shadow-sm"
            }`}
        >
          <div className="flex w-full max-w-full items-center justify-between">
            {/* Left side: Hamburger on mobile, Logo on desktop */}
            <div className="flex min-w-0 flex-1 items-center justify-start md:flex-none">
              {/* Mobile menu button */}
              <button
                className="rounded-md p-1 hover:bg-muted md:hidden"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                type="button"
              >
                <Menu className="h-5 w-5" />
              </button>

              {/* Logo for desktop */}
              <div className="hidden md:block">
                <Image src={logoSrc} alt="Logo" width={40} height={40} />
              </div>
            </div>
            {/* Center: Logo on mobile, Nav on desktop */}
            <div className="flex min-w-0 flex-1 items-center justify-center md:flex-none md:justify-start xl:px-10">
              {/* Logo for mobile */}
              <div className="md:hidden">
                <Image src={logoSrc} alt="Logo" width={40} height={40} />
              </div>

              {/* Desktop Navigation */}
              <nav className="hidden items-center space-x-4 md:flex lg:space-x-6 xl:space-x-10">
                {links.map(({ to, label }) => {
                  const isActive = currentPath === to;
                  return (
                    <Link

                      className={`text-base transition-colors hover:text-primary ${isActive
                        ? "font-bold text-foreground underline decoration-2 underline-offset-4"
                        : "font-normal text-foreground"
                        }`}
                      key={to}
                      href={to}
                    >
                      {label}
                    </Link>
                  );
                })}
              </nav>
            </div>

            {/* Right side: Controls */}
            <div className="flex min-w-0 flex-1 items-center justify-end md:flex-none">
              <div className="flex items-center space-x-1 md:flex lg:space-x-2">
                <ModeToggle />
              </div>
              {isAuthenticated ? (
                <div className="ml-1 md:ml-2">
                  <UserMenu />
                </div>
              ) : (
                <div className="hidden md:block ml-1 md:ml-2">
                  <Link
                    className="w-full rounded-full border border-foreground px-5 py-2.5 text-center font-medium text-base text-foreground transition-colors hover:bg-foreground hover:text-background dark:border-white dark:text-white"
                    onClick={() => setIsMenuOpen(false)}
                    href={"/auth/login"}
                  >
                    Login
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Mobile Navigation */}
          {isMenuOpen && (
            <nav className="mt-3 flex w-full max-w-full flex-col space-y-1 border-border/20 border-t pt-3 md:hidden">
              {links.map(({ to, label }) => {
                // Special handling for news tab - should be active for /news and /news/*
                const isActive =
                  currentPath === to;
                return (
                  <Link
                    className={`w-full max-w-full truncate rounded-md px-3 py-2 text-sm transition-colors hover:bg-muted sm:text-base ${isActive
                      ? "bg-muted font-bold text-foreground"
                      : "text-foreground"
                      }`}
                    key={to}
                    onClick={() => setIsMenuOpen(false)}
                    href={to}
                  >
                    {label}
                  </Link>
                );
              })}
              {!isAuthenticated && (
                <div className="flex w-full max-w-full flex-col space-y-2 px-3 pt-4">
                  <Link
                    className="w-full rounded-full border border-foreground px-5 py-2.5 text-center font-medium text-base text-foreground transition-colors hover:bg-foreground hover:text-background dark:border-white dark:text-white"
                    onClick={() => setIsMenuOpen(false)}
                    href={"/auth/login"}
                  >
                    Login
                  </Link>
                </div>
              )}
            </nav>
          )}
        </div>
      </div>
    </header>
  );
}
