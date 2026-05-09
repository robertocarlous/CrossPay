import hashlib

from solders.pubkey import Pubkey


SEED_USER = b"user"
SEED_USERNAME = b"username"


def compute_identifier_hash(value: str) -> bytes:
    """SHA-256 of the lowercased email or E.164 phone number."""
    return hashlib.sha256(value.lower().encode()).digest()


def compute_identifier_hash_hex(value: str) -> str:
    return compute_identifier_hash(value).hex()


def get_user_profile_pda(program_id: str, wallet_address: str) -> str:
    """Derive [SEED_USER, owner] PDA — used by the frontend to build the register_user tx."""
    program_pubkey = Pubkey.from_string(program_id)
    owner_pubkey = Pubkey.from_string(wallet_address)
    pda, _ = Pubkey.find_program_address([SEED_USER, bytes(owner_pubkey)], program_pubkey)
    return str(pda)


def get_username_index_pda(program_id: str, username: str) -> str:
    """Derive [SEED_USERNAME, username.as_bytes()] PDA."""
    program_pubkey = Pubkey.from_string(program_id)
    pda, _ = Pubkey.find_program_address(
        [SEED_USERNAME, username.lower().encode()], program_pubkey
    )
    return str(pda)
