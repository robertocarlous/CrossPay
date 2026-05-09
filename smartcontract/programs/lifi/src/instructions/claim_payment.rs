use anchor_lang::prelude::*;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token::{self, CloseAccount, Mint, Token, TokenAccount, Transfer};

use crate::constants::{SEED_ESCROW, SEED_LINK};
use crate::error::ErrorCode;
use crate::events::PaymentClaimed;
use crate::state::{EscrowPayment, PaymentLink, PaymentStatus, RecipientType, UserProfile};

#[derive(Accounts)]
#[instruction(payment_id: u64)]
pub struct ClaimPayment<'info> {
    #[account(mut)]
    pub claimer: Signer<'info>,

    /// CHECK: Original sender; receives rent when escrow accounts close.
    #[account(
        mut,
        constraint = sender.key() == escrow_payment.sender,
    )]
    pub sender: UncheckedAccount<'info>,

    #[account(
        mut,
        close = sender,
        seeds = [SEED_ESCROW, &payment_id.to_le_bytes()],
        bump = escrow_payment.bump,
        constraint = escrow_payment.status == PaymentStatus::Pending @ ErrorCode::PaymentNotPending,
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

    /// Escrow's USDC token account — drained then closed in this ix.
    #[account(
        mut,
        associated_token::mint = token_mint,
        associated_token::authority = escrow_payment,
    )]
    pub escrow_token_account: Account<'info, TokenAccount>,

    /// Claimer's USDC token account — created if it doesn't exist yet.
    #[account(
        init_if_needed,
        payer = claimer,
        associated_token::mint = token_mint,
        associated_token::authority = claimer,
    )]
    pub claimer_token_account: Account<'info, TokenAccount>,

    pub token_mint: Account<'info, Mint>,

    /// CHECK: Only read for Identifier payments — validated in handler.
    pub claimer_profile: UncheckedAccount<'info>,

    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<ClaimPayment>, payment_id: u64) -> Result<()> {
    let escrow = &ctx.accounts.escrow_payment;
    let claimer_key = ctx.accounts.claimer.key();
    let clock = Clock::get()?;

    require!(
        clock.unix_timestamp <= escrow.expires_at,
        ErrorCode::PaymentExpired
    );

    match escrow.recipient_type {
        RecipientType::Address | RecipientType::Username => {
            require!(escrow.recipient == claimer_key, ErrorCode::UnauthorizedClaimer);
        }
        RecipientType::Identifier => {
            let data = ctx
                .accounts
                .claimer_profile
                .try_borrow_data()
                .map_err(|_| ErrorCode::ProfileRequired)?;
            let profile = UserProfile::try_deserialize(&mut data.as_ref())
                .map_err(|_| ErrorCode::ProfileRequired)?;
            require!(profile.owner == claimer_key, ErrorCode::UnauthorizedClaimer);
            require!(profile.has_identifier, ErrorCode::IdentifierNotRegistered);
            require!(
                profile.identifier_hash == escrow.recipient_identifier,
                ErrorCode::IdentifierHashMismatch
            );
        }
    }

    let amount = escrow.amount;
    let bump = escrow.bump;
    let seeds = &[SEED_ESCROW, &payment_id.to_le_bytes(), &[bump]];
    let signer = &[&seeds[..]];

    // Move USDC from escrow ATA → claimer ATA.
    token::transfer(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.key(),
            Transfer {
                from: ctx.accounts.escrow_token_account.to_account_info(),
                to: ctx.accounts.claimer_token_account.to_account_info(),
                authority: ctx.accounts.escrow_payment.to_account_info(),
            },
            signer,
        ),
        amount,
    )?;

    // Close the escrow ATA — rent goes back to sender.
    token::close_account(CpiContext::new_with_signer(
        ctx.accounts.token_program.key(),
        CloseAccount {
            account: ctx.accounts.escrow_token_account.to_account_info(),
            destination: ctx.accounts.sender.to_account_info(),
            authority: ctx.accounts.escrow_payment.to_account_info(),
        },
        signer,
    ))?;

    ctx.accounts.escrow_payment.status = PaymentStatus::Claimed;

    emit!(PaymentClaimed {
        payment_id,
        claimer: claimer_key,
        amount,
    });

    Ok(())
}
