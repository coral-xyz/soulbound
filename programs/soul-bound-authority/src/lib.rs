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
    // Initialization.
    ////////////////////////////////////////////////////////////////////////////

    pub fn create_sba(ctx: Context<CreateSba>) -> Result<()> {
        let mut sba = &mut ctx.accounts.sba;
        sba.nft_mint = ctx.accounts.nft_mint.key();
        sba.bump = *ctx.bumps.get("sba").unwrap();
        Ok(())
    }

    pub fn accept_delegate(ctx: Context<AcceptDelegate>) -> Result<()> {
        let mut sba = &mut ctx.accounts.sba;
        sba.delegate = Some(ctx.accounts.delegate.key());
        Ok(())
    }

    pub fn revoke_delegate(ctx: Context<RevokeDelegate>) -> Result<()> {
        let mut sba = &mut ctx.accounts.sba;
        sba.delegate = None;
        Ok(())
    }

    ////////////////////////////////////////////////////////////////////////////
    // Stake program.
    ////////////////////////////////////////////////////////////////////////////

    // Stake the nft.
    pub fn stake_stake(ctx: Context<StakeStake>) -> Result<()> {
        lazily_wipe_delegate(&mut ctx.accounts.sba, &ctx.accounts.authority)?;
        // todo
        Ok(())
    }

    pub fn stake_unstake(ctx: Context<StakeUnstake>) -> Result<()> {
        lazily_wipe_delegate(&mut ctx.accounts.sba, &ctx.accounts.authority)?;
        // todo
        Ok(())
    }

    // Claims tokens from the staking program.
    pub fn stake_claim(ctx: Context<StakeClaim>) -> Result<()> {
        lazily_wipe_delegate(&mut ctx.accounts.sba, &ctx.accounts.authority)?;
        // todo
        Ok(())
    }

    pub fn stake_transfer(ctx: Context<StakeTransfer>) -> Result<()> {
        lazily_wipe_delegate(&mut ctx.accounts.sba, &ctx.accounts.authority)?;
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
        lazily_wipe_delegate(&mut ctx.accounts.sba, &ctx.accounts.authority)?;

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
pub struct AcceptDelegate<'info> {
    pub nft_mint: Account<'info, Mint>,
    #[account(
        constraint = nft_token.owner == authority.key(),
        constraint = nft_token.mint == nft_mint.key(),
    )]
    pub nft_token: Account<'info, TokenAccount>,
    #[account(
        seeds = [NS_SBA, nft_mint.key().as_ref()],
        bump = sba.bump,
    )]
    pub sba: Account<'info, SoulBoundAuthority>,
    pub authority: Signer<'info>,
    /// CHECK: no writes. Just setting delegate.
    pub delegate: UncheckedAccount<'info>,
}

#[derive(Accounts)]
pub struct RevokeDelegate<'info> {
    pub nft_mint: Account<'info, Mint>,
    #[account(
        constraint = nft_token.owner == authority.key(),
        constraint = nft_token.mint == nft_mint.key(),
    )]
    pub nft_token: Account<'info, TokenAccount>,
    #[account(
        seeds = [NS_SBA, nft_mint.key().as_ref()],
        bump = sba.bump,
    )]
    pub sba: Account<'info, SoulBoundAuthority>,
    pub authority: Signer<'info>,
}

//
// Note: either the delegate or the authority has to sign.
//
#[derive(Accounts)]
pub struct StakeStake<'info> {
    #[account(
        seeds = [NS_SBA, nft_mint.key().as_ref()],
        bump = sba.bump,
    )]
    pub sba: Account<'info, SoulBoundAuthority>,
    pub nft_mint: Account<'info, Mint>,
    #[account(
        constraint = nft_token.owner == authority.key(),
        constraint = nft_token.mint == nft_mint.key(),
    )]
    pub nft_token: Account<'info, TokenAccount>,
    /// CHECK: Checked via constraint on nft_token .
    pub authority: UncheckedAccount<'info>,
    /// CHECK: Checked via constraint on sba.delegate.
    #[account(
        constraint = Some(delegate.key()) == sba.delegate
    )]
    pub delegate: UncheckedAccount<'info>,
    #[account(
        constraint = authority.key() == authority_or_delegate.key()
            || delegate.key() == authority_or_delegate.key()
    )]
    pub authority_or_delegate: Signer<'info>,
    // todo
}

//
// Note: either the delegate or the authority has to sign.
//
#[derive(Accounts)]
pub struct StakeUnstake<'info> {
    #[account(
        seeds = [NS_SBA, nft_mint.key().as_ref()],
        bump = sba.bump,
    )]
    pub sba: Account<'info, SoulBoundAuthority>,
    pub nft_mint: Account<'info, Mint>,
    #[account(
        constraint = nft_token.owner == authority.key(),
        constraint = nft_token.mint == nft_mint.key(),
    )]
    pub nft_token: Account<'info, TokenAccount>,
    /// CHECK: Checked via constraint on nft_token .
    pub authority: UncheckedAccount<'info>,
    /// CHECK: Checked via constraint on sba.delegate.
    #[account(
        constraint = Some(delegate.key()) == sba.delegate
    )]
    pub delegate: UncheckedAccount<'info>,
    #[account(
        constraint = authority.key() == authority_or_delegate.key()
            || delegate.key() == authority_or_delegate.key()
    )]
    pub authority_or_delegate: Signer<'info>,
    // todo
}

//
// Note: either the delegate or the authority has to sign.
//
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
    /// CHECK: Checked via constraint on nft_token .
    pub authority: UncheckedAccount<'info>,
    /// CHECK: Checked via constraint on sba.delegate.
    #[account(
        constraint = Some(delegate.key()) == sba.delegate
    )]
    pub delegate: UncheckedAccount<'info>,
    //
    #[account(
        constraint = authority.key() == authority_or_delegate.key()
            || delegate.key() == authority_or_delegate.key()
    )]
    pub authority_or_delegate: Signer<'info>,
    // TODO:
    /// CHECK: todo (use stake program type).
    pub stake_program: UncheckedAccount<'info>,
    // - stake program
    // - stake accounts
}

//
// Note: either the delegate or the authority has to sign.
//
#[derive(Accounts)]
pub struct StakeTransfer<'info> {
    #[account(
        seeds = [NS_SBA, nft_mint.key().as_ref()],
        bump = sba.bump,
    )]
    pub sba: Account<'info, SoulBoundAuthority>,
    pub nft_mint: Account<'info, Mint>,
    #[account(
        constraint = nft_token.owner == authority.key(),
        constraint = nft_token.mint == nft_mint.key(),
    )]
    pub nft_token: Account<'info, TokenAccount>,
    /// CHECK: Checked via constraint on nft_token .
    pub authority: UncheckedAccount<'info>,
    /// CHECK: Checked via constraint on sba.delegate.
    #[account(
        constraint = Some(delegate.key()) == sba.delegate
    )]
    pub delegate: UncheckedAccount<'info>,
    #[account(
        constraint = authority.key() == authority_or_delegate.key()
            || delegate.key() == authority_or_delegate.key()
    )]
    pub authority_or_delegate: Signer<'info>,
    // todo
}

//
// Note: either the delegate or the authority has to sign.
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
    // The last owner of the NFT.
    //
    // This field is tracked so that we can wipe the delegate whenever ownership
    // changes on the NFT.
    pub last_authority: Pubkey,
    // The nft that controls this SBA.
    pub nft_mint: Pubkey,
    // The key that has the ability to CPI on behalf o this soul bound authority.
    pub delegate: Option<Pubkey>,
    pub bump: u8,
}

impl SoulBoundAuthority {
    pub const LEN: usize = 8 + 32 + 32 + 33;
}

////////////////////////////////////////////////////////////////////////////////
// Error.
////////////////////////////////////////////////////////////////////////////////

#[error_code]
pub enum ErrorCode {
    Todo,
}

////////////////////////////////////////////////////////////////////////////////
// Access control.
////////////////////////////////////////////////////////////////////////////////

//
// If the owner of the mad lad has changed, then wipes the delegate and updates
// the authority to the new owner. This needs to be called and checked
// anytime an instruction uses any of the soul bound authority signers.
//
// Assumes the current_authority <> SBA nft relationship has been established by
// constraints already.
//
pub fn lazily_wipe_delegate<'info>(
    sba: &mut Account<'info, SoulBoundAuthority>,
    current_authority: &AccountInfo<'info>,
) -> Result<()> {
    if sba.last_authority != current_authority.key() {
        sba.last_authority = current_authority.key();
        sba.delegate = None;
    }
    Ok(())
}
