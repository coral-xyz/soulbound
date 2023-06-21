import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import {
  PublicKey,
  SystemProgram,
  TransactionSignature,
  TransactionInstruction,
  ComputeBudgetProgram,
  Transaction,
  SYSVAR_INSTRUCTIONS_PUBKEY,
} from "@solana/web3.js";
import {
  getAssociatedTokenAddress,
  getAccount,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import {
  IDL as SoulBoundIdl,
  SoulBoundAuthority,
} from "./_idls/soulBoundAuthority";
import {
  IDL as CardinalStakePoolIdl,
  CardinalStakePool,
} from "./_idls/cardinalStakePool";
import {
  IDL as CardinalRewardDistributorIdl,
  CardinalRewardDistributor,
} from "./_idls/cardinalRewardDistributor";

const BN = anchor.BN;

export function createStakeApi(PROVIDER: any) {
  //
  // Mainnet stake constants.
  //
  const STAKE_POOL = new PublicKey(
    "7xmGGtuNNvjKLDwbYWBYGPpAjRqftJnrTyzSRK92yku8"
  );
  //const STAKE_POOL_IDENTIFIER = new PublicKey(
  //"E43L3VCJcDqN4pPhhPBiQjSr5A9cBJreTdMDVhWxXVCZ"
  //);
  const REWARD_DISTRIBUTOR = new PublicKey(
    "6DBnpqRm1szSz25dD1aWEmYzgGoMB59Y1GMv2gtWUSM4"
  );
  const GOLD_MINT = new PublicKey(
    "5QPAPkBvd2B7RQ6DBGvCxGdAcyWitdvRAP58CdvBiuf7"
  );

  //
  // Program ids.
  //
  const SOUL_BOUND_PROGRAM_ID = new PublicKey(
    "7DkjPwuKxvz6Viiawtbmb4CqnMKP6eGb1WqYas1airUS"
  );
  const CARDINAL_REWARD_DISTRIBUTOR_PROGRAM_ID = new PublicKey(
    "H2yQahQ7eQH8HXXPtJSJn8MURRFEWVesTd8PsracXp1S"
  );
  const CARDINAL_STAKE_POOL_PROGRAM_ID = new PublicKey(
    "2gvBmibwtBnbkLExmgsijKy6hGXJneou8X6hkyWQvYnF"
  );
  const TOKEN_METADATA_PROGRAM_ID = new PublicKey(
    "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"
  );

  //
  // Misc program constants.
  //
  const AUTHORIZATION_RULES_PROGRAM_ID = new PublicKey(
    "auth9SigNpDKz4sJJ1DfCTuZrZNSAgh9sFD3rboVmgg"
  );
  const AUTHORIZATION_RULES = new PublicKey(
    "eBJLFYPxJmMGKuFwpDWkzxZeUrad92kZRC5BJLpzyT9"
  );

  //
  // Stake program clients.
  //
  const SOUL_BOUND_PROGRAM = new Program<SoulBoundAuthority>(
    SoulBoundIdl,
    SOUL_BOUND_PROGRAM_ID,
    PROVIDER
  );
  const REWARD_DISTRIBUTOR_PROGRAM = new Program<CardinalRewardDistributor>(
    CardinalRewardDistributorIdl,
    CARDINAL_REWARD_DISTRIBUTOR_PROGRAM_ID,
    PROVIDER
  );
  const STAKE_POOL_PROGRAM = new Program<CardinalStakePool>(
    CardinalStakePoolIdl,
    CARDINAL_STAKE_POOL_PROGRAM_ID,
    PROVIDER
  );

  async function stake({
    user,
    nft,
    stakePool = STAKE_POOL,
    rewardDistributor = REWARD_DISTRIBUTOR,
    stakePoolProgram = STAKE_POOL_PROGRAM,
    rewardDistributorProgram = REWARD_DISTRIBUTOR_PROGRAM,
  }: {
    user: PublicKey;
    nft: {
      mintAddress: PublicKey;
      metadataAddress: PublicKey;
    };
    stakePool?: PublicKey;
    rewardDistributor?: PublicKey;
    stakePoolProgram?: Program<CardinalStakePool>;
    rewardDistributorProgram?: Program<CardinalRewardDistributor>;
  }): Promise<TransactionSignature> {
    const tx = new Transaction();
    tx.add(
      ComputeBudgetProgram.setComputeUnitLimit({
        units: 1000000,
      })
    );
    tx.add(
      await stakeInstruction({
        user,
        nft,
        stakePool,
        rewardDistributor,
        stakePoolProgram,
        rewardDistributorProgram,
      })
    );
    // @ts-ignore
    return await window.xnft.solana.send(tx);
  }

  async function stakeInstruction({
    user,
    nft,
    stakePool = STAKE_POOL,
    rewardDistributor = REWARD_DISTRIBUTOR,
    stakePoolProgram = STAKE_POOL_PROGRAM,
    rewardDistributorProgram = REWARD_DISTRIBUTOR_PROGRAM,
  }: {
    user: PublicKey;
    nft: {
      mintAddress: PublicKey;
      metadataAddress: PublicKey;
    };
    stakePool?: PublicKey;
    rewardDistributor?: PublicKey;
    stakePoolProgram?: Program<CardinalStakePool>;
    rewardDistributorProgram?: Program<CardinalRewardDistributor>;
  }): Promise<TransactionInstruction> {
    const stakeEntry = PublicKey.findProgramAddressSync(
      [
        Buffer.from("stake-entry"),
        stakePool.toBuffer(),
        nft.mintAddress.toBuffer(),
        getStakeSeed(1, user).toBuffer(),
      ],
      stakePoolProgram.programId
    )[0];
    const rewardEntry = PublicKey.findProgramAddressSync(
      [
        Buffer.from("reward-entry"),
        rewardDistributor.toBuffer(),
        stakeEntry.toBuffer(),
      ],
      rewardDistributorProgram.programId
    )[0];
    const ata = await anchor.utils.token.associatedAddress({
      mint: nft.mintAddress,
      owner: user,
    });
    const tokenRecord = PublicKey.findProgramAddressSync(
      [
        Buffer.from("metadata"),
        TOKEN_METADATA_PROGRAM_ID.toBuffer(),
        nft.mintAddress.toBuffer(),
        Buffer.from("token_record"),
        ata.toBuffer(),
      ],
      TOKEN_METADATA_PROGRAM_ID
    )[0];
    const masterEditionAddress = PublicKey.findProgramAddressSync(
      [
        Buffer.from("metadata"),
        TOKEN_METADATA_PROGRAM_ID.toBuffer(),
        nft.mintAddress.toBuffer(),
        Buffer.from("edition"),
      ],
      TOKEN_METADATA_PROGRAM_ID
    )[0];
    return await stakePoolProgram.methods
      .stakeProgrammable(new BN(1))
      .accounts({
        stakeEntry,
        rewardEntry,
        rewardDistributor,
        stakePool,
        originalMint: nft.mintAddress,
        user,
        userOriginalMintTokenAccount: ata,
        userOriginalMintTokenRecord: tokenRecord,
        mintMetadata: nft.metadataAddress,
        mintEdition: masterEditionAddress,
        authorizationRules: AUTHORIZATION_RULES,
        sysvarInstructions: SYSVAR_INSTRUCTIONS_PUBKEY,
        tokenProgram: TOKEN_PROGRAM_ID,
        tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
        authorizationRulesProgram: AUTHORIZATION_RULES_PROGRAM_ID,
        rewardDistributorProgram: rewardDistributorProgram.programId,
        systemProgram: SystemProgram.programId,
      })
      .instruction();
  }

  async function unstake({
    user,
    nft,
    stakePool = STAKE_POOL,
    stakePoolProgram = STAKE_POOL_PROGRAM,
  }: {
    user: PublicKey; // User's wallet address.
    nft: {
      // Nft to unstake.
      mintAddress: PublicKey;
      metadataAddress: PublicKey;
    };
    stakePool?: PublicKey;
    stakePoolProgram?: Program<CardinalStakePool>;
  }): Promise<TransactionSignature> {
    const stakeEntry = PublicKey.findProgramAddressSync(
      [
        Buffer.from("stake-entry"),
        stakePool.toBuffer(),
        nft.mintAddress.toBuffer(),
        getStakeSeed(1, user).toBuffer(),
      ],
      stakePoolProgram.programId
    )[0];
    const ata = await anchor.utils.token.associatedAddress({
      mint: nft.mintAddress,
      owner: user,
    });
    const tokenRecord = PublicKey.findProgramAddressSync(
      [
        Buffer.from("metadata"),
        TOKEN_METADATA_PROGRAM_ID.toBuffer(),
        nft.mintAddress.toBuffer(),
        Buffer.from("token_record"),
        ata.toBuffer(),
      ],
      TOKEN_METADATA_PROGRAM_ID
    )[0];
    const masterEditionAddress = PublicKey.findProgramAddressSync(
      [
        Buffer.from("metadata"),
        TOKEN_METADATA_PROGRAM_ID.toBuffer(),
        nft.mintAddress.toBuffer(),
        Buffer.from("edition"),
      ],
      TOKEN_METADATA_PROGRAM_ID
    )[0];
    const tx = await stakePoolProgram.methods
      .unstakeProgrammable()
      .accounts({
        stakeEntry,
        stakePool,
        originalMint: nft.mintAddress,
        user,
        userOriginalMintTokenAccount: ata,
        userOriginalMintTokenRecord: tokenRecord,
        mintMetadata: nft.metadataAddress,
        mintEdition: masterEditionAddress,
        authorizationRules: AUTHORIZATION_RULES,
        sysvarInstructions: SYSVAR_INSTRUCTIONS_PUBKEY,
        tokenProgram: TOKEN_PROGRAM_ID,
        tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
        authorizationRulesProgram: AUTHORIZATION_RULES_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .preInstructions(
        await claimRewardInstruction({
          user,
          nft,
        })
      )
      .transaction();
    // @ts-ignore
    return await window.xnft.solana.send(tx, undefined, {
      skipPreflight: true,
    });
  }

  async function isStaked({
    user,
    nft,
    stakePool = STAKE_POOL,
    stakePoolProgram = STAKE_POOL_PROGRAM,
  }: {
    user: PublicKey;
    nft: {
      // Nft to unstake.
      mintAddress: PublicKey;
      metadataAddress: PublicKey;
    };
    stakePool?: PublicKey;
    stakePoolProgram?: Program<CardinalStakePool>;
  }): Promise<boolean> {
    try {
      const stakeEntry = await fetchStakeEntry({
        user,
        nft,
        stakePool,
        stakePoolProgram,
      });
      return stakeEntry.lastStaker.equals(user);
    } catch (err) {
      // If throws, then the account probably doesn't exist.
      return false;
    }
  }

  const fetchStakeEntry = async ({
    user,
    nft,
    stakePool = STAKE_POOL,
    stakePoolProgram = STAKE_POOL_PROGRAM,
  }: {
    user: PublicKey;
    nft: {
      // Nft to unstake.
      mintAddress: PublicKey;
      metadataAddress: PublicKey;
    };
    stakePool?: PublicKey;
    stakePoolProgram?: Program<CardinalStakePool>;
  }) => {
    const stakeEntry = await stakeEntryAddress({
      user,
      nft,
      stakePool,
      stakePoolProgram,
    });
    return await stakePoolProgram.account.stakeEntry.fetch(stakeEntry);
  };

  const stakeEntryAddress = async ({
    user,
    nft,
    stakePool = STAKE_POOL,
    stakePoolProgram = STAKE_POOL_PROGRAM,
  }: {
    user: PublicKey;
    nft: {
      // Nft to unstake.
      mintAddress: PublicKey;
      metadataAddress: PublicKey;
    };
    stakePool?: PublicKey;
    stakePoolProgram?: Program<CardinalStakePool>;
  }) => {
    const stakeEntry = PublicKey.findProgramAddressSync(
      [
        Buffer.from("stake-entry"),
        stakePool.toBuffer(),
        nft.mintAddress.toBuffer(),
        getStakeSeed(1, user).toBuffer(),
      ],
      stakePoolProgram.programId
    )[0];
    return stakeEntry;
  };

  const fetchRewardEntry = async ({
    user,
    nft,
    stakePool = STAKE_POOL,
    rewardDistributor = REWARD_DISTRIBUTOR,
    stakePoolProgram = STAKE_POOL_PROGRAM,
    rewardDistributorProgram = REWARD_DISTRIBUTOR_PROGRAM,
  }: {
    user: PublicKey;
    nft: {
      // Nft to unstake.
      mintAddress: PublicKey;
      metadataAddress: PublicKey;
    };
    stakePool?: PublicKey;
    rewardDistributor?: PublicKey;
    stakePoolProgram?: Program<CardinalStakePool>;
    rewardDistributorProgram?: Program<CardinalRewardDistributor>;
  }) => {
    const stakeEntry = PublicKey.findProgramAddressSync(
      [
        Buffer.from("stake-entry"),
        stakePool.toBuffer(),
        nft.mintAddress.toBuffer(),
        getStakeSeed(1, user).toBuffer(),
      ],
      stakePoolProgram.programId
    )[0];
    const rewardEntry = PublicKey.findProgramAddressSync(
      [
        Buffer.from("reward-entry"),
        rewardDistributor.toBuffer(),
        stakeEntry.toBuffer(),
      ],
      rewardDistributorProgram.programId
    )[0];
    const rewardEntryAccount =
      await rewardDistributorProgram.account.rewardEntry.fetch(rewardEntry);
    return rewardEntryAccount;
  };

  const rewardEntryAddress = async ({
    user,
    nft,
    stakePool = STAKE_POOL,
    rewardDistributor = REWARD_DISTRIBUTOR,
    stakePoolProgram = STAKE_POOL_PROGRAM,
    rewardDistributorProgram = REWARD_DISTRIBUTOR_PROGRAM,
  }: {
    user: PublicKey;
    nft: {
      // Nft to unstake.
      mintAddress: PublicKey;
      metadataAddress: PublicKey;
    };
    stakePool?: PublicKey;
    rewardDistributor?: PublicKey;
    stakePoolProgram?: Program<CardinalStakePool>;
    rewardDistributorProgram?: Program<CardinalRewardDistributor>;
  }) => {
    const stakeEntry = await stakeEntryAddress({
      user,
      nft,
      stakePool,
      stakePoolProgram,
    });
    const rewardEntry = PublicKey.findProgramAddressSync(
      [
        Buffer.from("reward-entry"),
        rewardDistributor.toBuffer(),
        stakeEntry.toBuffer(),
      ],
      rewardDistributorProgram.programId
    )[0];
    return rewardEntry;
  };

  async function claimRewardInstruction({
    user,
    nft,
    stakePool = STAKE_POOL,
    rewardDistributor = REWARD_DISTRIBUTOR,
    goldMint = GOLD_MINT,
    soulboundProgram = SOUL_BOUND_PROGRAM,
    stakePoolProgram = STAKE_POOL_PROGRAM,
    rewardDistributorProgram = REWARD_DISTRIBUTOR_PROGRAM,
  }: {
    user: PublicKey;
    nft: {
      mintAddress: PublicKey;
      metadataAddress: PublicKey;
    };
    stakePool?: PublicKey;
    rewardDistributor?: PublicKey;
    goldMint?: PublicKey;
    soulboundProgram?: Program<SoulBoundAuthority>;
    stakePoolProgram?: Program<CardinalStakePool>;
    rewardDistributorProgram?: Program<CardinalRewardDistributor>;
  }): Promise<Array<TransactionInstruction>> {
    const [sbaUser] = PublicKey.findProgramAddressSync(
      [Buffer.from("sba-scoped-user"), user.toBuffer()],
      soulboundProgram.programId
    );
    const scopedSbaUserAuthority = PublicKey.findProgramAddressSync(
      [
        Buffer.from("sba-scoped-user-nft-program"),
        user.toBuffer(),
        nft.mintAddress.toBuffer(),
        rewardDistributorProgram.programId.toBuffer(),
      ],
      soulboundProgram.programId
    )[0];
    const stakeEntry = PublicKey.findProgramAddressSync(
      [
        Buffer.from("stake-entry"),
        stakePool.toBuffer(),
        nft.mintAddress.toBuffer(),
        getStakeSeed(1, user).toBuffer(),
      ],
      stakePoolProgram.programId
    )[0];
    const rewardEntry = PublicKey.findProgramAddressSync(
      [
        Buffer.from("reward-entry"),
        rewardDistributor.toBuffer(),
        stakeEntry.toBuffer(),
      ],
      rewardDistributorProgram.programId
    )[0];
    const userRewardMintTokenAccount = await getAssociatedTokenAddress(
      goldMint,
      scopedSbaUserAuthority,
      true
    );
    let { data, keys } = await rewardDistributorProgram.methods
      .claimRewards()
      .accounts({
        rewardEntry,
        rewardDistributor,
        stakeEntry,
        stakePool,
        originalMint: nft.mintAddress,
        rewardMint: goldMint,
        userRewardMintTokenAccount,
        authority: scopedSbaUserAuthority,
        user,
      })
      .instruction();

    // Need to set the signer on the PDA to false so that we can serialize
    // the transaction without error. The CPI in the program will flip this
    // back to true before signging with PDA seeds.
    keys = keys.map((k) => {
      return {
        ...k,
        isSigner: k.pubkey.equals(scopedSbaUserAuthority) ? false : k.isSigner,
      };
    });

    const nftToken = await getAssociatedTokenAddress(nft.mintAddress, user);

    //
    // If this is the first time using the soulbound program, then we need
    // to initialize the user account.
    //
    const soulboundInitInstructions = await (async () => {
      // If the soul bound authority user is already created, do nothing.
      if (await isSoulBoundAuthorityUserInitialized(user, soulboundProgram)) {
        return [];
      }
      // If the soulbound authority user is not yet created, then we
      // need to create it before claiming a reward.
      else {
        __cached = null; // Wipe cache.
        return [
          await soulboundProgram.methods
            .createSbaUser()
            .accounts({
              sba: sbaUser,
              authority: user,
              payer: user,
            })
            .instruction(),
        ];
      }
    })();

    const claimIx = await soulboundProgram.methods
      .executeTxScopedUserNftProgram(data)
      .accounts({
        sbaUser,
        nftToken,
        nftMint: nft.mintAddress,
        authority: user,
        delegate: PublicKey.default, // None.
        authorityOrDelegate: user,
        scopedAuthority: scopedSbaUserAuthority,
        program: rewardDistributorProgram.programId,
      })
      .remainingAccounts(keys)
      .instruction();

    const updateIx = await stakePoolProgram.methods
      .updateTotalStakeSeconds()
      .accounts({
        stakeEntry,
        lastStaker: user,
      })
      .instruction();

    return soulboundInitInstructions.concat([updateIx, claimIx]);
  }

  // Should invoke this method on load to slightly speed things up.
  //
  // Note this account can only be created; it can't be removed.
  let __cached: any = null;
  async function isSoulBoundAuthorityUserInitialized(
    user: PublicKey,
    soulboundProgram = SOUL_BOUND_PROGRAM
  ) {
    const [sbaUser] = PublicKey.findProgramAddressSync(
      [Buffer.from("sba-scoped-user"), user.toBuffer()],
      soulboundProgram.programId
    );
    if (__cached !== null) {
      return __cached;
    }
    try {
      await soulboundProgram.account.soulBoundAuthorityUser.fetch(sbaUser);
      __cached = true;
      return true;
    } catch {
      __cached = false;
      return false;
    }
  }

  async function readGoldPoints({
    user,
    nft,
    goldMint = GOLD_MINT,
    stakePool = STAKE_POOL,
    rewardDistributor = REWARD_DISTRIBUTOR,
    soulboundProgram = SOUL_BOUND_PROGRAM,
    stakePoolProgram = STAKE_POOL_PROGRAM,
    rewardDistributorProgram = REWARD_DISTRIBUTOR_PROGRAM,
    accounts,
  }: {
    user: PublicKey;
    nft: {
      // Nft to unstake.
      mintAddress: PublicKey;
      metadataAddress: PublicKey;
    };
    goldMint?: PublicKey;
    soulboundProgram?: Program<SoulBoundAuthority>;
    stakePool?: PublicKey;
    rewardDistributor?: PublicKey;
    stakePoolProgram?: Program<CardinalStakePool>;
    rewardDistributorProgram?: Program<CardinalRewardDistributor>;
    accounts?: any;
  }): Promise<number> {
    const unclaimed = await (async () => {
      try {
        return await readUnclaimedGoldPoints({
          user,
          nft,
          stakePool,
          rewardDistributor,
          stakePoolProgram,
          rewardDistributorProgram,
          accounts,
        });
      } catch {
        return new BN(0);
      }
    })();
    const claimed = await (async () => {
      try {
        return await readClaimedGoldPoints({
          user,
          nft,
          goldMint,
          soulboundProgram,
          rewardDistributorProgram,
          accounts,
        });
      } catch {
        return new BN(0);
      }
    })();
    const native = unclaimed.add(claimed);
    const decimals = 0;
    return native.toNumber() / 10 ** decimals;
  }

  // Unclaimed gold points are calculated client side.
  //
  // Rant: Would be nice if the contract just had a view function so that
  //       we don't have to redo this logic in typescript land, but such is life.
  async function readUnclaimedGoldPoints({
    user,
    nft,
    stakePool = STAKE_POOL,
    rewardDistributor = REWARD_DISTRIBUTOR,
    stakePoolProgram = STAKE_POOL_PROGRAM,
    rewardDistributorProgram = REWARD_DISTRIBUTOR_PROGRAM,
    accounts,
  }: {
    user: PublicKey;
    nft: {
      // Nft to unstake.
      mintAddress: PublicKey;
      metadataAddress: PublicKey;
    };
    stakePool?: PublicKey;
    rewardDistributor?: PublicKey;
    stakePoolProgram?: Program<CardinalStakePool>;
    rewardDistributorProgram?: Program<CardinalRewardDistributor>;
    accounts?: {
      stakeEntry: any;
      rewardEntry: any;
      rewardDistributor: any;
      goldTokenAccount: any;
    };
  }): Promise<anchor.BN> {
    const stakeEntryAcc = accounts
      ? accounts.stakeEntry
      : await fetchStakeEntry({
          user,
          nft,
          stakePool,
          stakePoolProgram,
        });
    const rewardEntryAcc = accounts
      ? accounts.rewardEntry
      : await fetchRewardEntry({
          user,
          nft: nft,
          stakePool,
          rewardDistributor,
          stakePoolProgram,
          rewardDistributorProgram,
        });

    // This means the staker unstaked.
    if (stakeEntryAcc.lastStaker.equals(PublicKey.default)) {
      return new BN(0);
    }
    if (stakeEntryAcc.amount.eq(new BN(0))) {
      return new BN(0);
    }

    const totalStakeSeconds = stakeEntryAcc.totalStakeSeconds.add(
      stakeEntryAcc.amount.eq(new BN(0))
        ? new BN(0)
        : new BN(Date.now() / 1000).sub(
            stakeEntryAcc.lastUpdatedAt as anchor.BN
          )
    );
    const rewardSecondsReceived = rewardEntryAcc.rewardSecondsReceived;
    const rewardDistributorAcc = accounts
      ? accounts.rewardDistributor
      : await rewardDistributorProgram.account.rewardDistributor.fetch(
          rewardDistributor
        );
    const rewardAmountToReceive = totalStakeSeconds
      .sub(rewardSecondsReceived)
      .div(rewardDistributorAcc.rewardDurationSeconds)
      .mul(rewardDistributorAcc.rewardAmount)
      .mul(new BN(1))
      .div(new BN(10).pow(new BN(rewardDistributorAcc.multiplierDecimals)));

    return rewardAmountToReceive;
  }

  // Points swept into the soulbound token account. These are soulbound to the
  // user and nft (combinatino) and automatically swept during unstaking.
  async function readClaimedGoldPoints({
    user,
    nft,
    goldMint = GOLD_MINT,
    soulboundProgram = SOUL_BOUND_PROGRAM,
    rewardDistributorProgram = REWARD_DISTRIBUTOR_PROGRAM,
    accounts,
  }: {
    user: PublicKey;
    nft: {
      // Nft to unstake.
      mintAddress: PublicKey;
      metadataAddress: PublicKey;
    };
    goldMint?: PublicKey;
    soulboundProgram?: Program<SoulBoundAuthority>;
    rewardDistributorProgram?: Program<CardinalRewardDistributor>;
    accounts?: {
      stakeEntry: any;
      rewardEntry: any;
      goldTokenAccount: any;
    };
  }): Promise<anchor.BN> {
    const userRewardMintTokenAccount = await goldPointsAddress({
      user,
      nft,
      goldMint,
      soulboundProgram,
      rewardDistributorProgram,
    });

    const claimedAmount = await (async () => {
      try {
        const rewardTokenAccount = accounts
          ? accounts.goldTokenAccount
          : await getAccount(
              soulboundProgram.provider.connection,
              userRewardMintTokenAccount
            );
        return new BN(rewardTokenAccount.amount.toString());
      } catch {
        return new BN(0);
      }
    })();

    return claimedAmount;
  }

  async function goldPointsAddress({
    user,
    nft,
    goldMint = GOLD_MINT,
    soulboundProgram = SOUL_BOUND_PROGRAM,
    rewardDistributorProgram = REWARD_DISTRIBUTOR_PROGRAM,
  }: {
    user: PublicKey;
    nft: {
      // Nft to unstake.
      mintAddress: PublicKey;
      metadataAddress: PublicKey;
    };
    goldMint?: PublicKey;
    soulboundProgram?: Program<SoulBoundAuthority>;
    rewardDistributorProgram?: Program<CardinalRewardDistributor>;
  }): Promise<PublicKey> {
    const scopedSbaUserAuthority = PublicKey.findProgramAddressSync(
      [
        Buffer.from("sba-scoped-user-nft-program"),
        user.toBuffer(),
        nft.mintAddress.toBuffer(),
        rewardDistributorProgram.programId.toBuffer(),
      ],
      soulboundProgram.programId
    )[0];
    const userRewardMintTokenAccount = await getAssociatedTokenAddress(
      goldMint,
      scopedSbaUserAuthority,
      true
    );

    return userRewardMintTokenAccount;
  }

  async function transferRewards({
    amount,
    fromUser, // fromUser should be the client payer/signer.
    fromNft,
    toNft,
    goldMint = GOLD_MINT,
    stakePool = STAKE_POOL,
    rewardDistributor = REWARD_DISTRIBUTOR,
    soulboundProgram = SOUL_BOUND_PROGRAM,
    stakePoolProgram = STAKE_POOL_PROGRAM,
    rewardDistributorProgram = REWARD_DISTRIBUTOR_PROGRAM,
  }: {
    amount?: anchor.BN;
    fromUser: PublicKey;
    fromNft: {
      mintAddress: PublicKey;
      metadataAddress: PublicKey;
    };
    toNft: {
      mintAddress: PublicKey;
      metadataAddress: PublicKey;
    };
    goldMint?: PublicKey;
    stakePool?: PublicKey;
    rewardDistributor?: PublicKey;
    soulboundProgram?: Program<SoulBoundAuthority>;
    stakePoolProgram?: Program<CardinalStakePool>;
    rewardDistributorProgram?: Program<CardinalRewardDistributor>;
  }): Promise<TransactionSignature> {
    const toUser = fromUser; // Transfers only allowed between same wallet.
    const [fromSbaUser] = PublicKey.findProgramAddressSync(
      [Buffer.from("sba-scoped-user"), fromUser.toBuffer()],
      soulboundProgram.programId
    );
    const fromScopedSbaUserAuthority = PublicKey.findProgramAddressSync(
      [
        Buffer.from("sba-scoped-user-nft-program"),
        fromUser.toBuffer(),
        fromNft.mintAddress.toBuffer(),
        rewardDistributorProgram.programId.toBuffer(),
      ],
      soulboundProgram.programId
    )[0];
    const fromStakeEntry = PublicKey.findProgramAddressSync(
      [
        Buffer.from("stake-entry"),
        stakePool.toBuffer(),
        fromNft.mintAddress.toBuffer(),
        getStakeSeed(1, fromUser).toBuffer(),
      ],
      stakePoolProgram.programId
    )[0];
    const fromRewardEntry = PublicKey.findProgramAddressSync(
      [
        Buffer.from("reward-entry"),
        rewardDistributor.toBuffer(),
        fromStakeEntry.toBuffer(),
      ],
      rewardDistributorProgram.programId
    )[0];
    const fromScopedSbaUserAuthorityAta = await getAssociatedTokenAddress(
      goldMint,
      fromScopedSbaUserAuthority,
      true
    );

    const toScopedSbaUserAuthority = PublicKey.findProgramAddressSync(
      [
        Buffer.from("sba-scoped-user-nft-program"),
        toUser.toBuffer(),
        toNft.mintAddress.toBuffer(),
        rewardDistributorProgram.programId.toBuffer(),
      ],
      soulboundProgram.programId
    )[0];
    const toStakeEntry = PublicKey.findProgramAddressSync(
      [
        Buffer.from("stake-entry"),
        stakePool.toBuffer(),
        toNft.mintAddress.toBuffer(),
        getStakeSeed(1, toUser).toBuffer(),
      ],
      stakePoolProgram.programId
    )[0];
    const toRewardEntry = PublicKey.findProgramAddressSync(
      [
        Buffer.from("reward-entry"),
        rewardDistributor.toBuffer(),
        toStakeEntry.toBuffer(),
      ],
      rewardDistributorProgram.programId
    )[0];
    const toScopedSbaUserAuthorityAta = await getAssociatedTokenAddress(
      goldMint,
      toScopedSbaUserAuthority,
      true
    );

    const fromNftToken = await getAssociatedTokenAddress(
      fromNft.mintAddress,
      fromUser
    );

    let { data, keys } = await rewardDistributorProgram.methods
      .transferRewards(amount ?? null)
      .accounts({
        rewardEntryA: fromRewardEntry,
        rewardEntryB: toRewardEntry,
        stakeEntryA: fromStakeEntry,
        stakeEntryB: toStakeEntry,
        rewardDistributor,
        stakePool,
        originalMintA: fromNft.mintAddress,
        originalMintB: toNft.mintAddress,
        rewardMint: goldMint,
        user: fromUser,
        userRewardMintTokenAccountA: fromScopedSbaUserAuthorityAta,
        userRewardMintTokenAccountB: toScopedSbaUserAuthorityAta,
        authorityA: fromScopedSbaUserAuthority,
        authorityB: toScopedSbaUserAuthority,
      })
      .instruction();

    // Need to set the signer on the PDA to false so that we can serialize
    // the transaction without error. The CPI in the program will flip this
    // back to true before signging with PDA seeds.
    keys = keys.map((k) => {
      return {
        ...k,
        isSigner: k.pubkey.equals(fromScopedSbaUserAuthority)
          ? false
          : k.isSigner,
      };
    });

    const tx = await soulboundProgram.methods
      .executeTxScopedUserNftProgram(data)
      .accounts({
        sbaUser: fromSbaUser,
        nftToken: fromNftToken,
        nftMint: fromNft.mintAddress,
        authority: fromUser,
        delegate: PublicKey.default, // None.
        authorityOrDelegate: fromUser,
        scopedAuthority: fromScopedSbaUserAuthority,
        program: rewardDistributorProgram.programId,
      })
      .remainingAccounts(keys)
      .transaction();

    // @ts-ignore
    return await window.xnft.solana.send(tx);
  }

  // Supply is the token supply of the nft mint.
  function getStakeSeed(supply: number, user: PublicKey): PublicKey {
    if (supply > 1) {
      return user;
    } else {
      return PublicKey.default;
    }
  }

  return {
    stake,
    stakeInstruction,
    unstake,
    isStaked,
    isSoulBoundAuthorityUserInitialized,
    readGoldPoints,
    readUnclaimedGoldPoints,
    readClaimedGoldPoints,
    transferRewards,
    anchor: {
      soulbound: SOUL_BOUND_PROGRAM,
      rewardDistributor: REWARD_DISTRIBUTOR_PROGRAM,
      stakePool: STAKE_POOL_PROGRAM,
    },
    constants: {
      REWARD_DISTRIBUTOR,
    },
    rewardEntryAddress,
    stakeEntryAddress,
    goldPointsAddress,
  };
}
