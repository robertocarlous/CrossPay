use anchor_lang::prelude::*;

/// Fired when a USDC payment is placed into escrow.
#[event]
pub struct PaymentCreated {
    pub payment_id: u64,
    pub sender: Pubkey,
    /// Known wallet for Address/Username; Pubkey::default() for Identifier payments.
    pub recipient: Pubkey,
    /// SHA-256 of email, phone, or username — the on-chain claim key.
    pub recipient_identifier: [u8; 32],
    /// Raw USDC units (1 USDC = 1_000_000).
    pub amount: u64,
    pub token_mint: Pubkey,
    pub expires_at: i64,
}

/// Fired when a recipient successfully claims an escrowed payment.
#[event]
pub struct PaymentClaimed {
    pub payment_id: u64,
    pub claimer: Pubkey,
    /// Raw USDC units.
    pub amount: u64,
}

/// Fired when the original sender cancels and reclaims their payment.
#[event]
pub struct PaymentCancelled {
    pub payment_id: u64,
    pub sender: Pubkey,
    /// Raw USDC units.
    pub amount: u64,
}

/// Fired when a user registers a profile (username + optional identifier hash).
#[event]
pub struct UserRegistered {
    pub owner: Pubkey,
    pub username: String,
    pub has_identifier: bool,
}

/// Fired when a user adds or updates their email / phone identifier hash.
#[event]
pub struct UserIdentifierUpdated {
    pub owner: Pubkey,
}
