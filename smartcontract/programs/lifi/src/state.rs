use anchor_lang::prelude::*;

use crate::constants::{MAX_NOTE_LEN, MAX_USERNAME_LEN};

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq)]
pub enum RecipientType {
    /// Direct Solana wallet address — recipient is known
    Address,
    /// @username — resolved to pubkey by the client before calling
    Username,
    /// Email or phone hash — recipient claims after backend identity verification
    Identifier,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Debug)]
pub enum PaymentStatus {
    Pending,
    Claimed,
    Cancelled,
}

// ---------------------------------------------------------------------------
// Accounts
// ---------------------------------------------------------------------------

/// Singleton program config.  PDA: [SEED_STATE]
#[account]
pub struct ProgramState {
    pub admin: Pubkey,
    /// The only token mint this program will accept (set to USDC at deploy).
    pub accepted_mint: Pubkey,
    /// Monotonic counter used to derive unique escrow PDAs.
    pub payment_count: u64,
    pub bump: u8,
}

impl ProgramState {
    // 8 + 32 + 32 + 8 + 1
    pub const LEN: usize = 8 + 32 + 32 + 8 + 1;
}

/// Per-user profile.  PDA: [SEED_USER, owner]
#[account]
pub struct UserProfile {
    pub owner: Pubkey,
    /// Unique handle (max MAX_USERNAME_LEN chars, lower-case enforced client-side)
    pub username: String,
    /// SHA-256(email OR phone — backend decides which to verify).  [0u8;32] when not set.
    pub identifier_hash: [u8; 32],
    pub has_identifier: bool,
    pub created_at: i64,
    pub bump: u8,
}

impl UserProfile {
    // 8 + 32 + (4 + MAX_USERNAME_LEN) + 32 + 1 + 8 + 1
    pub const LEN: usize = 8 + 32 + (4 + MAX_USERNAME_LEN) + 32 + 1 + 8 + 1;
}

/// Reverse-lookup index: username → owner.  PDA: [SEED_USERNAME, username.as_bytes()]
#[account]
pub struct UsernameIndex {
    pub owner: Pubkey,
    pub bump: u8,
}

impl UsernameIndex {
    // 8 + 32 + 1
    pub const LEN: usize = 8 + 32 + 1;
}

/// Escrow record for a single USDC payment.  PDA: [SEED_ESCROW, payment_id.to_le_bytes()]
/// Tokens sit in an ATA owned by this account until claimed or cancelled.
#[account]
pub struct EscrowPayment {
    pub payment_id: u64,
    pub sender: Pubkey,
    /// Known wallet for Address / Username payments.
    /// Pubkey::default() for Identifier payments (resolved at claim time).
    pub recipient: Pubkey,
    /// For Address:    recipient pubkey bytes
    /// For Username:   SHA-256(username)
    /// For Identifier: SHA-256(email or phone)
    pub recipient_identifier: [u8; 32],
    pub recipient_type: RecipientType,
    /// Raw token units (USDC has 6 decimals: 1 USDC = 1_000_000)
    pub amount: u64,
    /// The accepted mint at the time of payment (always program_state.accepted_mint)
    pub token_mint: Pubkey,
    pub status: PaymentStatus,
    pub created_at: i64,
    pub expires_at: i64,
    pub note: String,
    pub bump: u8,
}

impl EscrowPayment {
    // 8 + 8 + 32 + 32 + 32 + 1 + 8 + 32 + 1 + 8 + 8 + (4 + MAX_NOTE_LEN) + 1
    pub const LEN: usize =
        8 + 8 + 32 + 32 + 32 + 1 + 8 + 32 + 1 + 8 + 8 + (4 + MAX_NOTE_LEN) + 1;
}

/// Tiny index record so recipients can find payments sent to them.
/// PDA: [SEED_LINK, recipient_identifier (32 bytes), payment_id.to_le_bytes()]
///
/// Created when a payment is sent; closed (rent → sender) on claim or cancel.
/// Client query: getProgramAccounts filtering data[8..40] == my_identifier_hash.
#[account]
pub struct PaymentLink {
    /// Copy of EscrowPayment.recipient_identifier for memcmp filtering.
    pub recipient_identifier: [u8; 32],
    pub payment_id: u64,
    pub bump: u8,
}

impl PaymentLink {
    // 8 + 32 + 8 + 1
    pub const LEN: usize = 8 + 32 + 8 + 1;
}
