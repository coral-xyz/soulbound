use anchor_lang::prelude::*;
use anchor_lang::solana_program;
use anchor_lang::solana_program::instruction::{AccountMeta, Instruction};
use anchor_spl::token::{self, FreezeAccount, Mint, MintTo, Token, TokenAccount};

declare_id!("7DkjPwuKxvz6Viiawtbmb4CqnMKP6eGb1WqYas1airUS");

// Soul bound authority account namespace.
pub const NS_SBA_SCOPED_USER: &[u8] = b"sba-scoped-user";

// Soul bound authority scoped to a specific program namespace. These
// authorities should always be the authorities controlling any assets
// displayed by a given xNFT.
pub const NS_SBA_SCOPED_USER_PROGRAM: &[u8] = b"sba-scoped-user-nft-program";

// Soul bound authority scoped to an xnft.
pub const NS_SBA_SCOPED_NFT_XNFT: &[u8] = b"sba-scoped-nft-xnft";

#[program]
pub mod soul_bound_authority {
    use super::*;

    ////////////////////////////////////////////////////////////////////////////
    // Initialization.
    ////////////////////////////////////////////////////////////////////////////

    pub fn create_sba_user(ctx: Context<CreateSbaUser>) -> Result<()> {
        let mut sba = &mut ctx.accounts.sba;
        sba.bump = *ctx.bumps.get("sba").unwrap();
        sba.authority = ctx.accounts.authority.key();
        sba.delegate = Pubkey::default();
        Ok(())
    }

    ////////////////////////////////////////////////////////////////////////////
    // Delegation.
    ////////////////////////////////////////////////////////////////////////////

    pub fn accept_delegate(ctx: Context<AcceptDelegate>) -> Result<()> {
        let mut sba = &mut ctx.accounts.sba;
        sba.delegate = ctx.accounts.delegate.key();
        Ok(())
    }

    pub fn revoke_delegate(ctx: Context<RevokeDelegate>) -> Result<()> {
        let mut sba = &mut ctx.accounts.sba;
        sba.delegate = Pubkey::default();
        Ok(())
    }

    ////////////////////////////////////////////////////////////////////////////
    // Opaque CPI Proxy.
    ////////////////////////////////////////////////////////////////////////////

    //
    // CPIs to an opaque, unknown program with a scoped signer--as long as that
    // opaque program is not self-referential.
    //
    pub fn execute_tx_scoped_user_nft_program(
        ctx: Context<ExecuteTransactionScopedUserNftProgram>,
        data: Vec<u8>,
    ) -> Result<()> {
        let bump = *ctx.bumps.get("scoped_authority").unwrap();
        let sba = ctx.accounts.sba_user.key();
        let program = ctx.accounts.program.key();
        let nft_mint = ctx.accounts.nft_mint.key();
        let authority_key = ctx.accounts.authority.key();
        let seeds = &[
            NS_SBA_SCOPED_USER_PROGRAM,
            authority_key.as_ref(),
            nft_mint.as_ref(),
            program.as_ref(),
            &[bump],
        ];
        let signer = &[&seeds[..]];
        let signer_pubkey = Pubkey::create_program_address(seeds, &ID).unwrap();

        let ix = Instruction {
            program_id: ctx.accounts.program.key(),
            data,
            accounts: ctx
                .remaining_accounts
                .into_iter()
                .map(|a| AccountMeta {
                    pubkey: a.key(),
                    is_signer: if signer_pubkey == a.key() {
                        true
                    } else {
                        a.is_signer
                    },
                    is_writable: a.is_writable,
                })
                .collect(),
        };
        let accounts = ctx.remaining_accounts;
        solana_program::program::invoke_signed(&ix, accounts, signer)?;
        Ok(())
    }

    pub fn execute_tx_scoped_user_xnft(
        ctx: Context<ExecuteTransactionScopedNftXnft>,
        data: Vec<u8>,
    ) -> Result<()> {
        let nft_mint = ctx.accounts.nft_mint.key();
        let authority = ctx.accounts.authority.to_account_info();
        let bump = *ctx.bumps.get("scoped_xnft_authority").unwrap();
        let scoped_xnft_authority = ctx.accounts.scoped_xnft_authority.key();
        let authority = ctx.accounts.authority.key();
        let xnft = ctx.accounts.xnft.key();

        //
        // Sign with the user-xnft scoped PDA.
        //
        let seeds = &[
            NS_SBA_SCOPED_NFT_XNFT,
            nft_mint.as_ref(),
            xnft.as_ref(),
            &[bump],
        ];
        let signer = &[&seeds[..]];

        let ix = Instruction {
            program_id: ctx.accounts.program.key(),
            data,
            accounts: ctx
                .remaining_accounts
                .into_iter()
                .map(|a| AccountMeta {
                    pubkey: a.key(),
                    is_signer: if a.key() == scoped_xnft_authority {
                        true // PDA is always a signer.
                    } else if a.key() == authority.key() {
                        false // User wallet is never a signer.
                    } else {
                        a.is_signer // Pass through.
                    },
                    is_writable: a.is_writable,
                })
                .collect(),
        };
        let accounts = ctx.remaining_accounts;
        solana_program::program::invoke_signed(&ix, accounts, signer)?;
        Ok(())
    }
}

////////////////////////////////////////////////////////////////////////////////
// Contexts.
////////////////////////////////////////////////////////////////////////////////

#[derive(Accounts)]
pub struct CreateSbaUser<'info> {
    #[account(
        init,
        payer = payer,
        space = 8+ SoulBoundAuthorityUser::LEN,
        seeds = [NS_SBA_SCOPED_USER, authority.key().as_ref()],
        bump,
    )]
    pub sba: Account<'info, SoulBoundAuthorityUser>,

    ////////////////////////////////////////////////////////////////////////////
    // Inferred.
    ////////////////////////////////////////////////////////////////////////////
    pub authority: Signer<'info>,
    #[account(mut)]
    pub payer: Signer<'info>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct AcceptDelegate<'info> {
    #[account(
        seeds = [NS_SBA_SCOPED_USER, authority.key().as_ref()],
        bump = sba.bump,
    )]
    pub sba: Account<'info, SoulBoundAuthorityUser>,
    pub authority: Signer<'info>,
    /// CHECK: no writes. Just setting delegate.
    pub delegate: UncheckedAccount<'info>,
}

#[derive(Accounts)]
pub struct RevokeDelegate<'info> {
    #[account(
        seeds = [NS_SBA_SCOPED_USER, authority.key().as_ref()],
        bump = sba.bump,
    )]
    pub sba: Account<'info, SoulBoundAuthorityUser>,
    pub authority: Signer<'info>,
}

//
// Note: either the delegate or the authority has to sign.
//
#[derive(Accounts)]
pub struct ExecuteTransactionScopedUserNftProgram<'info> {
    #[account(
        seeds = [NS_SBA_SCOPED_USER, authority.key().as_ref()],
        bump = sba_user.bump,
    )]
    pub sba_user: Account<'info, SoulBoundAuthorityUser>,
    #[account(constraint = nft_token.owner == authority.key())]
    pub nft_token: Account<'info, TokenAccount>,
    #[account(constraint = nft_token.mint == nft_mint.key())]
    pub nft_mint: Account<'info, Mint>,
    /// CHECK: Checked via constraint.
    #[account(constraint = sba_user.authority == authority.key())]
    pub authority: UncheckedAccount<'info>,
    /// CHECK: Checked via constraint.
    #[account(constraint = sba_user.delegate == delegate.key())]
    pub delegate: UncheckedAccount<'info>,
    #[account(
        constraint = authority.key() == authority_or_delegate.key()
            || delegate.key() == authority_or_delegate.key()
    )]
    pub authority_or_delegate: Signer<'info>,
    /// CHECK: seeds constraint.
    #[account(
        seeds = [
            NS_SBA_SCOPED_USER_PROGRAM,
            authority.key().as_ref(),
            nft_mint.key().as_ref(),
            program.key().as_ref(),
        ],
        bump,
    )]
    pub scoped_authority: UncheckedAccount<'info>,
    /// CHECK: free CPI; no state accessed as long as not re-entrant.
    #[account(constraint = program.key() != ID)]
    pub program: UncheckedAccount<'info>,
}

#[derive(Accounts)]
pub struct ExecuteTransactionScopedNftXnft<'info> {
    #[account(constraint = nft_mint.key() == nft_token.mint)]
    pub nft_mint: Account<'info, Mint>,
    #[account(constraint = nft_token.owner == authority.key())]
    pub nft_token: Account<'info, TokenAccount>,

    pub authority: Signer<'info>,
    /// CHECK: don't technically need to check this since the safety of this
    ///        requires wallet coordination.
    pub xnft: UncheckedAccount<'info>,
    /// CHECK: seeds constraint.
    #[account(
        seeds = [
            NS_SBA_SCOPED_NFT_XNFT,
            nft_mint.key().as_ref(),
            xnft.key().as_ref(),
        ],
        bump,
    )]
    pub scoped_xnft_authority: UncheckedAccount<'info>,
    /// CHECK: free CPI; no state accessed as long as not re-entrant.
    #[account(constraint = program.key() != ID)]
    pub program: UncheckedAccount<'info>,
}

////////////////////////////////////////////////////////////////////////////////
// Accounts.
////////////////////////////////////////////////////////////////////////////////

#[account]
pub struct SoulBoundAuthorityUser {
    // This is soulbound and can never change.
    pub authority: Pubkey,
    // The key that has the ability to CPI on behalf o this soul bound authority.
    // Pubkey::default() => None.
    pub delegate: Pubkey,
    pub bump: u8,
}

impl SoulBoundAuthorityUser {
    pub const LEN: usize = (8 + 32 + 32 + 33) * 2;
}

////////////////////////////////////////////////////////////////////////////////
// Error.
////////////////////////////////////////////////////////////////////////////////

#[error_code]
pub enum ErrorCode {
    InvalidAuthorityAccess,
}
