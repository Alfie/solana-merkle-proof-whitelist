use anchor_lang::prelude::*;
//use solana::hash;

declare_id!("J74Rijn16eYh8QFHiB4F2KQuu69XFJnGaff4KuckDmWj");

#[error_code]
pub enum MerkleProofError {
    #[msg("Account not in whitelist")]
    NotVerified,
}

//Verify Proof
pub fn verify(proof: Vec<[u8; 32]>, root: [u8; 32], leaf: [u8; 32]) -> bool {
    let mut computed_hash = leaf;
    
    for proof_element in proof.into_iter() {
        if computed_hash <= proof_element {
            // Hash(current computed hash + current element of the proof)
            computed_hash =
                anchor_lang::solana_program::keccak::hashv(&[&computed_hash, &proof_element]).0;
        } else {
            // Hash(current element of the proof + current computed hash)
            computed_hash =
                anchor_lang::solana_program::keccak::hashv(&[&proof_element, &computed_hash]).0;
        }
    }
    // Check if the computed hash (root) is equal to the provided root
    computed_hash == root
}

#[program]
pub mod merkle_proof {
    use super::*;

    //TODO: update root
    pub fn update_root(ctx: Context<UpdateRoot>, root_val: [u8; 32]) -> Result<()>{
        let root: &mut Account<Root> = &mut ctx.accounts.root;
        root.root_val = root_val;
        Ok(())
    }

    //TODO: checkRoot
    pub fn check_inclusion(ctx: Context<CheckInclusion>, proof: Vec<[u8; 32]>) -> Result<()> {
        let leaf = anchor_lang::solana_program::keccak::hash(&ctx.accounts.user.to_account_info().key.to_bytes()).0;
        if !verify(proof, ctx.accounts.root.root_val, leaf){
            return Err(MerkleProofError::NotVerified.into());
        };
        //Make CPI call here
        Ok(())
    }

    pub fn initialize(ctx: Context<Initialize>, root_bump: u8, root_val: [u8; 32]) -> Result<()> {
        let root: &mut Account<Root> = &mut ctx.accounts.root;
        root.authority = ctx.accounts.authority.key();
        root.root_val = root_val;
        root.root_bump = root_bump;
        Ok(())
    }
}

#[account]
pub struct Root{
    root_bump: u8,
    authority: Pubkey,
    root_val: [u8; 32],
}

impl Root{
    const LEN: usize = /*TODO: find correct usize of hashed root */1000;
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)]
    authority: Signer<'info>,
    //TODO: set to has one to only allow creator to change
    #[account(
        init,
        seeds=[authority.key().as_ref()],
        bump,
        payer=authority, 
        space=Root::LEN
    )]
    root: Account<'info, Root>,
    system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UpdateRoot<'info> {
    //may need a has_one check here
    #[account(
        mut,
        seeds=[
            authority.to_account_info().key.as_ref(),
        ],
        bump = root.root_bump,
        has_one = authority,
    )]
    root: Account<'info, Root>,
    ///CHECK: TODO: actually check this
    authority: Signer<'info>,
    system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CheckInclusion<'info> {
    #[account(
        mut,
        seeds=[ //TODO: possibly swap authority for id
            authority.to_account_info().key.as_ref(),
        ],
        bump = root.root_bump,
    )]
    root: Account<'info, Root>,
    ///CHECK: TODO: actually check this
    authority: AccountInfo<'info>,
    user: Signer<'info>,
    //CHECK: *
    //user: AccountInfo<'info>,
    //TODO: this needs to be figured out and system_program may not be necessary
    //system_program: Program<'info, System>,
}
