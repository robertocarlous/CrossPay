## CrossPay AI

Conversational Cross-Chain Payment Agent

CrossPay AI is an intelligent conversational payment assistant that enables users to send crypto across chains using natural language. Instead of navigating complex wallets, bridges, and addresses, users simply chat with the AI to initiate payments.
Think of it as Venmo + ChatGPT + Cross-Chain Infrastructure.
"Send 100 USDC to @simze_dev for the freelance work"
"Pay Similoluwa Abidoye 50 dollars on phone +234xxxxxxxx"
"Bridge 50 USDC from Ethereum to Solana and send to @simze_dev"
CrossPay AI parses the request, resolves the recipient, finds the best route via LI.FI, previews fees, and executes the transaction after confirmation.

## Table of Contents

Features
Architecture
Core AI Workflow
Security Model
Tech Stack
Getting Started
AI Agent
Hackathon Demo Flow
Roadmap
License


## Features
🧠 Conversational Payment Agent
Natural language and voice payment execution with human-readable transaction flows and full cross-chain support.
🌉 Cross-Chain Payments with LI.FI
Automatic route optimization, fee estimation, and multi-chain bridging and swaps.
Supported flows include:

Ethereum → Solana
Base → Polygon
Arbitrum → Ethereum
Any route supported by LI.FI

👤 Smart Recipient Resolution
Resolve recipients by username, ENS, wallet address, phone number, or social identity — for example @simze_dev, vitalik.eth, +234xxxxxxxx, or 0x123...
💬 AI-Powered Onboarding
An onboarding assistant that helps new users create or connect wallets, explains fees and bridge duration, handles payment claims, and answers FAQs.
📄 Transaction Receipts & Notifications
After successful execution: payment receipts, SMS notifications, email confirmations, and transaction history tracking.
🌍 Multilingual Support
Planned support for English, Yoruba, Hindi, French, and Swahili.

## Architecture
User Input (Voice/Text)
        ↓
AI Intent Parser
        ↓
Recipient Resolver
        ↓
LI.FI Quote Engine
        ↓
Transaction Preview
        ↓
Wallet Confirmation
        ↓
Bridge / Swap Execution
        ↓
Receipt + Notifications

## Core AI Workflow
The AI agent converts natural language into structured payment intents.
Input:
"Send 100 USDC to @simze_dev on Base"
Parsed intent:
json{
  "action": "send",
  "amount": 100,
  "token": "USDC",
  "recipient": "@simze_dev",
  "destinationChain": "Base",
  "note": "Payment"
}
The intent is then routed through recipient resolution → LI.FI quote generation → swap/bridge execution → wallet confirmation.

## Security Model
CrossPay AI never blindly signs transactions.

User confirmation is required before every execution
The AI only suggests and prepares transactions — it never acts unilaterally
Rate limiting is applied to flag suspicious activity
Escrow remains the source of truth
Large transfers are flagged for human review


## Tech Stack
LayerTechnologiesFrontendNext.js, TailwindCSS, shadcn/ui, Wagmi, viemAIVercel AI SDK, Groq / OpenAI, LangGraph / LangChainBlockchainLI.FI SDK, Solana web3.js, EVM chains, Smart wallets / Account abstractionNotificationsTwilio, Resend

## Getting Started
1. Clone the repository
bashgit clone <repo-url>
cd crosspay-ai
2. Install dependencies
bashnpm install
3. Set up environment variables
Create a .env.local file in the root:

4. Start the development server
bashnpm run dev
App runs on http://localhost:3000

## AI Agent
System Prompt
You are CrossPay AI, a helpful crypto payment assistant.
Help users send money across chains using LI.FI.
Always ask for confirmation before executing.
Parse natural language into structured payment intents.
Available Tools
ToolDescriptionresolveRecipient()Resolves usernames, ENS, or phone numbers to wallet addressesgetLifiQuote()Fetches the optimal bridge/swap routeexecuteBridge()Executes a cross-chain transactionsendReceipt()Generates a payment receiptnotifyRecipient()Sends SMS/email notification to the recipient

## Demo Flow

User opens the chat interface and types:

   "Send 50 USDC to @simze_dev on Solana"

AI parses the intent, resolves the recipient, and fetches a LI.FI route
AI displays estimated gas and fees, then requests confirmation
User confirms
CrossPay executes the bridge, swap, and payment
Recipient receives funds, a notification, and a receipt


## Roadmap

 Voice-powered payments
 WhatsApp payment assistant
 Telegram mini app
 AI recurring payments
 Smart payment reminders
 Social graph payments
 Autonomous payment agents
 Fraud detection engine


## Contributors
Built for hackathons, builders, and the future of conversational crypto payments.

## License
MIT
