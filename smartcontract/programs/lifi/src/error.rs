use anchor_lang::prelude::*;

#[error_code]
pub enum ErrorCode {
    // --- username / registration ---
    #[msg("Username is too long (max 32 characters)")]
    UsernameTooLong,
    #[msg("Username contains invalid characters")]
    UsernameInvalid,

    // --- payment state ---
    #[msg("Payment is not in Pending status")]
    PaymentNotPending,
    #[msg("Payment has expired")]
    PaymentExpired,
    #[msg("Token mint does not match the payment record")]
    WrongTokenMint,

    // --- claim authorization ---
    #[msg("Signer is not the intended recipient")]
    UnauthorizedClaimer,
    #[msg("A registered user profile is required to claim this payment")]
    ProfileRequired,
    #[msg("The profile has no contact identifier (email or phone) registered")]
    IdentifierNotRegistered,
    #[msg("Contact identifier hash does not match the payment identifier")]
    IdentifierHashMismatch,

    // --- cancel authorization ---
    #[msg("Only the original sender can cancel this payment")]
    UnauthorizedCanceller,
    #[msg("Cannot cancel a payment that has already been claimed or cancelled")]
    AlreadyFinalized,
    #[msg("Payment has not expired yet — wait 7 days before cancelling")]
    PaymentNotExpired,

    // --- send validation ---
    #[msg("Token mint must be the program's accepted mint (USDC)")]
    UnacceptedMint,
    #[msg("Amount must be greater than zero")]
    ZeroAmount,
    #[msg("Note is too long (max 100 characters)")]
    NoteTooLong,

    // --- arithmetic ---
    #[msg("Arithmetic overflow")]
    Overflow,
}
