# CrossPay

**Instant cross-chain payments from any EVM chain to Solana.**

Live Demo → [https://crosspay-inky.vercel.app/](https://crosspay-inky.vercel.app/)

---

### What is CrossPay?

CrossPay is a simple and fast way to send USDC from Ethereum, Base, Arbitrum, Optimism, Polygon, or any other EVM chain directly to Solana.

The main goal is to make cross-chain payments feel as easy as sending money on Venmo or Cash App. Instead of dealing with complicated bridges and long addresses, you can just tell the app what you want to do in plain English.

This project was built in **48 hours** during a hackathon focused on the best cross-chain experiences using **LI.FI Protocol**.

---

### Key Features

- Send USDC from multiple EVM chains to Solana
- AI Agent that understands natural language (e.g. “Send 50 USDC from Base to ...”)
- Real-time route checking with fees and estimated arrival time
- Powered by LI.FI for best routing and liquidity
- Clean, modern, and mobile-friendly interface
- Wallet connection with MetaMask and Coinbase Wallet

---

### How to Use

1. Visit [crosspay-inky.vercel.app](https://crosspay-inky.vercel.app/)
2. Connect your wallet (MetaMask or Coinbase)
3. Manually send from the send page
4. Use the AI chat box and type a message like:
   - `Send 100 USDC from Base to 9ckS1iKToCyrYSUSVwLqTur3HtME2sFnWnPww1ZQASNf`
   - `Send 25 USDC to EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v`
5. Review the best route shown (amount received, fees, bridge used)
6. Click **Confirm & Send**
7. Approve the transaction in your wallet

---

### Why We Built CrossPay

Crypto payments across different blockchains are still too complicated for normal people. Our aim was to build something closer to real-world payment apps while using powerful blockchain infrastructure (LI.FI + Solana).

Target users include:
- Freelancers receiving international payments
- Remote teams and DAOs
- People sending money back home (e.g. Nigeria, India, etc.)
- Crypto users who want simpler cross-chain transfers

---

### Current Status (MVP)

This is a **hackathon MVP** (Minimum Viable Product). The core functionality is working:
- Sending from EVM chains to a Solana address
- Natural language parsing
- LI.FI route finding and execution
- Cross-chain USDC transfer to Solana

**Still in progress / planned for future:**
- Phone number support + SMS notifications
- Username system (@username)
- Magic claim links for receivers
- Escrow mechanism on Solana
- Transaction history page
- Split payments

---

### Tech Stack

- **Framework**: Next.js 16 (App Router) + TypeScript
- **Styling**: Tailwind CSS
- **Web3**: Wagmi, Viem, LI.FI SDK
- **AI Agent**: Custom parser with Next.js API routes
- **Deployment**: Vercel

---

### Running Locally

```bash
# Clone the repo
git clone [[https://github.com/robertocarlous/crosspay]]

# Go into the folder
cd crosspay-frontend

# Install dependencies
npm install

# Run the development server
npm run dev
