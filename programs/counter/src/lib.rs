use anchor_lang::prelude::*;
use merkle_proof::cpi::accounts::CheckInclusion;
use merkle_proof::program::MerkleProof;
use merkle_proof::Root;

const DISCRIMINATOR_LENGTH: usize = 8;
const PUBKEY_LENGTH: usize = 32;
const UNSIGNED64_LENGTH: usize = 8;


declare_id!("9QPgNevoAuRegwpqdBwTihshfhFWouVLdXb8nqJKDX8U");

#[program]
pub mod counter {
    use super::*;

    pub fn create_counter(ctx: Context<CreateCounter>) -> Result<()> {
        let counter = &mut ctx.accounts.counter;
        counter.authority = ctx.accounts.authority.key();
        counter.count = 0;
        Ok(())
    }

    //TODO: this will turn into update_counter()
    pub fn update_counter(ctx: Context<UpdateCounter>,_bump: u8, proof: Vec<[u8; 32]>) -> Result<()> {
        let counter = &mut ctx.accounts.counter;
        let cpi_program = ctx.accounts.merkle_proof.to_account_info();
        let cpi_accounts = CheckInclusion {
            root: ctx.accounts.root.to_account_info(),
            authority: ctx.accounts.authority.to_account_info(),
            user: ctx.accounts.user.to_account_info(),
        };
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        merkle_proof::cpi::check_inclusion(cpi_ctx, proof);
        counter.count = counter.count.checked_add(1).unwrap();
        Ok(())
    }
}

#[account]
pub struct Counter {
    authority: Pubkey,
    count: u64,
}

impl Counter {
    const LEN: usize = DISCRIMINATOR_LENGTH + PUBKEY_LENGTH + UNSIGNED64_LENGTH;
}

#[derive(Accounts)]
pub struct CreateCounter<'info> {
    #[account(mut)]
    authority: Signer<'info>,
    #[account(init, seeds=[authority.key().as_ref()], bump, payer=authority, space=Counter::LEN)]
    counter: Account<'info, Counter>,
    system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(_bump: u8)]
pub struct UpdateCounter<'info> {
   #[account(mut,
        seeds = [authority.to_account_info().key.as_ref(),],
        bump = _bump,
    )]
    counter: Account<'info, Counter>,
    #[account(mut)]
    root: Account<'info, Root>,
    /// CHECK: This may need to change to ID
    authority: AccountInfo<'info>,
    user: Signer<'info>,
    merkle_proof: Program<'info, MerkleProof>,
    //system_program: Program<'info, System>,
}