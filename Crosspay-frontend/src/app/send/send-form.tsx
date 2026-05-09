'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useAccount, useConnect, useDisconnect } from 'wagmi'
import { injected, coinbaseWallet } from 'wagmi/connectors'
import { getRoutes, executeRoute, isSVMAddress } from '@lifi/sdk'
import type { Route, LiFiStepExtended } from '@lifi/sdk'
import { parseUnits, formatUnits } from 'viem'
import { mainnet, arbitrum, optimism, base, polygon } from 'wagmi/chains'

// ── constants ─────────────────────────────────────────────────────────────────

const FROM_CHAINS = [
  { id: base.id, name: 'Base' },
  { id: arbitrum.id, name: 'Arbitrum' },
  { id: optimism.id, name: 'Optimism' },
  { id: polygon.id, name: 'Polygon' },
  { id: mainnet.id, name: 'Ethereum' },
]

// USDC contract address per chain (6 decimals)
const USDC_BY_CHAIN: Record<number, string> = {
  [base.id]:     '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
  [arbitrum.id]: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
  [optimism.id]: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
  [polygon.id]:  '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
  [mainnet.id]:  '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
}

const USDC_SOLANA = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'
// LiFi's internal chain ID for Solana
const SOL_CHAIN_ID = 1151111081099710

// ── types ─────────────────────────────────────────────────────────────────────

type TxStatus = 'idle' | 'executing' | 'bridging' | 'done' | 'error'
type SupportedChainId = typeof mainnet.id | typeof arbitrum.id | typeof optimism.id | typeof base.id | typeof polygon.id

interface LiveQuote {
  route: Route
  toAmount: string
  feeUsd: string
  durationSec: number
  bridgeName: string
  fromChainName: string
}

// ── helpers ───────────────────────────────────────────────────────────────────

function shortAddr(a: string) {
  return `${a.slice(0, 6)}…${a.slice(-4)}`
}

function stepLabel(step: LiFiStepExtended): string {
  const status = step.execution?.status
  if (status === 'ACTION_REQUIRED') return 'Sign the transaction in your wallet…'
  if (status === 'PENDING') return `Bridging via ${step.toolDetails?.name ?? step.tool}…`
  return ''
}

// ── component ─────────────────────────────────────────────────────────────────

export function SendForm() {
  const { address, isConnected } = useAccount()
  const { connect } = useConnect()
  const { disconnect } = useDisconnect()

  const [fromChainId, setFromChainId] = useState<SupportedChainId>(base.id)
  const [recipient, setRecipient] = useState('')
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')

  const [quote, setQuote] = useState<LiveQuote | null>(null)
  const [quoteLoading, setQuoteLoading] = useState(false)
  const [quoteError, setQuoteError] = useState<string | null>(null)

  const [txStatus, setTxStatus] = useState<TxStatus>('idle')
  const [txStep, setTxStep] = useState('')
  const [txError, setTxError] = useState<string | null>(null)

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const fetchQuote = useCallback(async () => {
    if (!amount || !recipient || !address || parseFloat(amount) <= 0) {
      setQuote(null)
      setQuoteError(null)
      return
    }
    if (!isSVMAddress(recipient)) {
      setQuote(null)
      setQuoteError(null)
      return
    }

    setQuoteLoading(true)
    setQuoteError(null)

    try {
      const fromAmount = parseUnits(amount, 6).toString() // USDC = 6 decimals

      const { routes } = await getRoutes({
        fromChainId,
        toChainId: SOL_CHAIN_ID,
        fromTokenAddress: USDC_BY_CHAIN[fromChainId],
        toTokenAddress: USDC_SOLANA,
        fromAmount,
        fromAddress: address,
        toAddress: recipient,
      })

      if (!routes.length) {
        setQuoteError('No routes available for this transfer.')
        setQuote(null)
        return
      }

      const best = routes[0]
      const toAmount = parseFloat(formatUnits(BigInt(best.toAmountMin), 6)).toFixed(2)
      const durationSec = best.steps.reduce((acc, s) => acc + s.estimate.executionDuration, 0)

      const gasCost = parseFloat(best.gasCostUSD ?? '0')
      const bridgeFees = best.steps.reduce(
        (acc, s) => acc + (s.estimate.feeCosts ?? []).reduce((a, f) => a + parseFloat(f.amountUSD ?? '0'), 0),
        0,
      )
      const feeUsd = `$${(gasCost + bridgeFees).toFixed(2)}`

      const bridgeName = best.steps.map(s => s.toolDetails?.name ?? s.tool).join(' + ')
      const fromChainName = FROM_CHAINS.find(c => c.id === fromChainId)?.name ?? ''

      setQuote({ route: best, toAmount, feeUsd, durationSec, bridgeName, fromChainName })
    } catch (err) {
      setQuoteError(err instanceof Error ? err.message : 'Failed to fetch route.')
      setQuote(null)
    } finally {
      setQuoteLoading(false)
    }
  }, [amount, recipient, address, fromChainId])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(fetchQuote, 600)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [fetchQuote])

  const handleSend = async () => {
    if (!quote || !isConnected) return
    setTxStatus('executing')
    setTxError(null)
    setTxStep('Waiting for wallet confirmation…')

    try {
      await executeRoute(quote.route, {
        updateRouteHook: (updatedRoute) => {
          for (const step of updatedRoute.steps) {
            const label = stepLabel(step)
            if (label) {
              setTxStep(label)
              if (step.execution?.status === 'PENDING') setTxStatus('bridging')
            }
          }
        },
      })
      setTxStatus('done')
    } catch (err) {
      setTxStatus('error')
      setTxError(err instanceof Error ? err.message : 'Transaction failed.')
    }
  }

  const reset = () => {
    setTxStatus('idle')
    setTxStep('')
    setTxError(null)
    setAmount('')
    setRecipient('')
    setNote('')
    setQuote(null)
  }

  // ── success screen ────────────────────────────────────────────────────────

  if (txStatus === 'done') {
    return (
      <section className="rounded-2xl border border-border bg-card p-8 text-center shadow-[0_22px_70px_rgba(0,0,0,0.2)]">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-accent-2/20 text-3xl text-accent-2">
          ✓
        </div>
        <h2 className="text-2xl font-bold text-accent-2">Payment Sent!</h2>
        <p className="mt-2 text-sm text-muted">
          {quote?.toAmount} USDC is on its way to Solana.
        </p>
        {quote && (
          <p className="mt-1 text-xs text-muted">
            via {quote.bridgeName} · est. {quote.durationSec}s
          </p>
        )}
        <button
          onClick={reset}
          className="mt-6 rounded-xl bg-gradient-to-r from-accent to-[#9c67ff] px-6 py-3 text-sm font-semibold text-white transition hover:brightness-110"
        >
          Send Another Payment
        </button>
      </section>
    )
  }

  const isBusy = txStatus === 'executing' || txStatus === 'bridging'
  const canSend = isConnected && !!quote && !isBusy

  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-[0_22px_70px_rgba(0,0,0,0.2)] sm:p-6">
      {/* header */}
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-xl font-semibold">Send Payment</h2>
        <span className="rounded-full border border-border bg-card-soft px-3 py-1 text-xs text-muted">
          USDC → Solana
        </span>
      </div>

      {/* wallet connect */}
      {!isConnected ? (
        <div className="mb-5 rounded-xl border border-border bg-card-soft p-4">
          <p className="mb-3 text-sm text-muted">Connect your EVM wallet to send</p>
          <div className="flex gap-2">
            <button
              onClick={() => connect({ connector: injected() })}
              className="flex-1 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-medium transition hover:border-accent/50 hover:text-white"
            >
              MetaMask
            </button>
            <button
              onClick={() => connect({ connector: coinbaseWallet({ appName: 'CrossPay' }) })}
              className="flex-1 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-medium transition hover:border-accent/50 hover:text-white"
            >
              Coinbase Wallet
            </button>
          </div>
        </div>
      ) : (
        <div className="mb-5 flex items-center justify-between rounded-xl border border-border bg-card-soft px-4 py-2.5">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-accent-2" />
            <span className="text-sm font-medium">{shortAddr(address!)}</span>
            <span className="text-xs text-muted">
              · {FROM_CHAINS.find(c => c.id === fromChainId)?.name}
            </span>
          </div>
          <button
            onClick={() => disconnect()}
            className="text-xs text-muted transition hover:text-white"
          >
            Disconnect
          </button>
        </div>
      )}

      {/* form fields */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="space-y-2 sm:col-span-2">
          <span className="text-sm text-muted">From Chain</span>
          <select
            value={fromChainId}
            onChange={(e) => setFromChainId(Number(e.target.value) as SupportedChainId)}
            disabled={isBusy}
            className="w-full rounded-xl border border-border bg-card-soft px-4 py-3 text-sm outline-none ring-accent transition focus:ring-2 disabled:opacity-50"
          >
            {FROM_CHAINS.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </label>

        <label className="space-y-2 sm:col-span-2">
          <span className="text-sm text-muted">Recipient (Solana address)</span>
          <input
            value={recipient}
            onChange={(e) => setRecipient(e.target.value.trim())}
            disabled={isBusy}
            className="w-full rounded-xl border border-border bg-card-soft px-4 py-3 text-sm outline-none ring-accent transition focus:ring-2 disabled:opacity-50"
            placeholder="e.g. 7YpKGvnWBb3…"
          />
        </label>

        <label className="space-y-2 sm:col-span-2">
          <span className="text-sm text-muted">Amount (USDC)</span>
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            disabled={isBusy}
            className="w-full rounded-xl border border-border bg-card-soft px-4 py-3 text-sm outline-none ring-accent transition focus:ring-2 disabled:opacity-50"
            placeholder="0.00"
            type="number"
            min="0"
            step="any"
          />
        </label>

        <label className="space-y-2 sm:col-span-2">
          <span className="text-sm text-muted">Note (optional)</span>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            disabled={isBusy}
            className="min-h-20 w-full rounded-xl border border-border bg-card-soft px-4 py-3 text-sm outline-none ring-accent transition focus:ring-2 disabled:opacity-50"
            placeholder="Payment for design sprint"
          />
        </label>
      </div>

      {/* route preview */}
      <div className="mt-5 rounded-xl border border-border bg-card-soft p-4">
        <p className="mb-3 text-sm font-medium">Route Preview</p>

        {quoteLoading && (
          <p className="animate-pulse text-sm text-muted">Fetching best route…</p>
        )}
        {quoteError && !quoteLoading && (
          <p className="text-sm text-red-400">{quoteError}</p>
        )}
        {quote && !quoteLoading && (
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted">Route</span>
              <span>{quote.fromChainName} → Solana via {quote.bridgeName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">You receive (min)</span>
              <span className="font-semibold text-accent-2">{quote.toAmount} USDC</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Est. fees</span>
              <span>{quote.feeUsd}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">ETA</span>
              <span>~{quote.durationSec}s</span>
            </div>
          </div>
        )}
        {!quote && !quoteLoading && !quoteError && (
          <p className="text-sm text-muted">
            {isConnected
              ? 'Enter a Solana address and amount to see a live route.'
              : 'Connect your wallet to see live routes.'}
          </p>
        )}
      </div>

      {/* tx progress */}
      {isBusy && (
        <div className="mt-4 flex items-center gap-3 rounded-xl border border-accent/30 bg-accent/10 px-4 py-3">
          <span className="h-2 w-2 animate-pulse rounded-full bg-accent" />
          <span className="text-sm">{txStep}</span>
        </div>
      )}

      {/* tx error */}
      {txStatus === 'error' && txError && (
        <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3">
          <p className="text-sm text-red-400">{txError}</p>
        </div>
      )}

      {/* actions */}
      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <button
          onClick={handleSend}
          disabled={!canSend}
          className="flex-1 rounded-xl bg-gradient-to-r from-accent to-[#9c67ff] px-4 py-3 text-sm font-semibold text-white shadow-[0_12px_32px_rgba(111,125,255,0.35)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isBusy ? txStep || 'Processing…' : 'Review & Send'}
        </button>
        {txStatus === 'error' && (
          <button
            onClick={reset}
            className="rounded-xl border border-border bg-card-soft px-4 py-3 text-sm font-medium text-muted transition hover:text-white"
          >
            Try Again
          </button>
        )}
      </div>
    </section>
  )
}
