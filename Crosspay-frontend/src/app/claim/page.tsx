import { CrosspayShell } from "@/components/crosspay-shell";

export default function ClaimPage() {
  return (
    <CrosspayShell
      title="Claim Your Payment"
      subtitle="Secure your payout to Solana wallet with one smooth flow."
    >
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
          <h2 className="text-xl font-semibold">Magic Claim Link</h2>
          <p className="mt-1 text-sm text-muted">
            Recipient enters verification details, links wallet, and claims instantly.
          </p>

          <div className="mt-5 space-y-4">
            <label className="space-y-2">
              <span className="text-sm text-muted">Claim Code</span>
              <input
                className="w-full rounded-xl border border-border bg-card-soft px-4 py-3 text-sm outline-none ring-accent transition focus:ring-2"
                placeholder="CP-4R8P-2VQX"
                type="text"
              />
            </label>
            <label className="space-y-2">
              <span className="text-sm text-muted">Phone or Email</span>
              <input
                className="w-full rounded-xl border border-border bg-card-soft px-4 py-3 text-sm outline-none ring-accent transition focus:ring-2"
                placeholder="+234 801 XXX XXXX or jane@mail.com"
                type="text"
              />
            </label>
            <label className="space-y-2">
              <span className="text-sm text-muted">Solana Wallet Address</span>
              <input
                className="w-full rounded-xl border border-border bg-card-soft px-4 py-3 text-sm outline-none ring-accent transition focus:ring-2"
                placeholder="7Yp...kGv"
                type="text"
              />
            </label>
          </div>

          <button
            className="mt-6 w-full rounded-xl bg-gradient-to-r from-accent-2 to-[#49d1ff] px-4 py-3 text-sm font-semibold text-[#031512] transition hover:brightness-105"
            type="button"
          >
            Verify & Claim Funds
          </button>
        </section>

        <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
          <h3 className="text-lg font-semibold">Claim Progress</h3>
          <ul className="mt-4 space-y-3 text-sm">
            <li className="rounded-xl border border-border bg-card-soft p-3">
              <p className="font-medium">1. Open claim link</p>
              <p className="text-muted">Completed</p>
            </li>
            <li className="rounded-xl border border-border bg-card-soft p-3">
              <p className="font-medium">2. Verify phone or email</p>
              <p className="text-accent-2">In progress</p>
            </li>
            <li className="rounded-xl border border-border bg-card-soft p-3">
              <p className="font-medium">3. Connect Solana wallet</p>
              <p className="text-muted">Pending</p>
            </li>
            <li className="rounded-xl border border-border bg-card-soft p-3">
              <p className="font-medium">4. Receive payout</p>
              <p className="text-muted">Pending</p>
            </li>
          </ul>
        </section>
      </div>
    </CrosspayShell>
  );
}
