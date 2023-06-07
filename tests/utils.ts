import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import {
  PublicKey,
  SystemProgram,
  TransactionSignature,
  ComputeBudgetProgram,
  SYSVAR_INSTRUCTIONS_PUBKEY,
} from "@solana/web3.js";
import {
  getAssociatedTokenAddress,
  getAccount,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { SoulBoundAuthority } from "../target/types/soul_bound_authority";
import {
  IDL as CardinalStakePoolIdl,
  CardinalStakePool,
} from "../deps/cardinal-staking/target/types/cardinal_stake_pool";
import { CardinalRewardDistributor } from "../deps/cardinal-staking/target/types/cardinal_reward_distributor";

const BN = anchor.BN;

//
// Mainnet constants.
//
const STAKE_POOL = new PublicKey(
  "69Z1Q92pP7dT4uceWLJsscUek4Ca1kTH7ptguXe3U3x9"
);
const STAKE_POOL_IDENTIFIER = new PublicKey(
  "7UNSgTChntMtNFQp3jUiHQo7gLjYQbRbLmwJof9S6s7b"
);
const REWARD_DISTRIBUTOR = new PublicKey(
  "zBdwCHEGDwqPZEyQZCnPik7SNFnd6Dep7iwQLq525VG"
);
const GOLD_MINT = new PublicKey("D9BhjmeQJAcLLi256duFuZVaq8oPtqi16bW8utboPnUF");

//
// If these program ids ever change, make sure to change the Anchor.toml.
//
export const CARDINAL_REWARD_DISTRIBUTOR_PROGRAM_ID = new PublicKey(
  "EWbVVjugB3C1jewxFi9wPbvUtUxbU24PErSVe2Tmf6Qu"
);
export const CARDINAL_STAKE_POOL_PROGRAM_ID = new PublicKey(
  "6zdzehBogMiKxMuktMzwog6K22Gn2FF1VRUXn1DfYNTr"
);
export const TOKEN_METADATA_PROGRAM_ID = new PublicKey(
  "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"
);

//
// Misc programs.
//
export const AUTHORIZATION_RULES_PROGRAM_ID = new PublicKey(
  "auth9SigNpDKz4sJJ1DfCTuZrZNSAgh9sFD3rboVmgg"
);
export const AUTHORIZATION_RULES = new PublicKey(
  "eBJLFYPxJmMGKuFwpDWkzxZeUrad92kZRC5BJLpzyT9"
);

//
// If this changes, we need to change it in the cardinal-reward-distributor
// state.rs file.
//
export const ARMANI_AUTHORITY = new PublicKey(
  //  "F74rNS2dQmsCbVeW5iNgFUSWtdAPxJvJxwbrhieTyHLd"
  "EcxjN4mea6Ah9WSqZhLtSJJCZcxY73Vaz6UVHFZZ5Ttz"
);

export async function stake({
  user,
  nft,
  stakePool = STAKE_POOL,
  rewardDistributor = REWARD_DISTRIBUTOR,
  stakePoolProgram,
  rewardDistributorProgram,
}: {
  user: PublicKey;
  nft: {
    mintAddress: PublicKey;
    masterEditionAddress: PublicKey;
    metadataAddress: PublicKey;
  };
  stakePool: PublicKey;
  rewardDistributor: PublicKey;
  stakePoolProgram: Program<CardinalStakePool>;
  rewardDistributorProgram: Program<CardinalRewardDistributor>;
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
      mintEdition: nft.masterEditionAddress,
      authorizationRules: AUTHORIZATION_RULES,
      sysvarInstructions: SYSVAR_INSTRUCTIONS_PUBKEY,
      tokenProgram: TOKEN_PROGRAM_ID,
      tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
      authorizationRulesProgram: AUTHORIZATION_RULES_PROGRAM_ID,
      rewardDistributorProgram: rewardDistributorProgram.programId,
      systemProgram: SystemProgram.programId,
    })
    .preInstructions([
      ComputeBudgetProgram.setComputeUnitLimit({
        units: 1000000,
      }),
    ])
    .rpc({
      skipPreflight: true,
    });
}

export async function unstake({
  user,
  nft,
  stakePool = STAKE_POOL,
  stakePoolProgram,
}: {
  user: PublicKey; // User's wallet address.
  nft: {
    // Nft to unstake.
    mintAddress: PublicKey;
    masterEditionAddress: PublicKey;
    metadataAddress: PublicKey;
  };
  stakePool: PublicKey;
  stakePoolProgram: Program<CardinalStakePool>;
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
  return await stakePoolProgram.methods
    .unstakeProgrammable()
    .accounts({
      stakeEntry,
      stakePool,
      originalMint: nft.mintAddress,
      user,
      userOriginalMintTokenAccount: ata,
      userOriginalMintTokenRecord: tokenRecord,
      mintMetadata: nft.metadataAddress,
      mintEdition: nft.masterEditionAddress,
      authorizationRules: AUTHORIZATION_RULES,
      sysvarInstructions: SYSVAR_INSTRUCTIONS_PUBKEY,
      tokenProgram: TOKEN_PROGRAM_ID,
      tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
      authorizationRulesProgram: AUTHORIZATION_RULES_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .rpc();
}

const fetchStakeEntry = async ({
  user,
  nft,
  stakePool = STAKE_POOL,
  stakePoolProgram,
}: {
  user: PublicKey;
  nft: {
    // Nft to unstake.
    mintAddress: PublicKey;
    masterEditionAddress: PublicKey;
    metadataAddress: PublicKey;
  };
  stakePool: PublicKey;
  stakePoolProgram: Program<CardinalStakePool>;
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
  return await stakePoolProgram.account.stakeEntry.fetch(stakeEntry);
};

const fetchRewardEntry = async ({
  user,
  nft,
  stakePool = STAKE_POOL,
  rewardDistributor = REWARD_DISTRIBUTOR,
  stakePoolProgram,
  rewardDistributorProgram,
}: {
  user: PublicKey;
  nft: {
    // Nft to unstake.
    mintAddress: PublicKey;
    masterEditionAddress: PublicKey;
    metadataAddress: PublicKey;
  };
  stakePool: PublicKey;
  rewardDistributor: PublicKey;
  stakePoolProgram: Program<CardinalStakePool>;
  rewardDistributorProgram: Program<CardinalRewardDistributor>;
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

export async function claimReward({
  user,
  nft,
  stakePool = STAKE_POOL,
  rewardDistributor = REWARD_DISTRIBUTOR,
  goldMint = GOLD_MINT,
  soulboundProgram,
  stakePoolProgram,
  rewardDistributorProgram,
}: {
  user: PublicKey;
  nft: {
    // Nft to unstake.
    mintAddress: PublicKey;
    masterEditionAddress: PublicKey;
    metadataAddress: PublicKey;
  };
  stakePool: PublicKey;
  rewardDistributor: PublicKey;
  goldMint: PublicKey;
  soulboundProgram: Program<SoulBoundAuthority>;
  stakePoolProgram: Program<CardinalStakePool>;
  rewardDistributorProgram: Program<CardinalRewardDistributor>;
}): Promise<TransactionSignature> {
  const [sbaUser] = PublicKey.findProgramAddressSync(
    [Buffer.from("sba-scoped-user"), user.toBuffer()],
    soulboundProgram.programId
  );
  const scopedSbaUserAuthority = PublicKey.findProgramAddressSync(
    [
      Buffer.from("sba-scoped-user-program"),
      user.toBuffer(),
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

  return await soulboundProgram.methods
    .executeTxScopedUserProgram(data)
    .accounts({
      sbaUser,
      authority: user,
      delegate: PublicKey.default, // None.
      authorityOrDelegate: user,
      scopedAuthority: scopedSbaUserAuthority,
      program: rewardDistributorProgram.programId,
    })
    .remainingAccounts(keys)
    .preInstructions([
      await stakePoolProgram.methods
        .updateTotalStakeSeconds()
        .accounts({
          stakeEntry,
          lastStaker: user,
        })
        .instruction(),
    ])
    .rpc({
      skipPreflight: true,
    });
}

export async function readUnclaimedGoldPoints({
  user,
  nft,
  stakePool = STAKE_POOL,
  rewardDistributor = REWARD_DISTRIBUTOR,
  stakePoolProgram,
  rewardDistributorProgram,
}: {
  user: PublicKey;
  nft: {
    // Nft to unstake.
    mintAddress: PublicKey;
    masterEditionAddress: PublicKey;
    metadataAddress: PublicKey;
  };
  stakePool: PublicKey;
  rewardDistributor: PublicKey;
  stakePoolProgram: Program<CardinalStakePool>;
  rewardDistributorProgram: Program<CardinalRewardDistributor>;
}): Promise<anchor.BN> {
  let stakeEntryAcc = await fetchStakeEntry({
    user,
    nft: nft,
    stakePool,
    stakePoolProgram,
  });
  let rewardEntryAcc = await fetchRewardEntry({
    user,
    nft: nft,
    stakePool,
    rewardDistributor,
    stakePoolProgram,
    rewardDistributorProgram,
  });

  const totalStakeSeconds = stakeEntryAcc.totalStakeSeconds.add(
    stakeEntryAcc.amount.eq(new BN(0))
      ? new BN(0)
      : new BN(Date.now() / 1000).sub(stakeEntryAcc.lastUpdatedAt)
  );
  const rewardSecondsReceived = rewardEntryAcc.rewardSecondsReceived;
  const rewardDistributorAcc =
    await rewardDistributorProgram.account.rewardDistributor.fetch(
      rewardDistributor
    );
  let rewardAmountToReceive = totalStakeSeconds
    .sub(rewardSecondsReceived)
    .div(rewardDistributorAcc.rewardDurationSeconds)
    .mul(rewardDistributorAcc.rewardAmount)
    .mul(new BN(1))
    .div(new BN(10).pow(new BN(rewardDistributorAcc.multiplierDecimals)));

  return rewardAmountToReceive;
}

export async function readClaimedGoldPoints({
  user,
  goldMint = GOLD_MINT,
  soulboundProgram,
  rewardDistributorProgram,
}: {
  user: PublicKey;
  goldMint: PublicKey;
  soulboundProgram: Program<SoulBoundAuthority>;
  rewardDistributorProgram: Program<CardinalRewardDistributor>;
}): Promise<anchor.BN> {
  const scopedSbaUserAuthority = PublicKey.findProgramAddressSync(
    [
      Buffer.from("sba-scoped-user-program"),
      user.toBuffer(),
      rewardDistributorProgram.programId.toBuffer(),
    ],
    soulboundProgram.programId
  )[0];
  const userRewardMintTokenAccount = await getAssociatedTokenAddress(
    goldMint,
    scopedSbaUserAuthority,
    true
  );

  const claimedAmount = await (async () => {
    try {
      const rewardTokenAccount = await getAccount(
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

// Supply is the token supply of the nft mint.
function getStakeSeed(supply: number, user: PublicKey): PublicKey {
  if (supply > 1) {
    return user;
  } else {
    return PublicKey.default;
  }
}
