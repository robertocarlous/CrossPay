import { CrosspayShell } from "@/components/crosspay-shell";

const rows = [
  {
    id: "TX-2991",
    recipient: "@devAda",
    amount: "120 USDC",
    chain: "Ethereum -> Solana",
    status: "Completed",
  },
  {
    id: "TX-2983",
    recipient: "+91•••7832",
    amount: "65 USDC",
    chain: "Base -> Solana",
    status: "Pending Claim",
  },
  {
    id: "TX-2974",
    recipient: "7Yp...kGv",
    amount: "0.45 SOL",
    chain: "Arbitrum -> Solana",
    status: "Bridging",
  },
];

export default function HistoryPage() {
  return (
    <CrosspayShell
      title="Payment History"
      subtitle="Track every transfer from routing to final settlement."
    >
      <section className="rounded-2xl border border-border bg-card p-4 sm:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-semibold">Recent Transactions</h2>
          <button
            className="rounded-xl border border-border bg-card-soft px-4 py-2 text-sm text-muted transition hover:text-white"
            type="button"
          >
            Export CSV
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-left text-sm">
            <thead>
              <tr className="text-muted">
                <th className="px-3 py-3 font-medium">Transaction</th>
                <th className="px-3 py-3 font-medium">Recipient</th>
                <th className="px-3 py-3 font-medium">Amount</th>
                <th className="px-3 py-3 font-medium">Route</th>
                <th className="px-3 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t border-border/80">
                  <td className="px-3 py-4">{row.id}</td>
                  <td className="px-3 py-4">{row.recipient}</td>
                  <td className="px-3 py-4">{row.amount}</td>
                  <td className="px-3 py-4 text-muted">{row.chain}</td>
                  <td className="px-3 py-4">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs ${
                        row.status === "Completed"
                          ? "bg-accent-2/20 text-accent-2"
                          : row.status === "Pending Claim"
                            ? "bg-amber-500/20 text-amber-300"
                            : "bg-accent/20 text-accent"
                      }`}
                    >
                      {row.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </CrosspayShell>
  );
}
