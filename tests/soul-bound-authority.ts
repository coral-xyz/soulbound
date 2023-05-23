import * as anchor from "@project-serum/anchor";
import { Program, Spl } from "@project-serum/anchor";
import { SystemProgram, PublicKey, Keypair } from "@solana/web3.js";
import { createAssociatedTokenAccount } from "@solana/spl-token";
import {
  type CreateNftOutput,
  keypairIdentity,
  Metaplex,
} from "@metaplex-foundation/js";
import { SoulBoundAuthority } from "../target/types/soul_bound_authority";
import { assert } from "chai";

const BN = anchor.BN;

describe("soul-bound-authority", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  //
  // Program APIs.
  //
  const program = anchor.workspace
    .SoulBoundAuthority as Program<SoulBoundAuthority>;
  const metaplex = new Metaplex(program.provider.connection).use(
    keypairIdentity(program.provider.wallet.payer)
  );

  //
  // NFTs. These are the two mad lads for the tests.
  //
  let nftMintA: PublicKey;
  let nftMintB: PublicKey;

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
