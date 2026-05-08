CrossPay AI
Conversational Cross-Chain Payment Agent

CrossPay AI is an intelligent conversational payment assistant that enables users to send crypto across chains using natural language. Instead of navigating complex wallets, bridges, and addresses, users simply chat with the AI assistant to initiate payments.

Think of it as Venmo + ChatGPT + Cross-Chain Infrastructure.

Users can type or speak commands like:

“Send 100 USDC to @simze_dev for the freelance work”

or

“Pay Similoluwa Abidoye 50 dollars on phone +234xxxxxxxx”

CrossPay AI parses the request, resolves the recipient, finds the best bridge/swap route using LI.FI, previews fees and execution details, and securely executes the transaction after confirmation.

🚀 Features
🧠 Conversational Payment Agent
Natural language payment execution
Voice and text support
Cross-chain transaction handling
Human-readable transaction flow

Example:

"Bridge 50 USDC from Ethereum to Solana and send to @simze_dev"
🌉 Cross-Chain Payments with LI.FI
Cross-chain bridging and swaps
Automatic route optimization
Fee estimation and route preview
Multi-chain support

Supported flows:

Ethereum → Solana
Base → Polygon
Arbitrum → Ethereum
Any supported LI.FI route
👤 Smart Recipient Resolution

CrossPay AI can resolve recipients using:

Username
ENS
Wallet address
Phone number
Social identity mappings

Examples:

@simze_dev
vitalik.eth
+234xxxxxxxx
0x123...
💬 AI-Powered Onboarding

New users can interact with an onboarding assistant that:

Helps create/connect wallets
Explains fees and bridge duration
Assists with payment claims
Handles FAQ support
📄 Transaction Receipts & Notifications

After successful execution:

Generates payment receipts
Sends SMS notifications
Sends email confirmations
Tracks transaction history
🌍 Multilingual Support

Planned support for:

English
Yoruba
Hindi
French
Swahili
🏗️ Architecture
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
⚡ Core AI Workflow

The AI agent converts natural language into structured payment intents.

Example:

Input:

"Send 100 USDC to @simze_dev on Base"

Parsed Intent:

{
  "action": "send",
  "amount": 100,
  "token": "USDC",
  "recipient": "@simze_dev",
  "destinationChain": "Base",
  "note": "Payment"
}

The intent is then routed through:

Recipient resolution
LI.FI quote generation
Swap/bridge execution
Wallet confirmation flow
🔐 Security Model

CrossPay AI never blindly signs transactions.

Security Principles
User confirmation required before execution
AI only suggests and prepares transactions
Rate limiting for suspicious activity
Escrow remains source of truth
Human review for large transfers
🛠️ Tech Stack
Frontend
Next.js
TailwindCSS
shadcn/ui
Wagmi
viem
AI Layer
Vercel AI SDK
Groq / OpenAI
LangGraph / LangChain
Blockchain
LI.FI SDK
Solana web3.js
EVM chains
Smart wallets / Account abstraction
Notifications
Twilio
Resend
📦 Installation
Clone Repository
git clone <repo-url>
cd crosspay-ai
Install Dependencies
npm install
Setup Environment Variables

Create a .env.local file:

OPENAI_API_KEY=
GROQ_API_KEY=
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=
LIFI_API_KEY=
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
RESEND_API_KEY=
▶️ Running the Project
npm run dev

App runs on:

http://localhost:3000
🧩 AI Agent Prompt
You are CrossPay AI, a helpful crypto payment assistant.

Help users send money across chains using LI.FI.

Always ask for confirmation before executing.

Parse natural language into structured payment intents.

Available tools:
- getLifiQuote
- resolveRecipient
- executeBridge
- sendReceipt
- notifyRecipient
🔧 Available Agent Tools
Tool	Description
resolveRecipient()	Resolves usernames, ENS, or phone numbers
getLifiQuote()	Fetches optimal bridge/swap route
executeBridge()	Executes cross-chain transaction
sendReceipt()	Generates payment receipt
notifyRecipient()	Sends SMS/email notification
🎯 Hackathon Demo Flow
Demo Scenario
User opens chat interface
Types:
"Send 50 USDC to @simze_dev on Solana"
AI:
Parses intent
Resolves recipient
Generates LI.FI route
Displays gas + fees
Requests confirmation
User confirms
CrossPay executes:
Bridge
Swap
Payment
Recipient receives:
Funds
Notification
Receipt
🌟 Why CrossPay AI Matters

Crypto payments remain too complex for mainstream users.

CrossPay AI removes:

Chain confusion
Wallet friction
Address complexity
Bridge UX pain

By combining:

AI
Cross-chain infrastructure
Conversational UX

CrossPay AI becomes:

The smartest way to send money on crypto.

🗺️ Future Roadmap
Voice-powered payments
WhatsApp payment assistant
Telegram mini app
AI recurring payments
Smart payment reminders
Social graph payments
Autonomous payment agents
Fraud detection engine
🤝 Contributors

Built for hackathons, builders, and the future of conversational crypto payments.

📜 License

MIT License