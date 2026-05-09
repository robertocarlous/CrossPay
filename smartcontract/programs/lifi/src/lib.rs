pub mod constants;
pub mod error;
pub mod events;
pub mod instructions;
pub mod state;

use anchor_lang::prelude::*;

pub use constants::*;
pub use state::*;

pub use instructions::cancel_payment;
pub use instructions::claim_payment;
pub use instructions::initialize;
pub use instructions::register_user;
pub use instructions::send_payment;

pub use instructions::{
    CancelPayment, ClaimPayment, Initialize, RegisterUser, SendPayment, UpdateIdentifierHash,
};

pub(crate) use cancel_payment::__client_accounts_cancel_payment;
pub(crate) use claim_payment::__client_accounts_claim_payment;
pub(crate) use initialize::__client_accounts_initialize;
pub(crate) use register_user::{
    __client_accounts_register_user, __client_accounts_update_identifier_hash,
};
pub(crate) use send_payment::__client_accounts_send_payment;

declare_id!("EeFVbxa8WQxZTh3G5bG4p44XMYpsZZR6FZU6GGyVAWJ1");

#[program]
pub mod lifi {
    use super::*;

    /// One-time setup. Pass the USDC mint for the target cluster:
    ///   devnet:  4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU
    ///   mainnet: EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v
    pub fn initialize(ctx: Context<Initialize>, accepted_mint: Pubkey) -> Result<()> {
        instructions::initialize::handler(ctx, accepted_mint)
    }

    /// Register a new user profile with a unique username (and optional identifier hash).
    pub fn register_user(
        ctx: Context<RegisterUser>,
        username: String,
        identifier_hash: Option<[u8; 32]>,
    ) -> Result<()> {
        instructions::register_user::handler(ctx, username, identifier_hash)
    }

    /// Attach or update an identifier hash (email / phone) on an existing profile.
    pub fn update_identifier_hash(
        ctx: Context<UpdateIdentifierHash>,
        identifier_hash: [u8; 32],
    ) -> Result<()> {
        instructions::register_user::update_identifier_hash_handler(ctx, identifier_hash)
    }

    /// Escrow USDC for a recipient (address, @username, or email/phone hash).
    pub fn send_payment(
        ctx: Context<SendPayment>,
        amount: u64,
        recipient_type: RecipientType,
        recipient_identifier: [u8; 32],
        note: String,
    ) -> Result<()> {
        instructions::send_payment::handler(ctx, amount, recipient_type, recipient_identifier, note)
    }

    /// Claim escrowed USDC as the intended recipient.
    pub fn claim_payment(ctx: Context<ClaimPayment>, payment_id: u64) -> Result<()> {
        instructions::claim_payment::handler(ctx, payment_id)
    }

    /// Cancel a pending payment and reclaim USDC (sender only).
    pub fn cancel_payment(ctx: Context<CancelPayment>, payment_id: u64) -> Result<()> {
        instructions::cancel_payment::handler(ctx, payment_id)
    }
}
