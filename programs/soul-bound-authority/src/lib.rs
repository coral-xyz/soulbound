use anchor_lang::prelude::*;
use anchor_spl::token::{self, FreezeAccount, Mint, MintTo, Token, TokenAccount};

declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

// Soul bound authority account namespace.
pub const NS_SBA: &[u8] = b"sba";

// Soul bound authority scoped to a specific program namespace. These
// authorities should always be the authorities controlling any assets
// displayed by a given xNFT.
pub const NS_SBA_SCOPED: &[u8] = b"sba-scoped";

#[program]
pub mod soul_bound_authority {
    use super::*;

    // TODO: might not even need to create account data.
    pub fn create_sba(ctx: Context<CreateSba>) -> Result<()> {
        let mut sba = &mut ctx.accounts.sba;
        sba.nft_mint = ctx.accounts.nft_mint.key();
        sba.bump = *ctx.bumps.get("sba").unwrap();
        Ok(())
    }

    // Claims tokens from the staking program.
    pub fn stake_claim(ctx: Context<StakeClaim>) -> Result<()> {
        // todo
        Ok(())
    }

    pub fn stake_transfer(ctx: Context<StakeTransfer>) -> Result<()> {
        // todo
        Ok(())
    }
}

////////////////////////////////////////////////////////////////////////////////
// Contexts.
////////////////////////////////////////////////////////////////////////////////

#[derive(Accounts)]
pub struct CreateSba<'info> {
    pub nft_mint: Account<'info, Mint>,
    #[account(
				init,
				payer = payer,
				space = 8+ SoulBoundAuthority::LEN,
				seeds = [NS_SBA, nft_mint.key().as_ref()],
				bump,
		)]
    pub sba: Account<'info, SoulBoundAuthority>,

    ////////////////////////////////////////////////////////////////////////////
    // Inferred.
    ////////////////////////////////////////////////////////////////////////////
    #[account(mut)]
    pub payer: Signer<'info>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct StakeClaim<'info> {
    pub nft_mint: Account<'info, Mint>,
    #[account(constraint = nft_token.owner == authority.key())]
    pub nft_token: Account<'info, TokenAccount>,

    ////////////////////////////////////////////////////////////////////////////
    // Inferred.
    ////////////////////////////////////////////////////////////////////////////
    #[account(
				seeds = [NS_SBA, nft_mint.key().as_ref()],
				bump,
		)]
    pub sba: Account<'info, SoulBoundAuthority>,
    /// CHECK: seeds check asserts this is always the correct key.
    #[account(
				seeds = [NS_SBA_SCOPED, sba.key().as_ref(), stake_program.key().as_ref()],
				bump,
		)]
    pub sba_scoped_authority: UncheckedAccount<'info>,
    pub authority: Signer<'info>,
    // TODO:
    /// CHECK: todo (use stake program type).
    pub stake_program: UncheckedAccount<'info>,
    // - stake program
    // - stake accounts
}

#[derive(Accounts)]
pub struct StakeTransfer {
    // todo
}

////////////////////////////////////////////////////////////////////////////////
// Accounts.
////////////////////////////////////////////////////////////////////////////////

#[account]
pub struct SoulBoundAuthority {
    // The nft that controls this SBA.
    pub nft_mint: Pubkey,
    pub bump: u8,
}

impl SoulBoundAuthority {
    pub const LEN: usize = 8 + 32;
}

////////////////////////////////////////////////////////////////////////////////
// Error.
////////////////////////////////////////////////////////////////////////////////

#[error_code]
pub enum ErrorCode {
    Todo,
}
