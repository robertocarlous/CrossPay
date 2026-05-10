import { getDefaultConfig } from '@rainbow-me/rainbowkit'
import { mainnet, arbitrum, optimism, base, polygon } from 'wagmi/chains'

// Get a free projectId at https://cloud.walletconnect.com
const WALLETCONNECT_PROJECT_ID = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? 'YOUR_PROJECT_ID'

export const wagmiConfig = getDefaultConfig({
  appName: 'CrossPay',
  projectId: WALLETCONNECT_PROJECT_ID,
  chains: [base, arbitrum, optimism, polygon, mainnet],
  ssr: true,
})
