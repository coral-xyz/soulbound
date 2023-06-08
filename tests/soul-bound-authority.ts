import * as anchor from "@project-serum/anchor";
import { Program, Spl } from "@project-serum/anchor";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
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
import {
  stake,
  unstake,
  claimReward,
  readUnclaimedGoldPoints,
  readClaimedGoldPoints,
  transferRewards,
  CARDINAL_REWARD_DISTRIBUTOR_PROGRAM_ID,
  CARDINAL_STAKE_POOL_PROGRAM_ID,
  AUTHORIZATION_RULES,
  ARMANI_AUTHORITY,
} from "./utils";

const BN = anchor.BN;

const USE_BACKPACK_DEV_MAINNET_NFTS = false;

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

    console.log("ARMANI GOLD MINT", goldMint.toString());

    await token.methods
      .initializeMint(1, program.provider.publicKey, null)
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
    console.log("IDENTIFIER", identifier.toString());
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
    console.log("STAKE POOL", stakePool.toString());
    await stakePoolProgram.methods
      .initPool({
        overlayText: "Fock it.",
        imageUri: "https://www.madlads.com/mad_lads_logo.svg",
        requiresCollections: [collection.mintAddress],
        requiresCreators: [],
        requiresAuthorization: false,
        authority: SystemProgram.programId,
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
    console.log("REWARD DISTRIBUTOR", rewardDistributor.toString());
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
        payer: program.provider.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
  });

  it("Stakes an nft A", async () => {
    await stake({
      user: program.provider.publicKey,
      nft: nftA,
      stakePool,
      rewardDistributor,
      stakePoolProgram,
      rewardDistributorProgram,
    });
  });

  it("Stakes an nft B", async () => {
    await stake({
      user: program.provider.publicKey,
      nft: nftB,
      stakePool,
      rewardDistributor,
      stakePoolProgram,
      rewardDistributorProgram,
    });
  });

  it("Waits for time to pass to accrue reward", async () => {
    await passTime();
  });

  it("Claims a reward for nft a", async () => {
    await claimReward({
      user: program.provider.publicKey,
      nft: nftA,
      stakePool,
      rewardDistributor,
      goldMint,
      soulboundProgram: program,
      stakePoolProgram,
      rewardDistributorProgram,
    });
  });

  it("Claims a reward from nft B", async () => {
    await claimReward({
      user: program.provider.publicKey,
      nft: nftB,
      stakePool,
      rewardDistributor,
      goldMint,
      soulboundProgram: program,
      stakePoolProgram,
      rewardDistributorProgram,
    });
  });

  it("Waits for time to pass to accrue reward", async () => {
    await passTime();
  });

  it("Transfers rewards", async () => {
    await transferRewards({
      amount: new BN(6),
      fromUser: program.provider.publicKey,
      fromNft: nftA,
      toNft: nftB,
      goldMint,
      stakePool,
      rewardDistributor,
      soulboundProgram: program,
      stakePoolProgram,
      rewardDistributorProgram,
    });
  });

  it("Waits for time to pass to accrue reward", async () => {
    await passTime();
  });

  it("Unstakes nft A", async () => {
    await unstake({
      user: program.provider.publicKey,
      nft: nftA,
      stakePool,
      stakePoolProgram,
    });
  });

  it("Unstakes nft B", async () => {
    await unstake({
      user: program.provider.publicKey,
      nft: nftB,
      stakePool,
      stakePoolProgram,
    });
  });

  it("Waits for time to pass to accrue reward", async () => {
    await passTime();
  });

  const passTime = async () => {
    const unclaimedPointsBefore_A = await readUnclaimedGoldPoints({
      user: program.provider.publicKey,
      nft: nftA,
      stakePool,
      rewardDistributor,
      stakePoolProgram,
      rewardDistributorProgram,
    });
    const claimedPointsBefore_A = await readClaimedGoldPoints({
      user: program.provider.publicKey,
      nft: nftA,
      goldMint,
      soulboundProgram: program,
      rewardDistributorProgram,
    });
    const unclaimedPointsBefore_B = await readUnclaimedGoldPoints({
      user: program.provider.publicKey,
      nft: nftB,
      stakePool,
      rewardDistributor,
      stakePoolProgram,
      rewardDistributorProgram,
    });
    const claimedPointsBefore_B = await readClaimedGoldPoints({
      user: program.provider.publicKey,
      nft: nftB,
      goldMint,
      soulboundProgram: program,
      rewardDistributorProgram,
    });
    console.log(
      "A BEFORE:",
      unclaimedPointsBefore_A.toString(),
      claimedPointsBefore_A.toString()
    );
    console.log(
      "B BEFORE:",
      unclaimedPointsBefore_B.toString(),
      claimedPointsBefore_B.toString()
    );
    await sleep(10 * 1000);
    const unclaimedPointsAfter_A = await readUnclaimedGoldPoints({
      user: program.provider.publicKey,
      nft: nftA,
      stakePool,
      rewardDistributor,
      stakePoolProgram,
      rewardDistributorProgram,
    });
    const claimedPointsAfter_A = await readClaimedGoldPoints({
      user: program.provider.publicKey,
      nft: nftA,
      goldMint,
      soulboundProgram: program,
      rewardDistributorProgram,
    });
    const unclaimedPointsAfter_B = await readUnclaimedGoldPoints({
      user: program.provider.publicKey,
      nft: nftB,
      stakePool,
      rewardDistributor,
      stakePoolProgram,
      rewardDistributorProgram,
    });
    const claimedPointsAfter_B = await readClaimedGoldPoints({
      user: program.provider.publicKey,
      nft: nftB,
      goldMint,
      soulboundProgram: program,
      rewardDistributorProgram,
    });
    console.log(
      "A AFTER:",
      unclaimedPointsAfter_A.toString(),
      claimedPointsAfter_A.toString()
    );
    console.log(
      "B AFTER:",
      unclaimedPointsAfter_B.toString(),
      claimedPointsAfter_B.toString()
    );
  };
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

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
