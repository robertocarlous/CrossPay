'use client'

import '@rainbow-me/rainbowkit/styles.css'
import { useEffect } from 'react'
import { RainbowKitProvider, darkTheme } from '@rainbow-me/rainbowkit'
import { WagmiProvider } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createConfig as createLifiConfig, EVM } from '@lifi/sdk'
import { getWalletClient, switchChain } from '@wagmi/core'
import { wagmiConfig } from '@/lib/wagmi'

const queryClient = new QueryClient()

const rainbowTheme = darkTheme({
  accentColor: '#6f7dff',
  accentColorForeground: 'white',
  borderRadius: 'large',
  fontStack: 'system',
})

let lifiConfigured = false

function LifiInitializer() {
  useEffect(() => {
    if (lifiConfigured) return
    createLifiConfig({
      integrator: 'crosspay',
      providers: [
        EVM({
          getWalletClient: () => getWalletClient(wagmiConfig),
          switchChain: async (chainId) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await switchChain(wagmiConfig, { chainId: chainId as any })
            return getWalletClient(wagmiConfig)
          },
        }),
      ],
    })
    lifiConfigured = true
  }, [])
  return null
}

export function EvmWalletProvider({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider theme={rainbowTheme}>
          <LifiInitializer />
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}
