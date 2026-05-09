import Link from "next/link";
import { CrosspayShell } from "@/components/crosspay-shell";
import { SendForm } from "./send-form";

export default function SendPage() {
  return (
    <CrosspayShell
      title="Pay Anyone, Anywhere"
      subtitle="Send from any chain and settle to Solana in seconds."
    >
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.25fr_0.75fr]">
        <SendForm />

        <aside className="space-y-5">
          <section className="rounded-2xl border border-border bg-card p-5">
            <h3 className="text-lg font-semibold">AI Agent</h3>
            <p className="mt-1 text-sm text-muted">
              Ask CrossPay assistant for route optimization and transfer safety checks.
            </p>
            <div className="mt-4 rounded-xl border border-border bg-card-soft p-3">
              <p className="text-xs text-muted">Suggested prompt</p>
              <p className="mt-2 text-sm">
                Find the cheapest path to send 250 USDC from Base to Solana.
              </p>
            </div>
            <Link
              href="/ai-agent"
              className="mt-4 block w-full rounded-xl bg-accent-2/90 px-4 py-3 text-center text-sm font-semibold text-[#031512] transition hover:bg-accent-2"
            >
              Open AI Agent
            </Link>
          </section>

          <section className="rounded-2xl border border-border bg-card p-5">
            <h3 className="text-lg font-semibold">Quick Metrics</h3>
            <div className="mt-3 space-y-3 text-sm">
              <div className="rounded-xl border border-border bg-card-soft p-3">
                <p className="text-muted">Total Volume</p>
                <p className="text-xl font-semibold">$48,240</p>
              </div>
              <div className="rounded-xl border border-border bg-card-soft p-3">
                <p className="text-muted">Avg. Settlement</p>
                <p className="text-xl font-semibold">57 sec</p>
              </div>
            </div>
          </section>
        </aside>
      </div>
    </CrosspayShell>
  );
}
