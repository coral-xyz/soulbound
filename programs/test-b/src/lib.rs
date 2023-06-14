use anchor_lang::prelude::*;
use anchor_lang::solana_program;

declare_id!("Ag7uZu5YsGu2hwz8yn8vXhi4k1yV7pLZEnDh763h97uu");

#[program]
pub mod test_b {
    use super::*;

    pub fn test(ctx: Context<Test>) -> Result<()> {
        let authority = ctx.accounts.authority.to_account_info();

        solana_program::msg!("3: authority here: {:?}", authority);

        Ok(())
    }
}

#[derive(Accounts)]
pub struct Test<'info> {
    /// CHECK: test.
    #[account(mut)]
    authority: UncheckedAccount<'info>,
}
