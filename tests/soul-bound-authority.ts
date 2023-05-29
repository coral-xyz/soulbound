import * as anchor from "@project-serum/anchor";
import { Program, Spl } from "@project-serum/anchor";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  mintTo,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
} from "@solana/spl-token";
import {
  sendAndConfirmTransaction,
  Transaction,
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
import { TokenStandard } from "@metaplex-foundation/mpl-token-metadata";
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

  it("Setup: mints the gold to a system-program owned treasury account", async () => {
    await createAssociatedTokenAccount(
      program.provider.connection, // conection
      program.provider.wallet.payer, // payer
      goldMint, // mint
      ARMANI_AUTHORITY // owner of ata
    );

    const goldAta = await anchor.utils.token.associatedAddress({
      mint: goldMint,
      owner: ARMANI_AUTHORITY,
    });
    await token.methods
      .mintTo(new BN(10000))
      .accounts({
        mint: goldMint,
        to: goldAta,
        authority: ARMANI_AUTHORITY,
      })
      .rpc();
  });

  it("Setup: creates an nft", async () => {
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

    /*
    await metaplex.nfts().verifyCollection({
      mintAddress: nftA.mintAddress,
      collectionMintAddress: collection.mintAddress,
    });
    await metaplex.nfts().verifyCollection({
      mintAddress: nftB.mintAddress,
      collectionMintAddress: collection.mintAddress,
    });
		*/

    const ata = await anchor.utils.token.associatedAddress({
      mint: nftA.mintAddress,
      owner: program.provider.publicKey,
    });

    const n = await metaplex.nfts().findByMint({
      mintAddress: nftA.mintAddress,
    });

    const n2 = await metaplex.nfts().findByToken({
      token: ata,
    });

    //    console.log("ARMANI NFT A", n, n2);
  });

  it("Creates a soul bound authority A", async () => {
    const [_sba, bump] = PublicKey.findProgramAddressSync(
      [Buffer.from("sba"), nftA.mintAddress.toBuffer()],
      program.programId
    );
    sba = _sba;
    await program.methods
      .createSba()
      .accounts({
        nftMint: nftA.mintAddress,
        sba,
      })
      .rpc();

    const sbaAccount = await program.account.soulBoundAuthority.fetch(sba);
    assert.equal(sbaAccount.bump, bump);
    assert.equal(sbaAccount.nftMint.toString(), nftA.mintAddress.toString());
  });

  it("Creates a soul bound authority B", async () => {
    const [sba, bump] = PublicKey.findProgramAddressSync(
      [Buffer.from("sba"), nftB.mintAddress.toBuffer()],
      program.programId
    );
    await program.methods
      .createSba()
      .accounts({
        nftMint: nftB.mintAddress,
        sba,
      })
      .rpc();

    const sbaAccount = await program.account.soulBoundAuthority.fetch(sba);
    assert.equal(sbaAccount.bump, bump);
    assert.equal(sbaAccount.nftMint.toString(), nftB.mintAddress.toString());
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
          //          new PublicKey("J1S9H3QjnRtBbbuD4HjPV6RpRhwuk4zKbxsnCHuTgh9w"),
          collection.mintAddress,
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
    const stakePoolA = await stakePoolProgram.account.stakePool.fetch(
      stakePool
    );
    //    console.log("HERE", stakePoolA);
  });

  it("Initializes a reward distributor", async () => {
    rewardDistributor = PublicKey.findProgramAddressSync(
      [Buffer.from("reward-distributor"), stakePool.toBuffer()],
      rewardDistributorProgram.programId
    )[0];
    const goldAta = await anchor.utils.token.associatedAddress({
      mint: goldMint,
      owner: ARMANI_AUTHORITY,
    });
    const rewardDistributorAta = await createAssociatedTokenAccount(
      program.provider.connection, // conection
      program.provider.wallet.payer, // payer
      goldMint, // mint
      rewardDistributor // owner of ata
    );

    await rewardDistributorProgram.methods
      .initRewardDistributor({
        rewardAmount: new BN(1), // TODO
        rewardDurationSeconds: new BN(1), // TODO
        kind: 2, // Treasury (rather than Mint).
        supply: new BN(1), // TODO
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
      .remainingAccounts([
        {
          isWritable: true,
          isSigner: false,
          pubkey: rewardDistributorAta, // reward distributor token account
        },
        {
          isWritable: true,
          isSigner: false,
          pubkey: goldAta, // authority token account
        },
      ])
      .rpc();
  });

  it("Stakes an nft A", async () => {
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

//
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

//

// Supply is the token supply of the nft mint.
function getStakeSeed(supply: number, user: PublicKey): PublicKey {
  if (supply > 1) {
    return user;
  } else {
    return PublicKey.default;
  }
}
/*
			.remainingAccounts([
				{
					isSigner: false,
					isWritable: false,
					pubkey: stakeEntryAuthorizationRecord,
				}
			])}
		const stakeEntryAuthorizationRecord = PublicKey.findProgramAddressSync(
			[
				Buffer.from("stake-authorization"),
				stakePool.toBuffer(),
				nftA.mintAddress.toBuffer(),
			],
			stakePoolProgram.programId,
		)[0];
*/
