"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ConnectButton } from "@rainbow-me/rainbowkit";

const navItems = [
  { href: "/", label: "Home" },
  { href: "/send", label: "Send" },
  { href: "/claim", label: "Claim" },
  { href: "/history", label: "History" },
  { href: "/ai-agent", label: "AI Agent" },
];

export function TopNav() {
  const pathname = usePathname();

  return (
    <header className="sticky top-4 z-30 mb-8 rounded-2xl border border-border/70 bg-card/90 px-4 py-3 shadow-[0_12px_44px_rgba(0,0,0,0.22)] backdrop-blur-xl sm:px-5">
      <div className="flex items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-accent to-accent-2" />
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-muted">CrossPay</p>
            <p className="text-sm font-semibold">Global Stable Payments</p>
          </div>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                  isActive
                    ? "bg-accent/20 text-white"
                    : "text-muted hover:bg-card-soft hover:text-white"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <ConnectButton showBalance={false} chainStatus="icon" accountStatus="address" />
      </div>

      <nav className="mt-3 grid grid-cols-5 gap-1 md:hidden">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-lg px-2 py-2 text-center text-xs font-medium ${
                isActive ? "bg-accent text-white" : "text-muted"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
