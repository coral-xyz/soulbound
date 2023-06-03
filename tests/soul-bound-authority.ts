import * as anchor from "@project-serum/anchor";
import { Program, Spl } from "@project-serum/anchor";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  getAccount,
} from "@solana/spl-token";
import {
  sendAndConfirmTransaction,
  Transaction,
  TransactionInstruction,
  Connection,
  Signer,
  ConfirmOptions,
  PublicKey,
  Keypair,
  SystemProgram,
  ComputeBudgetProgram,
  SYSVAR_INSTRUCTIONS_PUBKEY,
} from "@solana/web3.js";
import { keypairIdentity, Metaplex } from "@metaplex-foundation/js";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import {
  keypairIdentity as umiKeypairIdentity,
  publicKey,
} from "@metaplex-foundation/umi";
import {
  verifyCollectionV1,
  TokenStandard,
} from "@metaplex-foundation/mpl-token-metadata";
import { SoulBoundAuthority } from "../target/types/soul_bound_authority";
import {
  IDL as CardinalRewardDistributorIdl,
  CardinalRewardDistributor,
} from "../deps/cardinal-staking/target/types/cardinal_reward_distributor";
import {
  IDL as CardinalStakePoolIdl,
  CardinalStakePool,
} from "../deps/cardinal-staking/target/types/cardinal_stake_pool";
import { assert } from "chai";
import { rewardDistributor } from "../deps/cardinal-staking/src";

const BN = anchor.BN;

//
// If these program ids ever change, make sure to change the Anchor.toml.
//
const CARDINAL_REWARD_DISTRIBUTOR_PROGRAM_ID = new PublicKey(
  "rwdNPNPS6zNvtF6FMvaxPRjzu2eC51mXaDT9rmWsojp"
);
const CARDINAL_STAKE_POOL_PROGRAM_ID = new PublicKey(
  "stkBL96RZkjY5ine4TvPihGqW8UHJfch2cokjAPzV8i"
);
const TOKEN_METADATA_PROGRAM_ID = new PublicKey(
  "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"
);

//
// Misc programs.
//
const AUTHORIZATION_RULES_PROGRAM_ID = new PublicKey(
  "auth9SigNpDKz4sJJ1DfCTuZrZNSAgh9sFD3rboVmgg"
);
const AUTHORIZATION_RULES = new PublicKey(
  "eBJLFYPxJmMGKuFwpDWkzxZeUrad92kZRC5BJLpzyT9"
);

const USE_BACKPACK_DEV_MAINNET_NFTS = false;

//
// If this changes, we need to change it in the cardinal-reward-distributor
// state.rs file.
//
const ARMANI_AUTHORITY = new PublicKey(
  //  "F74rNS2dQmsCbVeW5iNgFUSWtdAPxJvJxwbrhieTyHLd"
  "EcxjN4mea6Ah9WSqZhLtSJJCZcxY73Vaz6UVHFZZ5Ttz"
);

describe("soul-bound-authority", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  //
  // Program APIs.
  //
  const program = anchor.workspace
    .SoulBoundAuthority as Program<SoulBoundAuthority>;
  const rewardDistributorProgram = new Program<CardinalRewardDistributor>(
    CardinalRewardDistributorIdl,
    CARDINAL_REWARD_DISTRIBUTOR_PROGRAM_ID
  );
  const stakePoolProgram = new Program<CardinalStakePool>(
    CardinalStakePoolIdl,
    CARDINAL_STAKE_POOL_PROGRAM_ID
  );
  const token = Spl.token();
  const metaplex = new Metaplex(program.provider.connection).use(
    keypairIdentity(program.provider.wallet.payer)
  );

  // @ts-ignore
  const umi = createUmi(program.provider.connection._rpcEndpoint).use(
    umiKeypairIdentity(program.provider.wallet.payer)
  );

  //
  // Mint for the gold point system.
  //
  let goldMint: PublicKey;

  //
  // NFTs. These are the two mad lads for the tests.
  //
  let nftA: {
    mintAddress: PublicKey;
    masterEditionAddress: PublicKey;
    metadataAddress: PublicKey;
  };
  let nftB: {
    mintAddress: PublicKey;
    masterEditionAddress: PublicKey;
    metadataAddress: PublicKey;
  };
  let collection: {
    mintAddress: PublicKey;
    masterEditionAddress: PublicKey;
    metadataAddress: PublicKey;
  };

  //
  // Misc accounts used across tests.
  //
  let sba: PublicKey; // Soulbound Authority.
  let identifier: PublicKey;
  let stakePool: PublicKey;
  let rewardDistributor: PublicKey;

  it("Setup: creates the gold mint", async () => {
    const goldMintKeypair = Keypair.generate();
    goldMint = goldMintKeypair.publicKey;

    const goldMintAuthority = ARMANI_AUTHORITY;

    await token.methods
      .initializeMint(1, goldMintAuthority, null)
      .accounts({
        mint: goldMint,
      })
      .signers([goldMintKeypair])
      .preInstructions([
        SystemProgram.createAccount({
          fromPubkey: program.provider.publicKey,
          newAccountPubkey: goldMint,
          lamports:
            await program.provider.connection.getMinimumBalanceForRentExemption(
              82
            ),
          space: 82,
          programId: token.programId,
        }),
      ])
      .rpc();
  });

  it("Setup: creates two nfts, verified as part of the same collection", async () => {
    if (USE_BACKPACK_DEV_MAINNET_NFTS) {
      collection = {
        mintAddress: new PublicKey(
          "J1S9H3QjnRtBbbuD4HjPV6RpRhwuk4zKbxsnCHuTgh9w"
        ),
        masterEditionAddress: new PublicKey(
          "2G5CotQ6Q87yhZxKUWkwLY6Foi12Q3VFQ6KN4nTLbPSz"
        ),
        metadataAddress: new PublicKey(
          "8KyuwGzav7jTW9YaBGj2Qtp2q24zPUR3rD5caojXaby4"
        ),
      };
      nftA = {
        mintAddress: new PublicKey(
          "3yYLEY3gPNHskKfyDZk3JRbDh7uSi1MKB3ffS9GEZXUJ"
        ),
        masterEditionAddress: new PublicKey(
          "5V4QUvLjtPfX8tjQncxw8UtPRxh9WHrAE5nVeuPxPvUz"
        ),
        metadataAddress: new PublicKey(
          "CXxbKaC8FmdUrr32AhD2W6G9FgNBN8w2sPWwVuU2JwZV"
        ),
      };
      nftB = {
        mintAddress: new PublicKey(
          "4B18U9PqtKFEwsHnZECyRewmh4zrFUo1Pxyf3Lwf1EMq"
        ),
        masterEditionAddress: new PublicKey(
          "DwSMnFDJgUsDUwQXeC6Nd6NiUK1xkUfTzgAv7iB9LNFa"
        ),
        metadataAddress: new PublicKey(
          "YUrTVSrA3FUJF5bF4awASUjd7nvvg9jv5urGitBxbPn"
        ),
      };
      return;
    }

    collection = await metaplex.nfts().create({
      name: "Mad Lads Collection Test",
      sellerFeeBasisPoints: 0,
      uri: "https://arweave.net/my-content-hash2",
      isCollection: true,
    });
    nftA = await metaplex.nfts().create({
      name: "My Digital Collectible",
      sellerFeeBasisPoints: 0,
      uri: "https://arweave.net/my-content-hash",
      isMutable: true,
      collection: collection.mintAddress,
      tokenStandard: TokenStandard.ProgrammableNonFungible,
      ruleSet: AUTHORIZATION_RULES,
    });
    nftB = await metaplex.nfts().create({
      name: "My Digital Collectible 2",
      sellerFeeBasisPoints: 0,
      uri: "https://arweave.net/my-content-hash2",
      isMutable: true,
      collection: collection.mintAddress,
      tokenStandard: TokenStandard.ProgrammableNonFungible,
      ruleSet: AUTHORIZATION_RULES,
    });

    //
    // Verify nftA.
    //
    await (async () => {
      const ix = verifyCollectionV1(umi, {
        metadata: publicKey(nftA.metadataAddress.toString()),
        collectionMint: publicKey(collection.mintAddress.toString()),
      }).items[0].instruction;
      //
      // Total hack because I don't know wtf this metaplex API is doing.
      //
      const keys = ix.keys
        .slice(0, 1)
        .map((i) => ({ ...i, pubkey: new PublicKey(i.pubkey.toString()) }))
        .concat(
          ix.keys.slice(1).map((i) => ({
            ...i,
            pubkey: new PublicKey(i.pubkey.bytes),
          }))
        );
      const data = Buffer.from(ix.data);
      const programId = new PublicKey(ix.programId.bytes);
      const tx = new Transaction().add(
        new TransactionInstruction({
          keys,
          data,
          programId,
        })
      );
      await program.provider.sendAndConfirm(tx);
    })();

    //
    // Verify nftB.
    //
    await (async () => {
      const ix = verifyCollectionV1(umi, {
        metadata: publicKey(nftB.metadataAddress.toString()),
        collectionMint: publicKey(collection.mintAddress.toString()),
      }).items[0].instruction;
      //
      // Total hack because I don't know wtf this metaplex API is doing.
      //
      const keys = ix.keys
        .slice(0, 1)
        .map((i) => ({ ...i, pubkey: new PublicKey(i.pubkey.toString()) }))
        .concat(
          ix.keys.slice(1).map((i) => ({
            ...i,
            pubkey: new PublicKey(i.pubkey.bytes),
          }))
        );
      const data = Buffer.from(ix.data);
      const programId = new PublicKey(ix.programId.bytes);
      const tx = new Transaction().add(
        new TransactionInstruction({
          keys,
          data,
          programId,
        })
      );
      await program.provider.sendAndConfirm(tx);
    })();
  });

  it("Creates a soul bound authority for the user", async () => {
    const [_sba, bump] = PublicKey.findProgramAddressSync(
      [Buffer.from("sba-scoped-user"), program.provider.publicKey.toBuffer()],
      program.programId
    );
    sba = _sba;
    await program.methods
      .createSbaUser()
      .accounts({
        sba,
      })
      .rpc();

    const sbaAccount = await program.account.soulBoundAuthorityUser.fetch(sba);
    assert.equal(sbaAccount.bump, bump);
    assert.equal(
      sbaAccount.authority.toString(),
      program.provider.publicKey.toString()
    );
    assert.equal(sbaAccount.delegate.toString(), PublicKey.default.toString());
  });

  it("Initializes a stake identifier", async () => {
    identifier = PublicKey.findProgramAddressSync(
      [Buffer.from("identifier")],
      stakePoolProgram.programId
    )[0];
    await stakePoolProgram.methods
      .initIdentifier()
      .accounts({
        identifier,
      })
      .rpc();
  });

  it("Initializes a stake pool", async () => {
    stakePool = PublicKey.findProgramAddressSync(
      [
        Buffer.from("stake-pool"),
        // 1u64 as little endian.
        // The "identifier.count" in the program account starts as this.
        Buffer.from([1, 0, 0, 0, 0, 0, 0, 0]),
      ],
      stakePoolProgram.programId
    )[0];
    await stakePoolProgram.methods
      .initPool({
        overlayText: "Fock it.",
        imageUri: "https://www.madlads.com/mad_lads_logo.svg",
        requiresCollections: [collection.mintAddress],
        requiresCreators: [],
        requiresAuthorization: true,
        authority: program.provider.publicKey, // TODO: What is this?
        resetOnStake: false,
        cooldownSeconds: null,
        minStakeSeconds: null,
        endDate: null,
        doubleOrResetEnabled: false,
      })
      .accounts({
        stakePool,
        identifier,
      })
      .rpc();
  });

  it("Initializes a reward distributor", async () => {
    rewardDistributor = PublicKey.findProgramAddressSync(
      [Buffer.from("reward-distributor"), stakePool.toBuffer()],
      rewardDistributorProgram.programId
    )[0];
    await rewardDistributorProgram.methods
      .initRewardDistributor({
        rewardAmount: new BN(1), // Amount of rewards received every timestep.
        rewardDurationSeconds: new BN(1), // Timestep for each reward.
        kind: 1, // Mint (rather than Treasury).
        supply: new BN(0), // Not used.
        maxSupply: null,
        defaultMultiplier: null,
        multiplierDecimals: null,
        maxRewardSecondsReceived: null,
      })
      .accounts({
        rewardDistributor,
        stakePool,
        rewardMint: goldMint,
        authority: ARMANI_AUTHORITY,
        payer: ARMANI_AUTHORITY,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
  });

  const stake = async (nftA: {
    mintAddress: PublicKey;
    masterEditionAddress: PublicKey;
    metadataAddress: PublicKey;
  }) => {
    const user = program.provider.publicKey;
    const stakeEntry = PublicKey.findProgramAddressSync(
      [
        Buffer.from("stake-entry"),
        stakePool.toBuffer(),
        nftA.mintAddress.toBuffer(),
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
      mint: nftA.mintAddress,
      owner: user,
    });
    const tokenRecord = PublicKey.findProgramAddressSync(
      [
        Buffer.from("metadata"),
        TOKEN_METADATA_PROGRAM_ID.toBuffer(),
        nftA.mintAddress.toBuffer(),
        Buffer.from("token_record"),
        ata.toBuffer(),
      ],
      TOKEN_METADATA_PROGRAM_ID
    )[0];
    await stakePoolProgram.methods
      .stakeProgrammable(new BN(1))
      .accounts({
        stakeEntry,
        rewardEntry,
        rewardDistributor,
        stakePool,
        originalMint: nftA.mintAddress,
        user,
        userOriginalMintTokenAccount: ata,
        userOriginalMintTokenRecord: tokenRecord,
        mintMetadata: nftA.metadataAddress,
        mintEdition: nftA.masterEditionAddress,
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
  };

  it("Stakes an nft A", async () => {
    await stake(nftA);
  });

  it("Stakes an nft B", async () => {
    await stake(nftB);
  });

  const fetchStakeEntry = async (nftA) => {
    const user = program.provider.publicKey;
    const stakeEntry = PublicKey.findProgramAddressSync(
      [
        Buffer.from("stake-entry"),
        stakePool.toBuffer(),
        nftA.mintAddress.toBuffer(),
        getStakeSeed(1, user).toBuffer(),
      ],
      stakePoolProgram.programId
    )[0];
    return await stakePoolProgram.account.stakeEntry.fetch(stakeEntry);
  };

  const fetchRewardEntry = async (nftA) => {
    const user = program.provider.publicKey;
    const stakeEntry = PublicKey.findProgramAddressSync(
      [
        Buffer.from("stake-entry"),
        stakePool.toBuffer(),
        nftA.mintAddress.toBuffer(),
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

  it("Waits for time to pass to accrue reward", async () => {
    const pointsBefore = await readGoldPoints(nftA);
    console.log("ARMANI BEFORE", pointsBefore.toString());
    await sleep(10 * 1000);
    const pointsAfter = await readGoldPoints(nftA);
    console.log("ARMANI AFTER", pointsAfter.toString());
  });

  //
  // Gold points are calculated with two components
  //
  // - the amount sitting in the on chain account (these are soul bound
  //   and unspendable and arrive only via the claim instruction)
  // - the amount unclaimed and so must be calculated
  //
  const readGoldPoints = async (nftA: {
    mintAddress: PublicKey;
    masterEditionAddress: PublicKey;
    metadataAddress: PublicKey;
  }) => {
    const user = program.provider.publicKey;
    const scopedSbaUserAuthority = PublicKey.findProgramAddressSync(
      [
        Buffer.from("sba-scoped-user-program"),
        user.toBuffer(),
        rewardDistributorProgram.programId.toBuffer(),
      ],
      program.programId
    )[0];
    const userRewardMintTokenAccount = await getAssociatedTokenAddress(
      goldMint,
      scopedSbaUserAuthority,
      true
    );

    const claimedAmount = await (async () => {
      try {
        const rewardTokenAccount = await getAccount(
          program.provider.connection,
          userRewardMintTokenAccount
        );
        return new BN(rewardTokenAccount.amount.toString());
      } catch {
        return new BN(0);
      }
    })();

    let stakeEntryAcc = await fetchStakeEntry(nftA);
    let rewardEntryAcc = await fetchRewardEntry(nftA);

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

    return claimedAmount.add(rewardAmountToReceive);
  };

  const claimReward = async (nftA) => {
    const user = program.provider.publicKey;
    const [sbaUser] = PublicKey.findProgramAddressSync(
      [Buffer.from("sba-scoped-user"), user.toBuffer()],
      program.programId
    );
    const scopedSbaUserAuthority = PublicKey.findProgramAddressSync(
      [
        Buffer.from("sba-scoped-user-program"),
        user.toBuffer(),
        rewardDistributorProgram.programId.toBuffer(),
      ],
      program.programId
    )[0];
    const stakeEntry = PublicKey.findProgramAddressSync(
      [
        Buffer.from("stake-entry"),
        stakePool.toBuffer(),
        nftA.mintAddress.toBuffer(),
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
        originalMint: nftA.mintAddress,
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

    await program.methods
      .executeTxScopedUserProgram(data)
      .accounts({
        sbaUser,
        authority: user,
        delegate: SystemProgram.programId, // TODO: need to fix this.
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
            lastStaker: program.provider.publicKey,
          })
          .instruction(),
      ])
      .rpc({
        skipPreflight: true,
      });
  };

  it("Claims a reward for nft a", async () => {
    await claimReward(nftA);
  });

  it("Claims a reward from nft B", async () => {
    await claimReward(nftB);
  });

  const unstake = async (nftA: {
    mintAddress: PublicKey;
    masterEditionAddress: PublicKey;
    metadataAddress: PublicKey;
  }) => {
    const user = program.provider.publicKey;
    const stakeEntry = PublicKey.findProgramAddressSync(
      [
        Buffer.from("stake-entry"),
        stakePool.toBuffer(),
        nftA.mintAddress.toBuffer(),
        getStakeSeed(1, user).toBuffer(),
      ],
      stakePoolProgram.programId
    )[0];
    const ata = await anchor.utils.token.associatedAddress({
      mint: nftA.mintAddress,
      owner: user,
    });
    const tokenRecord = PublicKey.findProgramAddressSync(
      [
        Buffer.from("metadata"),
        TOKEN_METADATA_PROGRAM_ID.toBuffer(),
        nftA.mintAddress.toBuffer(),
        Buffer.from("token_record"),
        ata.toBuffer(),
      ],
      TOKEN_METADATA_PROGRAM_ID
    )[0];
    await stakePoolProgram.methods
      .unstakeProgrammable()
      .accounts({
        stakeEntry,
        stakePool,
        originalMint: nftA.mintAddress,
        user,
        userOriginalMintTokenAccount: ata,
        userOriginalMintTokenRecord: tokenRecord,
        mintMetadata: nftA.metadataAddress,
        mintEdition: nftA.masterEditionAddress,
        authorizationRules: AUTHORIZATION_RULES,
        sysvarInstructions: SYSVAR_INSTRUCTIONS_PUBKEY,
        tokenProgram: TOKEN_PROGRAM_ID,
        tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
        authorizationRulesProgram: AUTHORIZATION_RULES_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
  };

  it("Unstakes nft A", async () => {
    await unstake(nftA);
  });

  it("Unstakes nft B", async () => {
    await unstake(nftB);
  });

  it("Waits for time to pass to accrue reward", async () => {
    const pointsBefore = await readGoldPoints(nftA);
    console.log("ARMANI BEFORE", pointsBefore.toString());
    await sleep(10 * 1000);
    const pointsAfter = await readGoldPoints(nftA);
    console.log("ARMANI AFTER", pointsAfter.toString());
  });
});

export async function createAssociatedTokenAccount(
  connection: Connection,
  payer: Signer,
  mint: PublicKey,
  owner: PublicKey,
  confirmOptions?: ConfirmOptions,
  programId = TOKEN_PROGRAM_ID,
  associatedTokenProgramId = ASSOCIATED_TOKEN_PROGRAM_ID
): Promise<PublicKey> {
  const associatedToken = await getAssociatedTokenAddress(
    mint,
    owner,
    true,
    programId,
    associatedTokenProgramId
  );

  const transaction = new Transaction().add(
    createAssociatedTokenAccountInstruction(
      payer.publicKey,
      associatedToken,
      owner,
      mint,
      programId,
      associatedTokenProgramId
    )
  );

  await sendAndConfirmTransaction(
    connection,
    transaction,
    [payer],
    confirmOptions
  );

  return associatedToken;
}

// Supply is the token supply of the nft mint.
function getStakeSeed(supply: number, user: PublicKey): PublicKey {
  if (supply > 1) {
    return user;
  } else {
    return PublicKey.default;
  }
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
