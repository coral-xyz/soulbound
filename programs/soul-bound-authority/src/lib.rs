use anchor_lang::prelude::*;
use anchor_lang::solana_program;
use anchor_lang::solana_program::instruction::{AccountMeta, Instruction};
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

    ////////////////////////////////////////////////////////////////////////////
    // Stake program.
    ////////////////////////////////////////////////////////////////////////////

    // TODO: might not even need to create account data since the seeds are
    //       sufficient.
    pub fn create_sba(ctx: Context<CreateSba>) -> Result<()> {
        let mut sba = &mut ctx.accounts.sba;
        sba.nft_mint = ctx.accounts.nft_mint.key();
        sba.bump = *ctx.bumps.get("sba").unwrap();
        Ok(())
    }

    ////////////////////////////////////////////////////////////////////////////
    // Stake program.
    ////////////////////////////////////////////////////////////////////////////

    // Stake the nft.
    pub fn stake_stake(ctx: Context<StakeStake>) -> Result<()> {
        // todo
        Ok(())
    }

    pub fn stake_unstake(ctx: Context<StakeUnstake>) -> Result<()> {
        // todo
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

    ////////////////////////////////////////////////////////////////////////////
    // Opque programs.
    ////////////////////////////////////////////////////////////////////////////

    //
    // CPIs to an opaque, unknown program with a scoped signer--as long as that
    // opaque program is not self-referential.
    //
    pub fn execute_transaction(ctx: Context<ExecuteTransaction>, data: Vec<u8>) -> Result<()> {
        let ix = Instruction {
            program_id: ctx.accounts.program.key(),
            data,
            accounts: ctx
                .remaining_accounts
                .into_iter()
                .map(|a| AccountMeta {
                    pubkey: a.key(),
                    is_signer: a.is_signer,
                    is_writable: a.is_writable,
                })
                .collect(),
        };
        let bump = *ctx.bumps.get("sba").unwrap();
        let sba = ctx.accounts.sba.key();
        let program = ctx.accounts.program.key();
        let seeds = &[NS_SBA_SCOPED, sba.as_ref(), program.as_ref(), &[bump]];
        let signer = &[&seeds[..]];
        let accounts = ctx.remaining_accounts;
        solana_program::program::invoke_signed(&ix, accounts, signer)?;
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
pub struct StakeStake {
    // todo
}

#[derive(Accounts)]
pub struct StakeUnstake {
    // todo
}

#[derive(Accounts)]
pub struct StakeClaim<'info> {
    pub nft_mint: Account<'info, Mint>,
    #[account(
        constraint = nft_token.owner == authority.key(),
        constraint = nft_token.mint == nft_mint.key(),
    )]
    pub nft_token: Account<'info, TokenAccount>,

    ////////////////////////////////////////////////////////////////////////////
    // Inferred.
    ////////////////////////////////////////////////////////////////////////////
    #[account(
        seeds = [NS_SBA, nft_mint.key().as_ref()],
        bump = sba.bump,
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

//
// Only the owner of the mad lad can invoke this.
//
#[derive(Accounts)]
pub struct ExecuteTransaction<'info> {
    pub nft_mint: Account<'info, Mint>,
    #[account(
        constraint = nft_token.owner == authority.key(),
        constraint = nft_token.mint == nft_mint.key(),
    )]
    pub nft_token: Account<'info, TokenAccount>,
    pub authority: Signer<'info>,
    #[account(
        seeds = [NS_SBA, nft_mint.key().as_ref()],
        bump = sba.bump,
    )]
    pub sba: Account<'info, SoulBoundAuthority>,
    /// CHECK: seeds constraint.
    #[account(
        seeds = [NS_SBA_SCOPED, sba.key().as_ref(), program.key().as_ref()],
        bump,
    )]
    pub scoped_scoped_authority: UncheckedAccount<'info>,
    /// CHECK: free CPI; no state accessed as long as not re-entrant.
    #[account(constraint = program.key() != ID)]
    pub program: UncheckedAccount<'info>,
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
