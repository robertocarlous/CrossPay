'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useAccount, useConnect, useDisconnect } from 'wagmi'
import { injected, coinbaseWallet } from 'wagmi/connectors'
import { getRoutes, executeRoute, isSVMAddress } from '@lifi/sdk'
import type { Route } from '@lifi/sdk'
import { parseUnits, formatUnits } from 'viem'
import { mainnet, arbitrum, optimism, base, polygon } from 'wagmi/chains'
import { CrosspayShell } from '@/components/crosspay-shell'

// ── constants ─────────────────────────────────────────────────────────────────

const FROM_CHAINS = [
  { id: base.id, name: 'Base' },
  { id: arbitrum.id, name: 'Arbitrum' },
  { id: optimism.id, name: 'Optimism' },
  { id: polygon.id, name: 'Polygon' },
  { id: mainnet.id, name: 'Ethereum' },
]

const USDC_BY_CHAIN: Record<number, string> = {
  [base.id]: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
  [arbitrum.id]: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
  [optimism.id]: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
  [polygon.id]: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
  [mainnet.id]: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
}

const USDC_SOLANA = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'
const SOL_CHAIN_ID = 1151111081099710

const CHAIN_NAME_MAP: Record<string, number> = {
  base: base.id,
  arbitrum: arbitrum.id,
  optimism: optimism.id,
  polygon: polygon.id,
  ethereum: mainnet.id,
  eth: mainnet.id,
}

const SUGGESTIONS = [
  'Send 100 USDC from Base to EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  'Find cheapest route from Polygon to Solana for 500 USDC',
  'Send 20 USDC from Arbitrum to EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
]

// ── types ─────────────────────────────────────────────────────────────────────

interface QuoteData {
  route: Route
  toAmount: string
  feeUsd: string
  durationSec: number
  bridgeName: string
  fromChainName: string
  recipient: string
  amount: string
}

type MsgRole = 'user' | 'assistant'

interface ChatMsg {
  id: string
  role: MsgRole
  text: string
  quote?: QuoteData
  executing?: boolean
  done?: boolean
  execError?: string
}

// ── helpers ───────────────────────────────────────────────────────────────────

function shortAddr(a: string) {
  return `${a.slice(0, 6)}…${a.slice(-4)}`
}

// ── component ─────────────────────────────────────────────────────────────────

export default function AiAgentPage() {
  const { address, isConnected } = useAccount()
  const { connect } = useConnect()
  const { disconnect } = useDisconnect()

  const [msgs, setMsgs] = useState<ChatMsg[]>([
    {
      id: 'intro',
      role: 'assistant',
      text: "Hey! I can help you send USDC cross-chain. Just tell me something like \"Send 100 USDC from Base to 7xKp…\" and I'll find the best route and confirm before anything moves.",
    },
  ])

  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [defaultChain, setDefaultChain] = useState<number>(base.id)

  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [msgs])

  const addMsg = useCallback((msg: Omit<ChatMsg, 'id'>) => {
    setMsgs((prev) => [...prev, { ...msg, id: crypto.randomUUID() }])
  }, [])

  const patchLast = useCallback((patch: Partial<ChatMsg>) => {
    setMsgs((prev) => {
      const idx = [...prev].reverse().findIndex((m) => m.role === 'assistant')
      if (idx === -1) return prev
      const realIdx = prev.length - 1 - idx
      return prev.map((m, i) => (i === realIdx ? { ...m, ...patch } : m))
    })
  }, [])

  const handleSubmit = useCallback(async () => {
    const text = input.trim()
    if (!text || loading) return

    setInput('')
    inputRef.current?.focus()
    addMsg({ role: 'user', text })
    setLoading(true)

    try {
      // 1. Parse intent
      const parseRes = await fetch('/api/parse-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })

      if (!parseRes.ok) throw new Error('Parse request failed')

      const { data } = await parseRes.json()

      if (!data?.amount || !data?.recipient) {
        addMsg({
          role: 'assistant',
          text: "I couldn't make sense of that. Try something like \"Send 50 USDC from Base to 7xKp…\".",
        })
        return
      }

      if (!isSVMAddress(data.recipient)) {
        addMsg({
          role: 'assistant',
          text: `"${data.recipient}" doesn't look like a valid Solana address. Please double-check it.`,
        })
        return
      }

      if (!isConnected || !address) {
        addMsg({
          role: 'assistant',
          text: `Got it — ${data.amount} USDC to ${shortAddr(data.recipient)}. Connect your wallet so I can fetch the live route.`,
        })
        return
      }

      const chainId = data.fromChain
        ? (CHAIN_NAME_MAP[data.fromChain.toLowerCase()] ?? defaultChain)
        : defaultChain

      const fromChainName = FROM_CHAINS.find((c) => c.id === chainId)?.name ?? 'Base'

      addMsg({
        role: 'assistant',
        text: `Finding the best route for ${data.amount} USDC from ${fromChainName} to Solana…`,
      })

      // 2. Fetch LI.FI route
      const fromAmount = parseUnits(String(data.amount), 6).toString()

      const { routes } = await getRoutes({
        fromChainId: chainId,
        toChainId: SOL_CHAIN_ID,
        fromTokenAddress: USDC_BY_CHAIN[chainId],
        toTokenAddress: USDC_SOLANA,
        fromAmount,
        fromAddress: address,
        toAddress: data.recipient,
      })

      if (!routes?.length) {
        patchLast({ text: 'No routes available for this transfer. Try a different amount or source chain.' })
        return
      }

      const best = routes[0]
      const toAmount = parseFloat(formatUnits(BigInt(best.toAmountMin), 6)).toFixed(2)
      const durationSec = best.steps.reduce((acc, s) => acc + (s.estimate.executionDuration ?? 0), 0)

      const gasCost = parseFloat(best.gasCostUSD ?? '0')
      const bridgeFees = best.steps.reduce((acc, s) => {
        const fees = s.estimate.feeCosts ?? []
        return acc + fees.reduce((a, f) => a + parseFloat(f.amountUSD ?? '0'), 0)
      }, 0)

      const feeUsd = `$${(gasCost + bridgeFees).toFixed(2)}`
      const bridgeName = best.steps.map((s) => s.toolDetails?.name ?? s.tool).join(' + ')

      const quote: QuoteData = {
        route: best,
        toAmount,
        feeUsd,
        durationSec,
        bridgeName,
        fromChainName,
        recipient: data.recipient,
        amount: String(data.amount),
      }

      // 3. Get explanation from Next.js API route
      let explanation = `Route found via ${bridgeName}. You'll receive ${toAmount} USDC (fees: ${feeUsd}, ETA ~${durationSec}s). Confirm below to send.`

      try {
        const explainRes = await fetch('/api/explain-route', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            route: {
              steps: best.steps.map((s) => ({
                tool: s.tool,
                toolDetails: s.toolDetails,
                estimate: s.estimate,
              })),
              toAmountMin: best.toAmountMin,
              gasCostUSD: best.gasCostUSD,
            },
          }),
        })

        if (explainRes.ok) {
          const { explanation: exp } = await explainRes.json()
          if (exp) explanation = `${exp} Confirm below to proceed.`
        }
      } catch (e) {
        console.warn('Explanation API failed, using fallback')
      }

      patchLast({ text: explanation, quote })
    } catch (err) {
      console.error(err)
      addMsg({
        role: 'assistant',
        text: 'Something went wrong. Please try again.',
      })
    } finally {
      setLoading(false)
    }
  }, [input, loading, isConnected, address, defaultChain, addMsg, patchLast])

  const handleConfirm = useCallback(async (msgId: string, quote: QuoteData) => {
    setMsgs((prev) =>
      prev.map((m) => (m.id === msgId ? { ...m, quote: undefined, executing: true } : m))
    )

    try {
      await executeRoute(quote.route, { updateRouteHook: () => {} })

      setMsgs((prev) =>
        prev.map((m) =>
          m.id === msgId
            ? {
                ...m,
                executing: false,
                done: true,
                text: `Payment sent! ${quote.toAmount} USDC is on its way to Solana via ${quote.bridgeName}.`,
              }
            : m
        )
      )
    } catch (err) {
      setMsgs((prev) =>
        prev.map((m) =>
          m.id === msgId
            ? {
                ...m,
                executing: false,
                execError: err instanceof Error ? err.message : 'Transaction failed.',
              }
            : m
        )
      )
    }
  }, [])

  const handleCancel = useCallback((msgId: string) => {
    setMsgs((prev) =>
      prev.map((m) =>
        m.id === msgId
          ? { ...m, quote: undefined, text: 'Payment cancelled. Let me know if you want to try again.' }
          : m
      )
    )
  }, [])

  // ── render ────────────────────────────────────────────────────────────────

  return (
    <CrosspayShell
      title="CrossPay AI Agent"
      subtitle="Your co-pilot for route optimization, cost estimation, and safety checks."
    >
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.2fr_0.8fr]">

        {/* Chat Panel */}
        <section className="flex flex-col rounded-2xl border border-border bg-card p-5 sm:p-6" style={{ minHeight: '540px' }}>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold">Assistant Console</h2>
            {isConnected ? (
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-accent-2" />
                <span className="text-xs text-muted">{shortAddr(address!)}</span>
                <button
                  onClick={() => disconnect()}
                  className="text-xs text-muted transition hover:text-white"
                >
                  Disconnect
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={() => connect({ connector: injected() })}
                  className="rounded-lg border border-border bg-card-soft px-3 py-1.5 text-xs font-medium transition hover:border-accent/50 hover:text-white"
                >
                  MetaMask
                </button>
                <button
                  onClick={() => connect({ connector: coinbaseWallet({ appName: 'CrossPay' }) })}
                  className="rounded-lg border border-border bg-card-soft px-3 py-1.5 text-xs font-medium transition hover:border-accent/50 hover:text-white"
                >
                  Coinbase
                </button>
              </div>
            )}
          </div>

          {/* Messages */}
          <div className="flex-1 space-y-3 overflow-y-auto pr-1">
            {msgs.map((msg) => (
              <div key={msg.id} className={msg.role === 'user' ? 'flex justify-end' : ''}>
                <div
                  className={
                    msg.role === 'user'
                      ? 'ml-auto max-w-[85%] rounded-2xl rounded-br-md bg-accent px-4 py-3 text-sm text-white'
                      : 'max-w-[85%] rounded-2xl rounded-bl-md border border-border bg-card-soft px-4 py-3 text-sm'
                  }
                >
                  {msg.executing ? (
                    <span className="flex items-center gap-2 text-muted">
                      <span className="h-2 w-2 animate-pulse rounded-full bg-accent" />
                      Executing… check your wallet.
                    </span>
                  ) : msg.done ? (
                    <span className="text-accent-2">{msg.text}</span>
                  ) : (
                    msg.text
                  )}

                  {msg.execError && <p className="mt-2 text-xs text-red-400">{msg.execError}</p>}

                  {msg.quote && !msg.executing && (
                    <div className="mt-3 rounded-xl border border-border bg-card p-3 space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted">You send</span>
                        <span>{msg.quote.amount} USDC ({msg.quote.fromChainName})</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-muted">Recipient gets</span>
                        <span className="font-semibold text-accent-2">{msg.quote.toAmount} USDC (Solana)</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-muted">Fees</span>
                        <span>{msg.quote.feeUsd}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-muted">ETA</span>
                        <span>~{msg.quote.durationSec}s</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-muted">Bridge</span>
                        <span>{msg.quote.bridgeName}</span>
                      </div>

                      <div className="mt-3 flex gap-2">
                        <button
                          onClick={() => handleConfirm(msg.id, msg.quote!)}
                          className="flex-1 rounded-lg bg-gradient-to-r from-accent to-[#9c67ff] px-3 py-2 text-xs font-semibold text-white transition hover:brightness-110"
                        >
                          Confirm & Send
                        </button>
                        <button
                          onClick={() => handleCancel(msg.id)}
                          className="rounded-lg border border-border bg-card-soft px-3 py-2 text-xs text-muted transition hover:text-white"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="max-w-[85%] rounded-2xl rounded-bl-md border border-border bg-card-soft px-4 py-3">
                <span className="flex items-center gap-1.5">
                  {[0, 150, 300].map((d) => (
                    <span
                      key={d}
                      className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted"
                      style={{ animationDelay: `${d}ms` }}
                    />
                  ))}
                </span>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="mt-4 flex gap-2">
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSubmit()
                }
              }}
              disabled={loading}
              className="w-full rounded-xl border border-border bg-card-soft px-4 py-3 text-sm outline-none ring-accent transition focus:ring-2 disabled:opacity-50"
              placeholder="e.g. Send 50 USDC from Base to 7xKp…"
            />
            <button
              onClick={handleSubmit}
              disabled={loading || !input.trim()}
              className="rounded-xl bg-gradient-to-r from-accent to-[#9c67ff] px-5 py-3 text-sm font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Send
            </button>
          </div>
        </section>

        {/* Sidebar */}
        <aside className="space-y-5">
          <section className="rounded-2xl border border-border bg-card p-5">
            <h3 className="text-lg font-semibold">Default Chain</h3>
            <p className="mt-1 text-xs text-muted">Used when you don&apos;t specify &quot;from X&quot;</p>
            <select
              value={defaultChain}
              onChange={(e) => setDefaultChain(Number(e.target.value))}
              className="mt-3 w-full rounded-xl border border-border bg-card-soft px-3 py-2.5 text-sm outline-none ring-accent transition focus:ring-2"
            >
              {FROM_CHAINS.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </section>

          <section className="rounded-2xl border border-border bg-card p-5">
            <h3 className="text-lg font-semibold">Try a prompt</h3>
            <ul className="mt-3 space-y-3">
              {SUGGESTIONS.map((s) => (
                <li key={s}>
                  <button
                    onClick={() => {
                      setInput(s)
                      inputRef.current?.focus()
                    }}
                    className="w-full rounded-xl border border-border bg-card-soft px-3 py-2.5 text-left text-sm text-muted transition hover:text-white"
                    type="button"
                  >
                    {s}
                  </button>
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-2xl border border-border bg-card p-5">
            <h3 className="text-lg font-semibold">Agent Tools</h3>
            <div className="mt-3 space-y-3 text-sm">
              <div className="rounded-xl border border-border bg-card-soft p-3">
                <p className="font-medium">Intent Parser</p>
                <p className="text-muted">Extracts amount, recipient, and chain from plain English.</p>
              </div>
              <div className="rounded-xl border border-border bg-card-soft p-3">
                <p className="font-medium">Route Explainer</p>
                <p className="text-muted">Translates LI.FI bridge paths into plain language.</p>
              </div>
            </div>
          </section>
        </aside>
      </div>
    </CrosspayShell>
  )
}