"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserProfile } from "@/components/auth/user-profile";
import { cn } from "@/lib/utils";
import { FontSizeToggle } from "./ui/font-size-toggle";
import { ModeToggle } from "./ui/mode-toggle";

const NAV_LINKS = [
  { label: "Dashboard",    href: "/dashboard" },
  { label: "Analyze Thumbnail", href: "/upload" },
  { label: "Profile",      href: "/profile" },
] as const;

export function SiteHeader() {
  const pathname = usePathname();

  return (
    <>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-background focus:text-foreground focus:border focus:rounded-md"
      >
        Skip to main content
      </a>

      <header
        className="border-b border-border/60 bg-background/95 backdrop-blur-sm sticky top-0 z-40"
        role="banner"
      >
        <nav
          className="container mx-auto px-4 py-3 flex items-center justify-between gap-6"
          aria-label="Main navigation"
        >
          {/* Logo */}
          <Link
            href="/"
            className="flex items-center gap-2.5 shrink-0 group"
            aria-label="ThumbnailIQ — Go to homepage"
          >
            <div
              className="flex items-center justify-center w-9 h-9 rounded-lg border border-primary/40 bg-primary/10 text-primary text-xl leading-none group-hover:border-primary/70 group-hover:bg-primary/15 transition-all duration-200"
              aria-hidden="true"
            >
              🎬
            </div>
            <span className="font-[family-name:var(--font-playfair)] text-lg font-semibold tracking-wide text-primary group-hover:text-primary/85 transition-colors duration-200 hidden sm:inline">
              ThumbnailIQ
            </span>
          </Link>

          {/* Centre nav links */}
          <div className="flex items-center gap-1" role="group" aria-label="Page navigation">
            {NAV_LINKS.map(({ label, href }) => {
              const isActive = pathname === href || pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-150",
                    isActive
                      ? "text-primary bg-primary/10 border border-primary/30"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent/60"
                  )}
                  aria-current={isActive ? "page" : undefined}
                >
                  {label}
                </Link>
              );
            })}
          </div>

          {/* Right: user area */}
          <div className="flex items-center gap-3 shrink-0" role="group" aria-label="User actions">
            <UserProfile />
            <FontSizeToggle />
            <ModeToggle />
          </div>
        </nav>
      </header>
    </>
  );
}
