import type { NextPage } from "next";
import * as anchor from "@project-serum/anchor";
import { Program, BN} from "@project-serum/anchor";
import React, { useState, useEffect, useMemo } from "react";
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import {
  WalletModalProvider,
  WalletDisconnectButton,
  WalletMultiButton,
} from "@solana/wallet-adapter-react-ui";
import {
  PhantomWalletAdapter,
} from '@solana/wallet-adapter-wallets';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import {
  useWallet,
  useAnchorWallet,
  AnchorWallet,
  useConnection,
} from "@solana/wallet-adapter-react";

import Head from "next/head";

import idl_type from "../../../target/idl/counter.json";
import { ConfirmOptions, clusterApiUrl } from "@solana/web3.js";

const Home: NextPage = () => {
  const opts = {
    preflightCommitment: "processed" as ConfirmOptions,
  };
  const connection = useConnection();
  const wallet: AnchorWallet | any = useAnchorWallet();
  const [programState, setProgramState] = useState({} as any);
  const network = WalletAdapterNetwork.Devnet;

  const endpoint = useMemo(() => clusterApiUrl(network), [network]);

  const wallets = useMemo(
    () => [
        new PhantomWalletAdapter(),
    ],
    [WalletAdapterNetwork.Devnet]
  );

  const updateCounter = async () => {
    const tx = await programState.program.methods
      //TODO: change to merkle counter accounts
      .updateCounter()
      .accounts({
        counter: programState.counter,
      })
      .rpc();
    console.log("Your transaction signature", tx);
  };

  const setupCounterProgram = async () => {
    let idl = idl_type as anchor.Idl;

    const network = "https://api.devnet.solana.com ";
    const connection = new anchor.web3.Connection(
      network,
      opts.preflightCommitment
    );

    const provider = new anchor.AnchorProvider(
      connection,
      wallet,
      opts.preflightCommitment
    );

    const program = new Program(
      idl,
      "9QPgNevoAuRegwpqdBwTihshfhFWouVLdXb8nqJKDX8U",
      provider
    );

    const [counterPubkey, _] = await anchor.web3.PublicKey.findProgramAddress(
      [wallet.publicKey.toBytes()],
      program.programId
    );

    
    /*console.log("Your counter address1", counterPubkey.toString());
    await program.methods
    .createCounter()
    .accounts({authority: wallet.publicKey,
      counter: counterPubkey,
      systemProgram: anchor.web3.SystemProgram.programId,})
    .rpc();*/
  

    console.log("Your counter address2", counterPubkey);
    const counterUpdated: any = await program.account.counter.fetch(counterPubkey);
    console.log("Your counter", counterPubkey);

    setProgramState({
      program: program,
      counter: counterPubkey,
      count: counterUpdated.count.toString(),
    });
    
  };

  useEffect(() => {
    // console.log("state refreshed");
    (async () => {
      if (
        !wallet ||
        !wallet.publicKey ||
        !wallet.signAllTransactions ||
        !wallet.signTransaction
      ) {
        return;
      }
      await setupCounterProgram();
    })();
  }, [wallet]);

  useEffect(() => {
    // console.log("state refreshed");
    (async () => {
      // @ts-ignore
      if (!programState._programId) {
        return;
      }
      console.log("program is setup");
    })();
  }, [programState]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center py-2">
      <Head>
        <title>MLH Counter App</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className="px-10">
        <div className="mockup-window border bg-base-300">
          <div className="flex justify-center px-4 py-16 bg-base-200">
          <ConnectionProvider endpoint={endpoint}>
          <WalletProvider wallets={wallets} autoConnect>
          <WalletModalProvider>
            <WalletMultiButton />
            <WalletDisconnectButton />
          </WalletModalProvider>
        </WalletProvider>
        </ConnectionProvider>
          </div>
          <div className="flex justify-center px-4 py-16 bg-base-200">
            {//programState.counter && (
              <div>
                <p>Count: {programState.count}</p>
                <button
                  onClick={async () => {
                    await setupCounterProgram();
                    await updateCounter();
                  }}
                >
                  Update Count
                </button>
              </div>
            //)
          }
          </div>
        </div>
      </main>
    </div>
  );
};

export default Home;
