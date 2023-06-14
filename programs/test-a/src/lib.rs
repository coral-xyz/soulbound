use anchor_lang::prelude::*;
use anchor_lang::solana_program;
use anchor_lang::InstructionData;
use solana_program::instruction::Instruction;

declare_id!("22ZdNtpGW6WzgrCaq2g1fCyRLYXVdF1rQFnHXfDhnkKE");

#[program]
pub mod test_a {
    use super::*;

    pub fn test(ctx: Context<Initialize>) -> Result<()> {
        let program = ctx.accounts.program.to_account_info();
        let authority = ctx.accounts.authority.to_account_info();

        solana_program::msg!("2: authority here: {:?}", authority);

        let ix = Instruction {
            program_id: ctx.accounts.program.key(),
            data: test_b::instruction::Test.data(),
            accounts: ctx
                .remaining_accounts
                .into_iter()
                .map(|a| {
                    solana_program::msg!("ITER: {:?}", a);
                    AccountMeta {
                        pubkey: a.key(),
                        is_signer: if a.key() == authority.key() {
                            true
                        } else {
                            a.is_signer
                        },
                        is_writable: a.is_writable,
                    }
                })
                .collect(),
        };
        let accounts = ctx.remaining_accounts;
        solana_program::program::invoke_signed(&ix, accounts, &[])?;
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    /// CHECK: test.
    authority: UncheckedAccount<'info>,
    /// CHECK: test.
    program: UncheckedAccount<'info>,
}
