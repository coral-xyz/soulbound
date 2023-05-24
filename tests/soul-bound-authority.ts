import * as anchor from "@project-serum/anchor";
import { Program, Spl } from "@project-serum/anchor";
import { PublicKey, Keypair, SystemProgram } from "@solana/web3.js";
import { keypairIdentity, Metaplex } from "@metaplex-foundation/js";
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

const BN = anchor.BN;

//
// If this changes, we need to change it in the cardinal-reward-distributor
// state.rs file.
//
const ARMANI_AUTHORITY = new PublicKey(
  "F74rNS2dQmsCbVeW5iNgFUSWtdAPxJvJxwbrhieTyHLd"
);

//
// If these program ids ever change, make sure to change the Anchor.toml.
//
const CARDINAL_REWARD_DISTRIBUTOR_PROGRAM_ID = new PublicKey(
  "5drfC9jSUGEijRVuzQ4h6Uhk6J97kWpjMvaosVzApGEG"
);
const CARDINAL_STAKE_POOL_PROGRAM_ID = new PublicKey(
  "6zzCmDAzy4F9epMLS7vWbGv67fm8hBqGLZQwEZUYAd4J"
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

  //
  // Mint for the gold point system.
  //
  let goldMint: PublicKey;

  //
  // NFTs. These are the two mad lads for the tests.
  //
  let nftMintA: PublicKey;
  let nftMintB: PublicKey;

  //
  // Misc accounts used across tests.
  //
  let identifier: PublicKey;
  let stakePool: PublicKey;
  let rewardDistributor: PublicKey;

  it("Setup: creates the GOLD mint", async () => {
    const goldMintKeypair = Keypair.generate();
    goldMint = goldMintKeypair.publicKey;

    const goldMintAuthority = program.provider.publicKey;

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

  it("Setup: creates an nft", async () => {
    const nftA = await metaplex.nfts().create({
      name: "My Digital Collectible",
      sellerFeeBasisPoints: 0,
      uri: "https://arweave.net/my-content-hash",
      isMutable: true,
    });
    const nftB = await metaplex.nfts().create({
      name: "My Digital Collectible 2",
      sellerFeeBasisPoints: 0,
      uri: "https://arweave.net/my-content-hash2",
      isMutable: true,
    });
    nftMintA = nftA.mintAddress;
    nftMintB = nftB.mintAddress;
  });

  it("Creates a soul bound authority A", async () => {
    const [sba, bump] = PublicKey.findProgramAddressSync(
      [Buffer.from("sba"), nftMintA.toBuffer()],
      program.programId
    );
    await program.methods
      .createSba()
      .accounts({
        nftMint: nftMintA,
        sba,
      })
      .rpc();

    const sbaAccount = await program.account.soulBoundAuthority.fetch(sba);
    assert.equal(sbaAccount.bump, bump);
    assert.equal(sbaAccount.nftMint.toString(), nftMintA.toString());
  });

  it("Creates a soul bound authority B", async () => {
    const [sba, bump] = PublicKey.findProgramAddressSync(
      [Buffer.from("sba"), nftMintB.toBuffer()],
      program.programId
    );
    await program.methods
      .createSba()
      .accounts({
        nftMint: nftMintB,
        sba,
      })
      .rpc();

    const sbaAccount = await program.account.soulBoundAuthority.fetch(sba);
    assert.equal(sbaAccount.bump, bump);
    assert.equal(sbaAccount.nftMint.toString(), nftMintB.toString());
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
        requiresCollections: [
          new PublicKey("J1S9H3QjnRtBbbuD4HjPV6RpRhwuk4zKbxsnCHuTgh9w"),
        ],
        requiresCreators: [], // TODO: Is this needed?
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
      rewardDistributorProgram.programId,
    )[0];
    await rewardDistributorProgram.methods
      .initRewardDistributor({
        rewardAmount: new BN(1),
        rewardDurationSeconds: new BN(1),
        kind: 2, // Treasury (rather than Mint).
        supply: null,
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
      })
      .rpc();
  });

  it("Stakes an nft A", async () => {
    // todo
  });

  it("Stakes an nft B", async () => {
    // todo
  });

  it("Waits for time to pass to accrue reward", async () => {
    // todo
  });

  it("Claims a reward", async () => {
    // todo
  });

  it("Waits for time to pass to accrue rewards again", async () => {
    // todo
  });

  it("Transfers a reward from nft A to nft B", async () => {
    // todo
  });

  it("Claims a reward from nft B", async () => {
    // todo
  });

  it("Unstakes nft A", async () => {
    // todo
  });

  it("Unstakes nft B", async () => {
    // todo
  });
});
