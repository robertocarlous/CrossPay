use anchor_lang::prelude::*;

use crate::constants::SEED_STATE;
use crate::state::ProgramState;

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,

    #[account(
        init,
        payer = admin,
        space = ProgramState::LEN,
        seeds = [SEED_STATE],
        bump,
    )]
    pub program_state: Account<'info, ProgramState>,

    pub system_program: Program<'info, System>,
}

/// `accepted_mint` should be the USDC mint for the target cluster:
///   devnet:  4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU
///   mainnet: EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v
pub fn handler(ctx: Context<Initialize>, accepted_mint: Pubkey) -> Result<()> {
    let state = &mut ctx.accounts.program_state;
    state.admin = ctx.accounts.admin.key();
    state.accepted_mint = accepted_mint;
    state.payment_count = 0;
    state.bump = ctx.bumps.program_state;
    Ok(())
}
