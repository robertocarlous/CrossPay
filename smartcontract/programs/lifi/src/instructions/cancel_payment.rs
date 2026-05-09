use anchor_lang::prelude::*;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token::{self, CloseAccount, Mint, Token, TokenAccount, Transfer};

use crate::constants::{SEED_ESCROW, SEED_LINK};
use crate::error::ErrorCode;
use crate::events::PaymentCancelled;
use crate::state::{EscrowPayment, PaymentLink, PaymentStatus};

#[derive(Accounts)]
#[instruction(payment_id: u64)]
pub struct CancelPayment<'info> {
    #[account(mut)]
    pub sender: Signer<'info>,

    #[account(
        mut,
        associated_token::mint = token_mint,
        associated_token::authority = sender,
    )]
    pub sender_token_account: Account<'info, TokenAccount>,

    #[account(
        mut,
        close = sender,
        seeds = [SEED_ESCROW, &payment_id.to_le_bytes()],
        bump = escrow_payment.bump,
        constraint = escrow_payment.sender == sender.key() @ ErrorCode::UnauthorizedCanceller,
        constraint = escrow_payment.status == PaymentStatus::Pending @ ErrorCode::AlreadyFinalized,
        constraint = token_mint.key() == escrow_payment.token_mint @ ErrorCode::WrongTokenMint,
    )]
    pub escrow_payment: Account<'info, EscrowPayment>,

    #[account(
        mut,
        close = sender,
        seeds = [SEED_LINK, escrow_payment.recipient_identifier.as_ref(), &payment_id.to_le_bytes()],
        bump = payment_link.bump,
    )]
    pub payment_link: Account<'info, PaymentLink>,

    #[account(
        mut,
        associated_token::mint = token_mint,
        associated_token::authority = escrow_payment,
    )]
    pub escrow_token_account: Account<'info, TokenAccount>,

    pub token_mint: Account<'info, Mint>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<CancelPayment>, payment_id: u64) -> Result<()> {
    // Funds are locked for the full 7-day window so the recipient can always claim.
    // Only after expiry can the sender reclaim.
    let clock = Clock::get()?;
    require!(
        clock.unix_timestamp > ctx.accounts.escrow_payment.expires_at,
        ErrorCode::PaymentNotExpired
    );

    let amount = ctx.accounts.escrow_payment.amount;
    let bump = ctx.accounts.escrow_payment.bump;
    let seeds = &[SEED_ESCROW, &payment_id.to_le_bytes(), &[bump]];
    let signer = &[&seeds[..]];

    // Return USDC from escrow ATA → sender ATA.
    token::transfer(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.key(),
            Transfer {
                from: ctx.accounts.escrow_token_account.to_account_info(),
                to: ctx.accounts.sender_token_account.to_account_info(),
                authority: ctx.accounts.escrow_payment.to_account_info(),
            },
            signer,
        ),
        amount,
    )?;

    // Close the escrow ATA — rent goes to sender.
    token::close_account(CpiContext::new_with_signer(
        ctx.accounts.token_program.key(),
        CloseAccount {
            account: ctx.accounts.escrow_token_account.to_account_info(),
            destination: ctx.accounts.sender.to_account_info(),
            authority: ctx.accounts.escrow_payment.to_account_info(),
        },
        signer,
    ))?;

    ctx.accounts.escrow_payment.status = PaymentStatus::Cancelled;

    emit!(PaymentCancelled {
        payment_id,
        sender: ctx.accounts.sender.key(),
        amount,
    });

    Ok(())
}
