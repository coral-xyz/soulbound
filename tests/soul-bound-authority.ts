import * as anchor from "@project-serum/anchor";
import { Program, Spl } from "@project-serum/anchor";
import { SystemProgram, PublicKey, Keypair } from "@solana/web3.js";
import { createAssociatedTokenAccount } from "@solana/spl-token";
import { SoulBoundAuthority } from "../target/types/soul_bound_authority";
import { assert } from "chai";

const BN = anchor.BN;

describe("soul-bound-authority", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.SoulBoundAuthority as Program<SoulBoundAuthority>;
	const token = Spl.token();
	let nftMint: PublicKey;

	it("Setup: creates mint", async () => {
		const nftMintKeypair = Keypair.generate();
		nftMint = nftMintKeypair.publicKey;

		const nftMintAuthority = program.provider.publicKey;

		await token
			.methods
			.initializeMint(1, nftMintAuthority, null)
			.accounts({
				mint: nftMint,
			})
			.signers([nftMintKeypair])
			.preInstructions([
				SystemProgram.createAccount({
					fromPubkey: program.provider.publicKey,
					newAccountPubkey: nftMint,
					lamports: await program.provider.connection.getMinimumBalanceForRentExemption(82),
					space: 82,
					programId: token.programId,
				}),
			])
			.rpc();
	});

	it("Setup: creates an associated token account", async () => {
		await createAssociatedTokenAccount(
			program.provider.connection,
			// @ts-ignore
			program.provider.wallet.payer,
			nftMint,
			program.provider.publicKey,
		);
	});

  it("Creates a soul bound authority", async () => {
		const [sba, bump] = PublicKey.findProgramAddressSync(
			[Buffer.from("sba"), nftMint.toBuffer()],
			program.programId,
		);
		await program
			.methods
			.createSba()
			.accounts({
				nftMint,
				sba,
			})
			.rpc();

		const sbaAccount = await program
			.account
			.soulBoundAuthority
			.fetch(sba);
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
