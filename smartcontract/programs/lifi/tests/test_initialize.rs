use anchor_lang::{
    prelude::Pubkey,
    solana_program::{instruction::Instruction, system_program},
    AccountDeserialize, InstructionData, ToAccountMetas,
};
use litesvm::LiteSVM;
use lifi::state::{EscrowPayment, PaymentStatus, ProgramState, RecipientType, UserProfile};
use solana_account::Account;
use solana_clock::Clock;
use solana_keypair::Keypair;
use solana_message::{Message, VersionedMessage};
use solana_signer::Signer;
use solana_transaction::versioned::VersionedTransaction;
use solana_program_pack::Pack;
use spl_associated_token_account_interface::address::get_associated_token_address;
use spl_token_interface::state::{Account as TokenAccount, AccountState, Mint};

// ─────────────────────────────────────────────────────────────────────────────
// PDA helpers
// ─────────────────────────────────────────────────────────────────────────────

fn pid() -> Pubkey {
    lifi::id()
}
fn state_pda() -> Pubkey {
    Pubkey::find_program_address(&[b"state"], &pid()).0
}
fn user_pda(owner: &Pubkey) -> Pubkey {
    Pubkey::find_program_address(&[b"user", owner.as_ref()], &pid()).0
}
fn username_pda(username: &str) -> Pubkey {
    Pubkey::find_program_address(&[b"username", username.as_bytes()], &pid()).0
}
fn escrow_pda(payment_id: u64) -> Pubkey {
    Pubkey::find_program_address(&[b"escrow", &payment_id.to_le_bytes()], &pid()).0
}
fn link_pda(identifier: &[u8; 32], payment_id: u64) -> Pubkey {
    Pubkey::find_program_address(
        &[b"link", identifier.as_ref(), &payment_id.to_le_bytes()],
        &pid(),
    )
    .0
}

// ─────────────────────────────────────────────────────────────────────────────
// Transaction helpers
// ─────────────────────────────────────────────────────────────────────────────

fn send(svm: &mut LiteSVM, ix: Instruction, signers: &[&Keypair]) -> bool {
    let bh = svm.latest_blockhash();
    let msg = Message::new_with_blockhash(&[ix], Some(&signers[0].pubkey()), &bh);
    let tx = VersionedTransaction::try_new(VersionedMessage::Legacy(msg), signers).unwrap();
    svm.send_transaction(tx).is_ok()
}

fn send_err(svm: &mut LiteSVM, ix: Instruction, signers: &[&Keypair]) -> Vec<String> {
    let bh = svm.latest_blockhash();
    let msg = Message::new_with_blockhash(&[ix], Some(&signers[0].pubkey()), &bh);
    let tx = VersionedTransaction::try_new(VersionedMessage::Legacy(msg), signers).unwrap();
    svm.send_transaction(tx).unwrap_err().meta.logs
}

fn assert_err(logs: &[String], error_name: &str) {
    assert!(
        logs.iter().any(|l| l.contains(error_name)),
        "Expected error '{}' in logs:\n{}",
        error_name,
        logs.join("\n")
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Account state readers
// ─────────────────────────────────────────────────────────────────────────────

fn read_state(svm: &LiteSVM) -> ProgramState {
    let acc = svm.get_account(&state_pda()).unwrap();
    ProgramState::try_deserialize(&mut acc.data.as_ref()).unwrap()
}

fn read_user(svm: &LiteSVM, owner: &Pubkey) -> UserProfile {
    let acc = svm.get_account(&user_pda(owner)).unwrap();
    UserProfile::try_deserialize(&mut acc.data.as_ref()).unwrap()
}

fn read_escrow(svm: &LiteSVM, payment_id: u64) -> EscrowPayment {
    let acc = svm.get_account(&escrow_pda(payment_id)).unwrap();
    EscrowPayment::try_deserialize(&mut acc.data.as_ref()).unwrap()
}

fn token_balance(svm: &LiteSVM, ata: &Pubkey) -> u64 {
    svm.get_account(ata)
        .and_then(|acc| TokenAccount::unpack(&acc.data).ok())
        .map(|t| t.amount)
        .unwrap_or(0)
}

// ─────────────────────────────────────────────────────────────────────────────
// Setup helpers
// ─────────────────────────────────────────────────────────────────────────────

const ONE_SOL: u64 = 1_000_000_000;
const ONE_USDC: u64 = 1_000_000; // 6 decimals

fn new_svm() -> LiteSVM {
    let bytes = include_bytes!("../../../target/deploy/lifi.so");
    let mut svm = LiteSVM::new().with_default_programs();
    svm.add_program(pid(), bytes).unwrap();
    svm
}

/// Create a mint account directly in the SVM (bypasses token program CPI).
fn make_mint(svm: &mut LiteSVM) -> Pubkey {
    let key = Keypair::new().pubkey();
    let state = Mint {
        mint_authority: None.into(),
        supply: 0,
        decimals: 6,
        is_initialized: true,
        freeze_authority: None.into(),
    };
    let mut data = [0u8; Mint::LEN];
    Mint::pack(state, &mut data).unwrap();
    svm.set_account(
        key,
        Account {
            lamports: svm.minimum_balance_for_rent_exemption(Mint::LEN),
            data: data.to_vec(),
            owner: spl_token_interface::id(),
            executable: false,
            rent_epoch: 0,
        },
    )
    .unwrap();
    key
}

/// Create an ATA with a preset balance directly in the SVM.
fn make_ata(svm: &mut LiteSVM, owner: &Pubkey, mint: &Pubkey, amount: u64) -> Pubkey {
    let ata = get_associated_token_address(owner, mint);
    let state = TokenAccount {
        mint: *mint,
        owner: *owner,
        amount,
        delegate: None.into(),
        state: AccountState::Initialized,
        is_native: None.into(),
        delegated_amount: 0,
        close_authority: None.into(),
    };
    let mut data = [0u8; TokenAccount::LEN];
    TokenAccount::pack(state, &mut data).unwrap();
    svm.set_account(
        ata,
        Account {
            lamports: svm.minimum_balance_for_rent_exemption(TokenAccount::LEN),
            data: data.to_vec(),
            owner: spl_token_interface::id(),
            executable: false,
            rent_epoch: 0,
        },
    )
    .unwrap();
    ata
}

/// Warp the SVM clock past the 7-day payment expiry.
fn warp_past_expiry(svm: &mut LiteSVM) {
    let mut clock = svm.get_sysvar::<Clock>();
    clock.unix_timestamp += 7 * 24 * 60 * 60 + 1;
    svm.set_sysvar(&clock);
}

// ─────────────────────────────────────────────────────────────────────────────
// Instruction builders
// ─────────────────────────────────────────────────────────────────────────────

fn ix_initialize(admin: &Pubkey, accepted_mint: Pubkey) -> Instruction {
    Instruction::new_with_bytes(
        pid(),
        &lifi::instruction::Initialize { accepted_mint }.data(),
        lifi::accounts::Initialize {
            admin: *admin,
            program_state: state_pda(),
            system_program: system_program::ID,
        }
        .to_account_metas(None),
    )
}

fn ix_register_user(owner: &Pubkey, username: &str, identifier_hash: Option<[u8; 32]>) -> Instruction {
    Instruction::new_with_bytes(
        pid(),
        &lifi::instruction::RegisterUser {
            username: username.to_string(),
            identifier_hash,
        }
        .data(),
        lifi::accounts::RegisterUser {
            owner: *owner,
            user_profile: user_pda(owner),
            username_index: username_pda(username),
            system_program: system_program::ID,
        }
        .to_account_metas(None),
    )
}

fn ix_update_identifier(owner: &Pubkey, identifier_hash: [u8; 32]) -> Instruction {
    Instruction::new_with_bytes(
        pid(),
        &lifi::instruction::UpdateIdentifierHash { identifier_hash }.data(),
        lifi::accounts::UpdateIdentifierHash {
            owner: *owner,
            user_profile: user_pda(owner),
        }
        .to_account_metas(None),
    )
}

fn ix_send_payment(
    sender: &Pubkey,
    recipient: Pubkey,
    mint: Pubkey,
    payment_id: u64,
    recipient_identifier: [u8; 32],
    amount: u64,
    recipient_type: RecipientType,
    note: &str,
) -> Instruction {
    let escrow = escrow_pda(payment_id);
    Instruction::new_with_bytes(
        pid(),
        &lifi::instruction::SendPayment {
            amount,
            recipient_type,
            recipient_identifier,
            note: note.to_string(),
        }
        .data(),
        lifi::accounts::SendPayment {
            sender: *sender,
            sender_token_account: get_associated_token_address(sender, &mint),
            recipient,
            program_state: state_pda(),
            escrow_payment: escrow,
            escrow_token_account: get_associated_token_address(&escrow, &mint),
            payment_link: link_pda(&recipient_identifier, payment_id),
            token_mint: mint,
            token_program: spl_token_interface::id(),
            associated_token_program: spl_associated_token_account_interface::program::id(),
            system_program: system_program::ID,
        }
        .to_account_metas(None),
    )
}

fn ix_claim_payment(
    claimer: &Pubkey,
    sender: &Pubkey,
    mint: Pubkey,
    payment_id: u64,
    recipient_identifier: [u8; 32],
    claimer_profile: Pubkey,
) -> Instruction {
    let escrow = escrow_pda(payment_id);
    Instruction::new_with_bytes(
        pid(),
        &lifi::instruction::ClaimPayment { payment_id }.data(),
        lifi::accounts::ClaimPayment {
            claimer: *claimer,
            sender: *sender,
            escrow_payment: escrow,
            payment_link: link_pda(&recipient_identifier, payment_id),
            escrow_token_account: get_associated_token_address(&escrow, &mint),
            claimer_token_account: get_associated_token_address(claimer, &mint),
            token_mint: mint,
            claimer_profile,
            token_program: spl_token_interface::id(),
            associated_token_program: spl_associated_token_account_interface::program::id(),
            system_program: system_program::ID,
        }
        .to_account_metas(None),
    )
}

fn ix_cancel_payment(
    sender: &Pubkey,
    mint: Pubkey,
    payment_id: u64,
    recipient_identifier: [u8; 32],
) -> Instruction {
    let escrow = escrow_pda(payment_id);
    Instruction::new_with_bytes(
        pid(),
        &lifi::instruction::CancelPayment { payment_id }.data(),
        lifi::accounts::CancelPayment {
            sender: *sender,
            sender_token_account: get_associated_token_address(sender, &mint),
            escrow_payment: escrow,
            payment_link: link_pda(&recipient_identifier, payment_id),
            escrow_token_account: get_associated_token_address(&escrow, &mint),
            token_mint: mint,
            token_program: spl_token_interface::id(),
            associated_token_program: spl_associated_token_account_interface::program::id(),
            system_program: system_program::ID,
        }
        .to_account_metas(None),
    )
}

// ─────────────────────────────────────────────────────────────────────────────
// Common test setup
// ─────────────────────────────────────────────────────────────────────────────

struct Env {
    svm: LiteSVM,
    admin: Keypair,
    mint: Pubkey,
}

fn setup() -> Env {
    let mut svm = new_svm();
    let admin = Keypair::new();
    svm.airdrop(&admin.pubkey(), 10 * ONE_SOL).unwrap();

    let mint = make_mint(&mut svm);
    assert!(send(&mut svm, ix_initialize(&admin.pubkey(), mint), &[&admin]));

    Env { svm, admin, mint }
}

// ─────────────────────────────────────────────────────────────────────────────
// INITIALIZE tests
// ─────────────────────────────────────────────────────────────────────────────

#[test]
fn test_initialize_stores_state() {
    let Env { svm, admin, mint } = setup();

    let state = read_state(&svm);
    assert_eq!(state.admin, admin.pubkey());
    assert_eq!(state.accepted_mint, mint);
    assert_eq!(state.payment_count, 0);
}

#[test]
fn test_initialize_twice_fails() {
    let Env { mut svm, admin, mint } = setup();

    // Second call must fail — the PDA already exists and `init` cannot re-create it.
    assert!(!send(&mut svm, ix_initialize(&admin.pubkey(), mint), &[&admin]));
}

// ─────────────────────────────────────────────────────────────────────────────
// REGISTER USER tests
// ─────────────────────────────────────────────────────────────────────────────

#[test]
fn test_register_user_success() {
    let Env { mut svm, .. } = setup();
    let user = Keypair::new();
    svm.airdrop(&user.pubkey(), ONE_SOL).unwrap();

    let hash = [1u8; 32];
    assert!(send(
        &mut svm,
        ix_register_user(&user.pubkey(), "alice", Some(hash)),
        &[&user],
    ));

    let profile = read_user(&svm, &user.pubkey());
    assert_eq!(profile.owner, user.pubkey());
    assert_eq!(profile.username, "alice");
    assert_eq!(profile.identifier_hash, hash);
    assert!(profile.has_identifier);
}

#[test]
fn test_register_user_without_identifier() {
    let Env { mut svm, .. } = setup();
    let user = Keypair::new();
    svm.airdrop(&user.pubkey(), ONE_SOL).unwrap();

    assert!(send(
        &mut svm,
        ix_register_user(&user.pubkey(), "bob", None),
        &[&user],
    ));

    let profile = read_user(&svm, &user.pubkey());
    assert!(!profile.has_identifier);
    assert_eq!(profile.identifier_hash, [0u8; 32]);
}

#[test]
fn test_register_user_duplicate_fails() {
    let Env { mut svm, .. } = setup();
    let user = Keypair::new();
    svm.airdrop(&user.pubkey(), 2 * ONE_SOL).unwrap();

    assert!(send(&mut svm, ix_register_user(&user.pubkey(), "alice", None), &[&user]));

    // Second registration for the same wallet must fail.
    let logs = send_err(&mut svm, ix_register_user(&user.pubkey(), "alice2", None), &[&user]);
    assert!(logs.iter().any(|l| l.contains("already in use")));
}

#[test]
fn test_register_username_taken_fails() {
    let Env { mut svm, .. } = setup();
    let user1 = Keypair::new();
    let user2 = Keypair::new();
    svm.airdrop(&user1.pubkey(), ONE_SOL).unwrap();
    svm.airdrop(&user2.pubkey(), ONE_SOL).unwrap();

    assert!(send(&mut svm, ix_register_user(&user1.pubkey(), "alice", None), &[&user1]));

    // Different wallet, same username — must fail.
    let logs = send_err(&mut svm, ix_register_user(&user2.pubkey(), "alice", None), &[&user2]);
    assert!(logs.iter().any(|l| l.contains("already in use")));
}

#[test]
fn test_register_invalid_username_fails() {
    let Env { mut svm, .. } = setup();
    let user = Keypair::new();
    svm.airdrop(&user.pubkey(), ONE_SOL).unwrap();

    let logs = send_err(
        &mut svm,
        ix_register_user(&user.pubkey(), "alice!@#", None),
        &[&user],
    );
    assert_err(&logs, "UsernameInvalid");
}

#[test]
fn test_register_empty_username_fails() {
    let Env { mut svm, .. } = setup();
    let user = Keypair::new();
    svm.airdrop(&user.pubkey(), ONE_SOL).unwrap();

    let logs = send_err(&mut svm, ix_register_user(&user.pubkey(), "", None), &[&user]);
    assert_err(&logs, "UsernameInvalid");
}

// ─────────────────────────────────────────────────────────────────────────────
// UPDATE IDENTIFIER HASH tests
// ─────────────────────────────────────────────────────────────────────────────

#[test]
fn test_update_identifier_hash_success() {
    let Env { mut svm, .. } = setup();
    let user = Keypair::new();
    svm.airdrop(&user.pubkey(), ONE_SOL).unwrap();

    assert!(send(&mut svm, ix_register_user(&user.pubkey(), "alice", None), &[&user]));

    let new_hash = [42u8; 32];
    assert!(send(
        &mut svm,
        ix_update_identifier(&user.pubkey(), new_hash),
        &[&user],
    ));

    let profile = read_user(&svm, &user.pubkey());
    assert!(profile.has_identifier);
    assert_eq!(profile.identifier_hash, new_hash);
}

#[test]
fn test_update_identifier_wrong_owner_fails() {
    let Env { mut svm, .. } = setup();
    let user = Keypair::new();
    let attacker = Keypair::new();
    svm.airdrop(&user.pubkey(), ONE_SOL).unwrap();
    svm.airdrop(&attacker.pubkey(), ONE_SOL).unwrap();

    assert!(send(&mut svm, ix_register_user(&user.pubkey(), "alice", None), &[&user]));

    // Build the ix for user's profile but sign with attacker — constraint owner == owner fires.
    let ix = Instruction::new_with_bytes(
        pid(),
        &lifi::instruction::UpdateIdentifierHash { identifier_hash: [9u8; 32] }.data(),
        lifi::accounts::UpdateIdentifierHash {
            owner: attacker.pubkey(), // attacker signing but profile belongs to user
            user_profile: user_pda(&user.pubkey()), // user's profile PDA
        }
        .to_account_metas(None),
    );
    assert!(!send(&mut svm, ix, &[&attacker]));
}

// ─────────────────────────────────────────────────────────────────────────────
// SEND PAYMENT tests
// ─────────────────────────────────────────────────────────────────────────────

#[test]
fn test_send_payment_to_address_success() {
    let Env { mut svm, mint, .. } = setup();
    let sender = Keypair::new();
    let recipient = Keypair::new();
    svm.airdrop(&sender.pubkey(), 2 * ONE_SOL).unwrap();

    // Fund sender's USDC ATA.
    make_ata(&mut svm, &sender.pubkey(), &mint, 10 * ONE_USDC);

    let identifier = recipient.pubkey().to_bytes(); // use recipient pubkey as identifier
    let amount = 5 * ONE_USDC;

    assert!(send(
        &mut svm,
        ix_send_payment(
            &sender.pubkey(),
            recipient.pubkey(),
            mint,
            0,
            identifier,
            amount,
            RecipientType::Address,
            "test payment",
        ),
        &[&sender],
    ));

    // Verify EscrowPayment was created correctly.
    let escrow = read_escrow(&svm, 0);
    assert_eq!(escrow.payment_id, 0);
    assert_eq!(escrow.sender, sender.pubkey());
    assert_eq!(escrow.recipient, recipient.pubkey());
    assert_eq!(escrow.amount, amount);
    assert_eq!(escrow.status, PaymentStatus::Pending);
    assert_eq!(escrow.token_mint, mint);

    // Verify payment_count incremented.
    assert_eq!(read_state(&svm).payment_count, 1);

    // Verify USDC moved out of sender's wallet.
    let sender_ata = get_associated_token_address(&sender.pubkey(), &mint);
    assert_eq!(token_balance(&svm, &sender_ata), 5 * ONE_USDC);

    // Verify escrow ATA holds the funds.
    let escrow_ata = get_associated_token_address(&escrow_pda(0), &mint);
    assert_eq!(token_balance(&svm, &escrow_ata), amount);
}

#[test]
fn test_send_payment_wrong_mint_fails() {
    let Env { mut svm, .. } = setup();
    let sender = Keypair::new();
    svm.airdrop(&sender.pubkey(), 2 * ONE_SOL).unwrap();

    // Create a DIFFERENT mint (not the accepted one).
    let wrong_mint = make_mint(&mut svm);
    make_ata(&mut svm, &sender.pubkey(), &wrong_mint, 10 * ONE_USDC);

    let logs = send_err(
        &mut svm,
        ix_send_payment(
            &sender.pubkey(),
            Pubkey::new_unique(),
            wrong_mint, // not the accepted mint
            0,
            [0u8; 32],
            ONE_USDC,
            RecipientType::Address,
            "",
        ),
        &[&sender],
    );
    assert_err(&logs, "UnacceptedMint");
}

#[test]
fn test_send_payment_zero_amount_fails() {
    let Env { mut svm, mint, .. } = setup();
    let sender = Keypair::new();
    svm.airdrop(&sender.pubkey(), 2 * ONE_SOL).unwrap();
    make_ata(&mut svm, &sender.pubkey(), &mint, ONE_USDC);

    let logs = send_err(
        &mut svm,
        ix_send_payment(
            &sender.pubkey(),
            Pubkey::new_unique(),
            mint,
            0,
            [0u8; 32],
            0, // zero amount
            RecipientType::Address,
            "",
        ),
        &[&sender],
    );
    assert_err(&logs, "ZeroAmount");
}

#[test]
fn test_send_payment_note_too_long_fails() {
    let Env { mut svm, mint, .. } = setup();
    let sender = Keypair::new();
    svm.airdrop(&sender.pubkey(), 2 * ONE_SOL).unwrap();
    make_ata(&mut svm, &sender.pubkey(), &mint, ONE_USDC);

    let long_note = "x".repeat(101);
    let logs = send_err(
        &mut svm,
        ix_send_payment(
            &sender.pubkey(),
            Pubkey::new_unique(),
            mint,
            0,
            [0u8; 32],
            ONE_USDC,
            RecipientType::Address,
            &long_note,
        ),
        &[&sender],
    );
    assert_err(&logs, "NoteTooLong");
}

// ─────────────────────────────────────────────────────────────────────────────
// CLAIM PAYMENT tests
// ─────────────────────────────────────────────────────────────────────────────

fn do_send(env: &mut Env, sender: &Keypair, recipient: Pubkey, amount: u64) -> ([u8; 32], u64) {
    let payment_id = read_state(&env.svm).payment_count;
    let identifier = recipient.to_bytes();
    make_ata(&mut env.svm, &sender.pubkey(), &env.mint, amount);
    assert!(send(
        &mut env.svm,
        ix_send_payment(
            &sender.pubkey(),
            recipient,
            env.mint,
            payment_id,
            identifier,
            amount,
            RecipientType::Address,
            "",
        ),
        &[sender],
    ));
    (identifier, payment_id)
}

#[test]
fn test_claim_payment_by_address_success() {
    let mut env = setup();
    let sender = Keypair::new();
    let recipient = Keypair::new();
    env.svm.airdrop(&sender.pubkey(), 2 * ONE_SOL).unwrap();
    env.svm.airdrop(&recipient.pubkey(), ONE_SOL).unwrap();

    let (identifier, payment_id) = do_send(&mut env, &sender, recipient.pubkey(), 5 * ONE_USDC);

    assert!(send(
        &mut env.svm,
        ix_claim_payment(
            &recipient.pubkey(),
            &sender.pubkey(),
            env.mint,
            payment_id,
            identifier,
            system_program::ID, // unused profile placeholder
        ),
        &[&recipient],
    ));

    // Recipient received USDC.
    let recipient_ata = get_associated_token_address(&recipient.pubkey(), &env.mint);
    assert_eq!(token_balance(&env.svm, &recipient_ata), 5 * ONE_USDC);

    // Escrow account is closed.
    assert!(env.svm.get_account(&escrow_pda(payment_id)).is_none());
}

#[test]
fn test_claim_payment_by_identifier_success() {
    let mut env = setup();
    let sender = Keypair::new();
    let recipient = Keypair::new();
    env.svm.airdrop(&sender.pubkey(), 2 * ONE_SOL).unwrap();
    env.svm.airdrop(&recipient.pubkey(), ONE_SOL).unwrap();

    // Register recipient with an identifier hash.
    let id_hash = [7u8; 32];
    assert!(send(
        &mut env.svm,
        ix_register_user(&recipient.pubkey(), "carol", Some(id_hash)),
        &[&recipient],
    ));

    // Send to the identifier hash (unknown wallet).
    let payment_id = read_state(&env.svm).payment_count;
    make_ata(&mut env.svm, &sender.pubkey(), &env.mint, 3 * ONE_USDC);
    assert!(send(
        &mut env.svm,
        ix_send_payment(
            &sender.pubkey(),
            Pubkey::default(), // recipient unknown at send time
            env.mint,
            payment_id,
            id_hash,
            3 * ONE_USDC,
            RecipientType::Identifier,
            "",
        ),
        &[&sender],
    ));

    // Recipient claims using their registered profile.
    assert!(send(
        &mut env.svm,
        ix_claim_payment(
            &recipient.pubkey(),
            &sender.pubkey(),
            env.mint,
            payment_id,
            id_hash,
            user_pda(&recipient.pubkey()), // profile proves identity
        ),
        &[&recipient],
    ));

    let recipient_ata = get_associated_token_address(&recipient.pubkey(), &env.mint);
    assert_eq!(token_balance(&env.svm, &recipient_ata), 3 * ONE_USDC);
}

#[test]
fn test_claim_payment_wrong_claimer_fails() {
    let mut env = setup();
    let sender = Keypair::new();
    let real_recipient = Keypair::new();
    let attacker = Keypair::new();
    env.svm.airdrop(&sender.pubkey(), 2 * ONE_SOL).unwrap();
    env.svm.airdrop(&attacker.pubkey(), ONE_SOL).unwrap();

    let (identifier, payment_id) =
        do_send(&mut env, &sender, real_recipient.pubkey(), ONE_USDC);

    let logs = send_err(
        &mut env.svm,
        ix_claim_payment(
            &attacker.pubkey(),
            &sender.pubkey(),
            env.mint,
            payment_id,
            identifier,
            system_program::ID,
        ),
        &[&attacker],
    );
    assert_err(&logs, "UnauthorizedClaimer");
}

#[test]
fn test_claim_payment_expired_fails() {
    let mut env = setup();
    let sender = Keypair::new();
    let recipient = Keypair::new();
    env.svm.airdrop(&sender.pubkey(), 2 * ONE_SOL).unwrap();
    env.svm.airdrop(&recipient.pubkey(), ONE_SOL).unwrap();

    let (identifier, payment_id) = do_send(&mut env, &sender, recipient.pubkey(), ONE_USDC);

    warp_past_expiry(&mut env.svm);

    let logs = send_err(
        &mut env.svm,
        ix_claim_payment(
            &recipient.pubkey(),
            &sender.pubkey(),
            env.mint,
            payment_id,
            identifier,
            system_program::ID,
        ),
        &[&recipient],
    );
    assert_err(&logs, "PaymentExpired");
}

// ─────────────────────────────────────────────────────────────────────────────
// CANCEL PAYMENT tests
// ─────────────────────────────────────────────────────────────────────────────

#[test]
fn test_cancel_payment_success() {
    let mut env = setup();
    let sender = Keypair::new();
    let recipient = Keypair::new();
    env.svm.airdrop(&sender.pubkey(), 2 * ONE_SOL).unwrap();

    let (identifier, payment_id) = do_send(&mut env, &sender, recipient.pubkey(), 4 * ONE_USDC);

    warp_past_expiry(&mut env.svm);

    assert!(send(
        &mut env.svm,
        ix_cancel_payment(&sender.pubkey(), env.mint, payment_id, identifier),
        &[&sender],
    ));

    // Sender's USDC restored.
    let sender_ata = get_associated_token_address(&sender.pubkey(), &env.mint);
    assert_eq!(token_balance(&env.svm, &sender_ata), 4 * ONE_USDC);

    // Escrow account is gone.
    assert!(env.svm.get_account(&escrow_pda(payment_id)).is_none());
}

#[test]
fn test_cancel_payment_before_expiry_fails() {
    let mut env = setup();
    let sender = Keypair::new();
    let recipient = Keypair::new();
    env.svm.airdrop(&sender.pubkey(), 2 * ONE_SOL).unwrap();

    let (identifier, payment_id) = do_send(&mut env, &sender, recipient.pubkey(), ONE_USDC);

    // Do NOT warp clock — payment has not expired yet.
    let logs = send_err(
        &mut env.svm,
        ix_cancel_payment(&sender.pubkey(), env.mint, payment_id, identifier),
        &[&sender],
    );
    assert_err(&logs, "PaymentNotExpired");
}

#[test]
fn test_cancel_payment_wrong_sender_fails() {
    let mut env = setup();
    let sender = Keypair::new();
    let attacker = Keypair::new();
    let recipient = Keypair::new();
    env.svm.airdrop(&sender.pubkey(), 2 * ONE_SOL).unwrap();
    env.svm.airdrop(&attacker.pubkey(), ONE_SOL).unwrap();

    let (identifier, payment_id) = do_send(&mut env, &sender, recipient.pubkey(), ONE_USDC);

    // Create attacker's ATA so the account constraint passes before reaching the
    // UnauthorizedCanceller check.
    make_ata(&mut env.svm, &attacker.pubkey(), &env.mint, 0);

    warp_past_expiry(&mut env.svm);

    let logs = send_err(
        &mut env.svm,
        ix_cancel_payment(&attacker.pubkey(), env.mint, payment_id, identifier),
        &[&attacker],
    );
    assert_err(&logs, "UnauthorizedCanceller");
}

#[test]
fn test_cannot_claim_after_cancel() {
    let mut env = setup();
    let sender = Keypair::new();
    let recipient = Keypair::new();
    env.svm.airdrop(&sender.pubkey(), 2 * ONE_SOL).unwrap();
    env.svm.airdrop(&recipient.pubkey(), ONE_SOL).unwrap();

    let (identifier, payment_id) = do_send(&mut env, &sender, recipient.pubkey(), ONE_USDC);

    warp_past_expiry(&mut env.svm);
    assert!(send(
        &mut env.svm,
        ix_cancel_payment(&sender.pubkey(), env.mint, payment_id, identifier),
        &[&sender],
    ));

    // Escrow is already gone — claim must fail.
    let ix = ix_claim_payment(
        &recipient.pubkey(),
        &sender.pubkey(),
        env.mint,
        payment_id,
        identifier,
        system_program::ID,
    );
    assert!(!send(&mut env.svm, ix, &[&recipient]));
}

#[test]
fn test_multiple_payments_get_unique_ids() {
    let mut env = setup();
    let sender = Keypair::new();
    let r1 = Keypair::new();
    let r2 = Keypair::new();
    env.svm.airdrop(&sender.pubkey(), 5 * ONE_SOL).unwrap();
    make_ata(&mut env.svm, &sender.pubkey(), &env.mint, 10 * ONE_USDC);

    let id1 = read_state(&env.svm).payment_count;
    assert!(send(
        &mut env.svm,
        ix_send_payment(&sender.pubkey(), r1.pubkey(), env.mint, id1, r1.pubkey().to_bytes(), ONE_USDC, RecipientType::Address, ""),
        &[&sender],
    ));

    let id2 = read_state(&env.svm).payment_count;
    assert!(send(
        &mut env.svm,
        ix_send_payment(&sender.pubkey(), r2.pubkey(), env.mint, id2, r2.pubkey().to_bytes(), 2 * ONE_USDC, RecipientType::Address, ""),
        &[&sender],
    ));

    assert_ne!(id1, id2);
    assert_eq!(read_escrow(&env.svm, id1).amount, ONE_USDC);
    assert_eq!(read_escrow(&env.svm, id2).amount, 2 * ONE_USDC);
    assert_eq!(read_state(&env.svm).payment_count, 2);
}
