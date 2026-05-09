---
name: CrossPay PRD
description: Full product requirements for CrossPay MVP v1.0 hackathon build
type: project
---

CrossPay is a cross-chain payment app (hackathon: Best cross-chain apps on Solana using @lifiprotocol).

**Why:** Hackathon MVP in 48 hours. Goal is polished demo + real Lifi+Solana integration.

**How to apply:** Prioritize Must/High features first. Keep UX consumer-friendly (Venmo-like).

## Core Flows
1. **Send:** Connect EVM/Solana wallet → enter amount+token → enter recipient (phone/username/address) → review Lifi route+fees → confirm tx → success screen + shareable receipt link
2. **Claim:** Receive SMS/email/link → open claim page → phone verify or social login → connect Solana wallet → receive funds + confetti
3. **History:** Sender & receiver see tx history with status

## Feature Priority
| Feature | Priority |
|---|---|
| Lifi cross-chain routing | Must |
| Pay with Solana address | Must |
| Pay with @username | Must |
| Simple escrow on Solana | Must |
| Pay with phone number | High |
| Magic claim link | High |
| Transaction status tracker | High |
| Social login (Google/Apple) | Medium |
| Payment history | Medium |
| Split payments | Low |
