use anchor_lang::prelude::*;

pub const SEED_STATE: &[u8] = b"state";
pub const SEED_USER: &[u8] = b"user";
pub const SEED_USERNAME: &[u8] = b"username";
pub const SEED_ESCROW: &[u8] = b"escrow";
/// Seed for PaymentLink PDAs — one per payment, keyed by recipient identifier.
pub const SEED_LINK: &[u8] = b"link";

pub const MAX_USERNAME_LEN: usize = 32;
pub const MAX_NOTE_LEN: usize = 100;

// 7 days in seconds
pub const PAYMENT_EXPIRY_SECS: i64 = 7 * 24 * 60 * 60;
