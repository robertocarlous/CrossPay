"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { TopNav } from "@/components/top-nav";

export default function Home() {
  const [recipientMode, setRecipientMode] = useState<"username" | "phone" | "wallet">(
    "username",
  );
  const [amount, setAmount] = useState(250);
  const [openFaq, setOpenFaq] = useState(0);

  const quote = useMemo(() => {
    const feeRate = 0.0045;
    const fee = Number((amount * feeRate).toFixed(2));
    const receive = Number((amount - fee).toFixed(2));
    return {
      fee,
      receive,
      eta: amount > 500 ? "60 sec" : "42 sec",
    };
  }, [amount]);

  const recipientPlaceholder =
    recipientMode === "username"
      ? "@janeDev"
      : recipientMode === "phone"
        ? "+234 801 000 0000"
        : "7Yp...kGv";

  const faqs = [
    {
      q: "What does CrossPay do?",
      a: "CrossPay lets users pay from EVM chains and settle to Solana, using wallet address, @username, or phone number as recipient identity.",
    },
    {
      q: "How does the recipient get funds?",
      a: "Recipients receive a secure claim link, verify identity once, connect a Solana wallet, and claim instantly.",
    },
    {
      q: "Where does AI Agent help?",
      a: "The AI Agent suggests cheapest routes, estimates fees/time, and warns about risky recipient addresses before you send.",
    },
  ];

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col px-4 py-5 sm:px-6 md:py-8 lg:px-8">
      <TopNav />

      <section className="grid grid-cols-1 gap-8 rounded-3xl border border-border bg-card/80 p-6 shadow-[0_22px_80px_rgba(0,0,0,0.25)] sm:p-8 lg:grid-cols-[1.2fr_0.8fr] lg:p-10">
        <div>
          <p className="mb-3 inline-block rounded-full border border-border bg-card-soft px-3 py-1 text-xs uppercase tracking-wider text-accent-2">
            Powered by LI.FI + Solana
          </p>
          <h1 className="text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
            Instant Global Payments,
            <span className="block bg-gradient-to-r from-accent-2 to-accent bg-clip-text text-transparent">
              From Any Chain to Solana
            </span>
          </h1>
          <p className="mt-4 max-w-2xl text-base text-muted sm:text-lg">
            Send crypto like a modern payment app. Pay with a wallet, `@username`,
            or phone number, and let recipients claim seamlessly on Solana.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/send"
              className="rounded-xl bg-gradient-to-r from-accent to-[#9c67ff] px-5 py-3 text-sm font-semibold text-white transition hover:brightness-110"
            >
              Start Sending
            </Link>
            <Link
              href="/claim"
              className="rounded-xl border border-border bg-card-soft px-5 py-3 text-sm font-medium text-white transition hover:bg-[#16213b]"
            >
              Claim Payment
            </Link>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card-soft p-5">
          <h2 className="text-lg font-semibold">Interactive Route Estimator</h2>
          <p className="mt-1 text-sm text-muted">
            Simulate what users see before sending.
          </p>

          <div className="mt-4 grid gap-3 text-sm">
            <label className="space-y-2">
              <span className="text-muted">Recipient Type</span>
              <div className="grid grid-cols-3 gap-2">
                {(["username", "phone", "wallet"] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setRecipientMode(mode)}
                    className={`rounded-lg px-2 py-2 text-xs font-medium capitalize transition ${
                      recipientMode === mode
                        ? "bg-accent text-white"
                        : "bg-card text-muted hover:text-white"
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </label>

            <div className="rounded-xl border border-border bg-card p-3">
              <p className="text-muted">Recipient</p>
              <p className="font-medium">{recipientPlaceholder}</p>
            </div>

            <label className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-muted">Send Amount (USDC)</span>
                <span className="font-medium">{amount}</span>
              </div>
              <input
                type="range"
                min={50}
                max={1200}
                step={10}
                value={amount}
                onChange={(event) => setAmount(Number(event.target.value))}
                className="w-full accent-[#6f7dff]"
              />
            </label>

            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-xl border border-border bg-card p-3">
                <p className="text-xs text-muted">Estimated Fee</p>
                <p className="font-semibold">${quote.fee}</p>
              </div>
              <div className="rounded-xl border border-border bg-card p-3">
                <p className="text-xs text-muted">Recipient Gets</p>
                <p className="font-semibold text-accent-2">${quote.receive}</p>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card p-3">
              <p className="text-muted">Route</p>
              <p className="font-medium">Ethereum USDC -&gt; Solana USDC</p>
              <p className="text-xs text-muted">Estimated Settlement: {quote.eta}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        <article className="rounded-2xl border border-border bg-card p-5">
          <h3 className="text-lg font-semibold">Pay Anyone</h3>
          <p className="mt-2 text-sm text-muted">
            Send to phone number, username, or Solana wallet address.
          </p>
        </article>
        <article className="rounded-2xl border border-border bg-card p-5">
          <h3 className="text-lg font-semibold">Magic Claim Links</h3>
          <p className="mt-2 text-sm text-muted">
            Recipients onboard once and claim directly into their wallet.
          </p>
        </article>
        <article className="rounded-2xl border border-border bg-card p-5">
          <h3 className="text-lg font-semibold">AI Agent</h3>
          <p className="mt-2 text-sm text-muted">
            Get smart routing, fee insights, and transfer safety checks.
          </p>
        </article>
      </section>

      <section className="mt-6 rounded-2xl border border-border bg-card p-5 sm:p-6">
        <h2 className="text-2xl font-semibold">How CrossPay Works</h2>
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
          <article className="rounded-xl border border-border bg-card-soft p-4">
            <p className="text-xs uppercase tracking-widest text-muted">Step 1</p>
            <h3 className="mt-1 font-semibold">Choose Sender Chain</h3>
            <p className="mt-2 text-sm text-muted">
              Connect wallet, choose token and amount from any supported chain.
            </p>
          </article>
          <article className="rounded-xl border border-border bg-card-soft p-4">
            <p className="text-xs uppercase tracking-widest text-muted">Step 2</p>
            <h3 className="mt-1 font-semibold">Pay Anyone Identity</h3>
            <p className="mt-2 text-sm text-muted">
              Enter recipient by `@username`, phone number, or Solana address.
            </p>
          </article>
          <article className="rounded-xl border border-border bg-card-soft p-4">
            <p className="text-xs uppercase tracking-widest text-muted">Step 3</p>
            <h3 className="mt-1 font-semibold">Claim on Solana</h3>
            <p className="mt-2 text-sm text-muted">
              Recipient gets a claim link and receives funds in their Solana wallet.
            </p>
          </article>
        </div>
      </section>

      <section className="mt-6 rounded-2xl border border-border bg-card p-5 sm:p-6">
        <h2 className="text-2xl font-semibold">Frequently Asked Questions</h2>
        <div className="mt-4 space-y-3">
          {faqs.map((item, index) => (
            <article key={item.q} className="rounded-xl border border-border bg-card-soft">
              <button
                type="button"
                onClick={() => setOpenFaq(openFaq === index ? -1 : index)}
                className="flex w-full items-center justify-between px-4 py-3 text-left"
              >
                <span className="font-medium">{item.q}</span>
                <span className="text-muted">{openFaq === index ? "-" : "+"}</span>
              </button>
              {openFaq === index && (
                <p className="px-4 pb-4 text-sm text-muted">{item.a}</p>
              )}
            </article>
          ))}
        </div>
      </section>

      <section className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <article className="rounded-2xl border border-border bg-card p-5">
          <p className="text-xs uppercase tracking-wider text-muted">For Freelancers</p>
          <h3 className="mt-1 text-lg font-semibold">Get paid globally, settle on Solana</h3>
          <p className="mt-2 text-sm text-muted">
            Receive international client payments through simple claim links without
            managing complex bridge steps.
          </p>
        </article>
        <article className="rounded-2xl border border-border bg-card p-5">
          <p className="text-xs uppercase tracking-wider text-muted">For Teams & DAOs</p>
          <h3 className="mt-1 text-lg font-semibold">Cross-chain payroll and reimbursements</h3>
          <p className="mt-2 text-sm text-muted">
            Send from treasury wallets on any supported chain to contributors on Solana
            using usernames and phone identifiers.
          </p>
        </article>
        <article className="rounded-2xl border border-border bg-card p-5">
          <p className="text-xs uppercase tracking-wider text-muted">For New Users</p>
          <h3 className="mt-1 text-lg font-semibold">No wallet complexity at first touch</h3>
          <p className="mt-2 text-sm text-muted">
            Share a beautiful claim page, let recipients onboard once, and complete the
            payout in a few guided steps.
          </p>
        </article>
      </section>

      <section className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="text-xs uppercase tracking-wider text-muted">Chains Supported</p>
          <p className="mt-1 text-2xl font-semibold">20+</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="text-xs uppercase tracking-wider text-muted">Avg Settlement</p>
          <p className="mt-1 text-2xl font-semibold">45s</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="text-xs uppercase tracking-wider text-muted">Transfer Success</p>
          <p className="mt-1 text-2xl font-semibold">99.2%</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="text-xs uppercase tracking-wider text-muted">Route Options</p>
          <p className="mt-1 text-2xl font-semibold">Real-time</p>
        </div>
      </section>

      <section className="mt-6 rounded-3xl border border-border bg-gradient-to-r from-[#121a31] to-[#102b2a] p-6 sm:p-8">
        <h2 className="text-3xl font-semibold tracking-tight">Start your first cross-chain payment in under a minute</h2>
        <p className="mt-3 max-w-3xl text-sm text-muted sm:text-base">
          CrossPay combines LI.FI route intelligence, seamless recipient identity, and
          Solana settlement into one user-friendly flow built for real-world global
          payments.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link
            href="/send"
            className="rounded-xl bg-gradient-to-r from-accent to-[#8f6eff] px-5 py-3 text-sm font-semibold text-white transition hover:brightness-110"
          >
            Launch Payment Flow
          </Link>
          <Link
            href="/ai-agent"
            className="rounded-xl border border-white/40 bg-white/5 px-5 py-3 text-sm font-medium text-white transition hover:bg-white/15"
          >
            Try AI Agent
          </Link>
        </div>
      </section>

      <footer className="mt-8 rounded-2xl border border-border bg-card p-6">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
          <div className="md:col-span-2">
            <p className="text-xs uppercase tracking-[0.2em] text-muted">CrossPay</p>
            <p className="mt-2 max-w-xl text-sm text-muted">
              Instant global payments from any chain to Solana. Pay anyone with wallet,
              username, or phone number.
            </p>
          </div>
          <div>
            <p className="text-sm font-semibold">Product</p>
            <ul className="mt-2 space-y-2 text-sm text-muted">
              <li>
                <Link href="/send" className="hover:text-white">
                  Send Payment
                </Link>
              </li>
              <li>
                <Link href="/claim" className="hover:text-white">
                  Claim Funds
                </Link>
              </li>
              <li>
                <Link href="/history" className="hover:text-white">
                  Transaction History
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <p className="text-sm font-semibold">Resources</p>
            <ul className="mt-2 space-y-2 text-sm text-muted">
              <li>
                <Link href="/ai-agent" className="hover:text-white">
                  AI Agent
                </Link>
              </li>
              <li>
                <a href="#" className="hover:text-white">
                  Security
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white">
                  Contact
                </a>
              </li>
            </ul>
          </div>
        </div>
        <div className="mt-6 border-t border-border pt-4 text-xs text-muted">
          <p>© {new Date().getFullYear()} CrossPay. Built for global, borderless payments.</p>
        </div>
      </footer>
    </div>
  );
}
