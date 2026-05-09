"use client";

import { TopNav } from "@/components/top-nav";

type CrosspayShellProps = {
  title: string;
  subtitle: string;
  children: React.ReactNode;
};

export function CrosspayShell({ title, subtitle, children }: CrosspayShellProps) {
  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col px-4 py-5 sm:px-6 md:py-8 lg:px-8">
      <TopNav />
      <section className="mb-6 rounded-2xl border border-border bg-card/70 p-5 sm:p-6">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
        <p className="mt-1 text-sm text-muted sm:text-base">{subtitle}</p>
      </section>
      <main>{children}</main>
    </div>
  );
}
