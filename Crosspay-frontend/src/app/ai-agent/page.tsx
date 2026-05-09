import { CrosspayShell } from "@/components/crosspay-shell";

const suggestions = [
  "Find cheapest route from Polygon to Solana for 500 USDC.",
  "Estimate final received amount after all fees for 1 ETH.",
  "Check risk and confirmation times for this recipient address.",
];

export default function AiAgentPage() {
  return (
    <CrosspayShell
      title="CrossPay AI Agent"
      subtitle="Your co-pilot for route optimization, cost estimation, and safety checks."
    >
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.2fr_0.8fr]">
        <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
          <h2 className="text-xl font-semibold">Assistant Console</h2>

          <div className="mt-4 space-y-3">
            <div className="max-w-[92%] rounded-2xl rounded-bl-md border border-border bg-card-soft px-4 py-3 text-sm">
              Hey! I can suggest the cheapest chain path and best token route to Solana.
            </div>
            <div className="ml-auto max-w-[92%] rounded-2xl rounded-br-md bg-accent px-4 py-3 text-sm text-white">
              I want to send 320 USDC from Base to Solana with minimum fees.
            </div>
            <div className="max-w-[92%] rounded-2xl rounded-bl-md border border-border bg-card-soft px-4 py-3 text-sm">
              Best route: Base -&gt; USDC bridge -&gt; Solana. Est. fee 0.39%, ETA 38s.
            </div>
          </div>

          <div className="mt-5 flex gap-2">
            <input
              className="w-full rounded-xl border border-border bg-card-soft px-4 py-3 text-sm outline-none ring-accent transition focus:ring-2"
              placeholder="Ask about route, gas, status, or recipient safety..."
              type="text"
            />
            <button
              className="rounded-xl bg-gradient-to-r from-accent to-[#9c67ff] px-5 py-3 text-sm font-semibold text-white"
              type="button"
            >
              Send
            </button>
          </div>
        </section>

        <aside className="space-y-5">
          <section className="rounded-2xl border border-border bg-card p-5">
            <h3 className="text-lg font-semibold">Suggested Prompts</h3>
            <ul className="mt-3 space-y-3">
              {suggestions.map((item) => (
                <li key={item}>
                  <button
                    className="w-full rounded-xl border border-border bg-card-soft px-3 py-2.5 text-left text-sm text-muted transition hover:text-white"
                    type="button"
                  >
                    {item}
                  </button>
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-2xl border border-border bg-card p-5">
            <h3 className="text-lg font-semibold">Agent Tools</h3>
            <div className="mt-3 space-y-3 text-sm">
              <div className="rounded-xl border border-border bg-card-soft p-3">
                <p className="font-medium">Route Simulator</p>
                <p className="text-muted">Compares LI.FI paths and outputs best ETA/fees.</p>
              </div>
              <div className="rounded-xl border border-border bg-card-soft p-3">
                <p className="font-medium">Recipient Guard</p>
                <p className="text-muted">Checks address format and suspicious behavior flags.</p>
              </div>
            </div>
          </section>
        </aside>
      </div>
    </CrosspayShell>
  );
}
