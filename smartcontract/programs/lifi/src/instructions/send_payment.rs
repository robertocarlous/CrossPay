use anchor_lang::prelude::*;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};

use crate::constants::{MAX_NOTE_LEN, PAYMENT_EXPIRY_SECS, SEED_ESCROW, SEED_LINK, SEED_STATE};
use crate::error::ErrorCode;
use crate::events::PaymentCreated;
use crate::state::{EscrowPayment, PaymentLink, PaymentStatus, ProgramState, RecipientType};

#[derive(Accounts)]
#[instruction(
    amount: u64,
    _recipient_type: RecipientType,
    recipient_identifier: [u8; 32],
    _note: String
)]
pub struct SendPayment<'info> {
    #[account(mut)]
    pub sender: Signer<'info>,

    #[account(
        mut,
        associated_token::mint = token_mint,
        associated_token::authority = sender,
    )]
    pub sender_token_account: Account<'info, TokenAccount>,

    /// CHECK: Any pubkey; Pubkey::default() for Identifier payments.
    pub recipient: UncheckedAccount<'info>,

    #[account(
        mut,
        seeds = [SEED_STATE],
        bump = program_state.bump,
    )]
    pub program_state: Account<'info, ProgramState>,

    #[account(
        init,
        payer = sender,
        space = EscrowPayment::LEN,
        seeds = [SEED_ESCROW, &program_state.payment_count.to_le_bytes()],
        bump,
    )]
    pub escrow_payment: Account<'info, EscrowPayment>,

    /// Token account owned by the escrow PDA — holds USDC until claimed.
    #[account(
        init,
        payer = sender,
        associated_token::mint = token_mint,
        associated_token::authority = escrow_payment,
    )]
    pub escrow_token_account: Account<'info, TokenAccount>,

    /// Index record so the recipient can find this payment by their identifier.
    #[account(
        init,
        payer = sender,
        space = PaymentLink::LEN,
        seeds = [SEED_LINK, recipient_identifier.as_ref(), &program_state.payment_count.to_le_bytes()],
        bump,
    )]
    pub payment_link: Account<'info, PaymentLink>,

    /// Must be the program's accepted mint (USDC).
    #[account(
        constraint = token_mint.key() == program_state.accepted_mint @ ErrorCode::UnacceptedMint,
    )]
    pub token_mint: Account<'info, Mint>,

    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<SendPayment>,
    amount: u64,
    recipient_type: RecipientType,
    recipient_identifier: [u8; 32],
    note: String,
) -> Result<()> {
    require!(amount > 0, ErrorCode::ZeroAmount);
    require!(note.len() <= MAX_NOTE_LEN, ErrorCode::NoteTooLong);

    let clock = Clock::get()?;
    let payment_id = ctx.accounts.program_state.payment_count;
    let token_mint_key = ctx.accounts.token_mint.key();

    token::transfer(
        CpiContext::new(
            ctx.accounts.token_program.key(),
            Transfer {
                from: ctx.accounts.sender_token_account.to_account_info(),
                to: ctx.accounts.escrow_token_account.to_account_info(),
                authority: ctx.accounts.sender.to_account_info(),
            },
        ),
        amount,
    )?;

    let expires_at = clock
        .unix_timestamp
        .checked_add(PAYMENT_EXPIRY_SECS)
        .ok_or(ErrorCode::Overflow)?;

    let escrow = &mut ctx.accounts.escrow_payment;
    escrow.payment_id = payment_id;
    escrow.sender = ctx.accounts.sender.key();
    escrow.recipient = ctx.accounts.recipient.key();
    escrow.recipient_identifier = recipient_identifier;
    escrow.recipient_type = recipient_type;
    escrow.amount = amount;
    escrow.token_mint = token_mint_key;
    escrow.status = PaymentStatus::Pending;
    escrow.created_at = clock.unix_timestamp;
    escrow.expires_at = expires_at;
    escrow.note = note;
    escrow.bump = ctx.bumps.escrow_payment;

    let link = &mut ctx.accounts.payment_link;
    link.recipient_identifier = recipient_identifier;
    link.payment_id = payment_id;
    link.bump = ctx.bumps.payment_link;

    ctx.accounts.program_state.payment_count = payment_id
        .checked_add(1)
        .ok_or(ErrorCode::Overflow)?;

    emit!(PaymentCreated {
        payment_id,
        sender: ctx.accounts.sender.key(),
        recipient: ctx.accounts.recipient.key(),
        recipient_identifier,
        amount,
        token_mint: token_mint_key,
        expires_at,
    });

    Ok(())
}
