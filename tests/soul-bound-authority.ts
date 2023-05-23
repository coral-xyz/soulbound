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

  const program = anchor.workspace
    .SoulBoundAuthority as Program<SoulBoundAuthority>;
  const metaplex = new Metaplex(program.provider.connection).use(
    keypairIdentity(program.provider.wallet.payer)
  );
  const token = Spl.token();
  let nftMint: PublicKey;

  it("Setup: creates an nft", async () => {
    const nft = await metaplex.nfts().create({
      name: "My Digital Collectible",
      sellerFeeBasisPoints: 0,
      uri: "https://arweave.net/my-content-hash",
      isMutable: true,
    });
    nftMint = nft.mintAddress;
  });

  it("Creates a soul bound authority", async () => {
    const [sba, bump] = PublicKey.findProgramAddressSync(
      [Buffer.from("sba"), nftMint.toBuffer()],
      program.programId
    );
    await program.methods
      .createSba()
      .accounts({
        nftMint,
        sba,
      })
      .rpc();

    const sbaAccount = await program.account.soulBoundAuthority.fetch(sba);
    assert.equal(sbaAccount.bump, bump);
    assert.equal(sbaAccount.nftMint.toString(), nftMint.toString());
  });

  it("Stakes an nft", async () => {
    // todo
  });

  it("Claims a reward", async () => {
    // todo
  });
});
