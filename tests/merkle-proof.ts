import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import { MerkleProof } from "../target/types/merkle_proof";
import { Counter } from "../target/types/counter";
import {SystemProgram, Transaction, LAMPORTS_PER_SOL, Connection, clusterApiUrl} from "@solana/web3.js";
import {MerkleTree} from "merkletreejs";
import "keccak256";
import keccak256 from "keccak256";

describe("merkle-proof", () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env()
  anchor.setProvider(provider);
  const wallet = provider.wallet;
  const program = anchor.workspace.MerkleProof as Program<MerkleProof>;
  const counterProgram = anchor.workspace.Counter as Program<Counter>;
  const connection = new Connection(clusterApiUrl("devnet"), "confirmed");

  //TODO: The owner/creator of the whitelist must set accounts that can access update root
  //      Access bundlr for whitelist

  var pubkeys = [];
  var keypairs = [];

  // Set up whitelist with random pubkeys.
  //TODO: within the actual app this is to be replaced with a form that takes
  //      the pubkeys as input and then parses the input
  for (var i = 0; i < 1; i++){
    var keypair = (new anchor.web3.Keypair);
    keypairs[i] = keypair;
    pubkeys[i] = (keypair.publicKey._bn).toBuffer();
  }

  var leaves = pubkeys.map(addr => keccak256(addr));
  var merkleTree = new MerkleTree(leaves, keccak256, {sortPairs: true});
  var rootHash = merkleTree.getRoot();

  var pubkey = pubkeys[0];
  var hashedPubkey = keccak256(pubkey);
  var proof = merkleTree.getProof(hashedPubkey);
  var proofBufferVector = [];

  for (var index in proof){
    proofBufferVector.push((proof[index].data));
  }

  let v = merkleTree.verify(proof, hashedPubkey, rootHash)
  console.log(v)

/* dont need to initialize it
  it("Is initialized!", async () => {

    const [root, _] =
    await anchor.web3.PublicKey.findProgramAddress(
      [wallet.publicKey.toBytes()],
      program.programId
    );

    console.log("b4", await connection.getBalance(wallet.publicKey));
    const tx = await program.methods.initialize(_, rootHash).accounts({
      authority: wallet.publicKey,
      root: root,
      systemProgram: SystemProgram.programId,
    }).rpc();
    console.log("Your transaction signature", tx);
    console.log(await program.account.root.fetch(root))
  });
*/

  it("change root", async () => {
    const [root, rootBump] =
    await anchor.web3.PublicKey.findProgramAddress(
      [wallet.publicKey.toBytes()],
      program.programId
    );

    console.log("wallet pubkey", wallet.publicKey);

    const tx = await program.methods.updateRoot(rootHash)
      .accounts({
        authority: wallet.publicKey,
        root: root,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

  });

  it("verify account is in whitelist", async () => {

    const [root, rootBump] =
    await anchor.web3.PublicKey.findProgramAddress(
      [wallet.publicKey.toBytes()],
      program.programId
    );

    //Seed signer with SOL. (loop should possibly begin here)
    const transferParams = {
      fromPubkey: wallet.publicKey,
      lamports: .04 * LAMPORTS_PER_SOL,
      toPubkey: keypairs[0].publicKey,
    }
    
    let createTx = new Transaction().add(SystemProgram.transfer(transferParams));
    let signature = await provider.sendAndConfirm(createTx);
    console.log("transfer tokens to test pubkey", signature)

    const tx = await program.methods.checkInclusion(proofBufferVector)
      .accounts({
        authority: wallet.publicKey,
        root: root,
        user: keypairs[0].publicKey,
        //systemProgram: SystemProgram.programId,
      })
      .signers([keypairs[0]])
      .rpc();
      console.log("Your transaction signature", tx);
      console.log(await program.account.root.fetch(root));

      //TODO: run thru loop of keys in wl
  });

  it("counter", async () => {
    const [counter, _counterBump] =
    await anchor.web3.PublicKey.findProgramAddress(
      [wallet.publicKey.toBytes()],
      counterProgram.programId
    );

    let counterDisplay = await counterProgram.account.counter.fetch(counter);
    console.log("Your counter", counterDisplay);

    /*const tx1 = await counterProgram.methods
      .createCounter()
      .accounts({
        authority: wallet.publicKey,
        counter: counter,
        systemProgram: SystemProgram.programId,})
      .rpc();
      console.log("test");*/

    const [root, rootBump] =
    await anchor.web3.PublicKey.findProgramAddress(
      [wallet.publicKey.toBytes()],
      program.programId
    ); 

    const tx = await counterProgram.methods.updateCounter(_counterBump, proofBufferVector)
      .accounts({
        counter: counter,
        root: root,
        authority: wallet.publicKey,
        user: keypairs[0].publicKey,
        merkleProof: program.programId,
        //systemProgram: SystemProgram.programId,
      })
      .signers([keypairs[0]])
      .rpc();
      console.log("update counter signature", tx);

    counterDisplay = await counterProgram.account.counter.fetch(counter);
    console.log("Your counter", counterDisplay);
  });

  it("verify account is not in whitelist", async () => {
    var unverifiedKeypair = (new anchor.web3.Keypair);

    const [counter, _counterBump] =
    await anchor.web3.PublicKey.findProgramAddress(
      [wallet.publicKey.toBytes()],
      counterProgram.programId
    );

    let counterDisplay = await counterProgram.account.counter.fetch(counter);
    console.log("Your counter", counterDisplay);

    const [root, rootBump] =
    await anchor.web3.PublicKey.findProgramAddress(
      [wallet.publicKey.toBytes()],
      program.programId
    ); 

    const tx = await counterProgram.methods.updateCounter(_counterBump, proofBufferVector)
      .accounts({
        counter: counter,
        root: root,
        authority: wallet.publicKey,
        user: unverifiedKeypair.publicKey,
        merkleProof: program.programId,
        //systemProgram: SystemProgram.programId,
      })
      .signers([unverifiedKeypair])
      .rpc();

    counterDisplay = await counterProgram.account.counter.fetch(counter);
    console.log("Your counter", counterDisplay);
  });

  //TODO: test creating empty merkle rootanchor 

});
