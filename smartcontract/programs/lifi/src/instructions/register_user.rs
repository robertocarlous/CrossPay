use anchor_lang::prelude::*;

use crate::constants::{MAX_USERNAME_LEN, SEED_USER, SEED_USERNAME};
use crate::events::{UserIdentifierUpdated, UserRegistered};
use crate::error::ErrorCode;
use crate::state::{UserProfile, UsernameIndex};

#[derive(Accounts)]
#[instruction(username: String)]
pub struct RegisterUser<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(
        init,
        payer = owner,
        space = UserProfile::LEN,
        seeds = [SEED_USER, owner.key().as_ref()],
        bump,
    )]
    pub user_profile: Account<'info, UserProfile>,

    /// Reserves the username globally so no two users share it.
    #[account(
        init,
        payer = owner,
        space = UsernameIndex::LEN,
        seeds = [SEED_USERNAME, username.as_bytes()],
        bump,
    )]
    pub username_index: Account<'info, UsernameIndex>,

    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<RegisterUser>,
    username: String,
    identifier_hash: Option<[u8; 32]>,
) -> Result<()> {
    require!(username.len() <= MAX_USERNAME_LEN, ErrorCode::UsernameTooLong);
    require!(!username.is_empty(), ErrorCode::UsernameInvalid);
    // Only allow alphanumeric + underscore
    require!(
        username.chars().all(|c| c.is_alphanumeric() || c == '_'),
        ErrorCode::UsernameInvalid
    );

    let clock = Clock::get()?;

    let profile = &mut ctx.accounts.user_profile;
    profile.owner = ctx.accounts.owner.key();
    profile.username = username;
    profile.created_at = clock.unix_timestamp;
    profile.bump = ctx.bumps.user_profile;

    if let Some(hash) = identifier_hash {
        profile.identifier_hash = hash;
        profile.has_identifier = true;
    } else {
        profile.identifier_hash = [0u8; 32];
        profile.has_identifier = false;
    }

    let index = &mut ctx.accounts.username_index;
    index.owner = ctx.accounts.owner.key();
    index.bump = ctx.bumps.username_index;

    emit!(UserRegistered {
        owner: ctx.accounts.owner.key(),
        username: ctx.accounts.user_profile.username.clone(),
        has_identifier: ctx.accounts.user_profile.has_identifier,
    });

    Ok(())
}

// ---------------------------------------------------------------------------
// Update identifier hash on an existing profile (username stays locked)
// ---------------------------------------------------------------------------

#[derive(Accounts)]
pub struct UpdateIdentifierHash<'info> {
    pub owner: Signer<'info>,

    #[account(
        mut,
        seeds = [SEED_USER, owner.key().as_ref()],
        bump = user_profile.bump,
        constraint = user_profile.owner == owner.key(),
    )]
    pub user_profile: Account<'info, UserProfile>,
}

pub fn update_identifier_hash_handler(
    ctx: Context<UpdateIdentifierHash>,
    identifier_hash: [u8; 32],
) -> Result<()> {
    let profile = &mut ctx.accounts.user_profile;
    profile.identifier_hash = identifier_hash;
    profile.has_identifier = true;

    emit!(UserIdentifierUpdated {
        owner: ctx.accounts.owner.key(),
    });

    Ok(())
}
