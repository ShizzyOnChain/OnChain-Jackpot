// FIX: Add a triple-slash directive to include Node.js types.
// This resolves the TypeScript error "Property 'exitCode' does not exist on type 'Process'"
// by providing the correct type definitions for the global `process` object in a Node.js environment.
/// <reference types="node" />

import { ethers } from "ethers";
import { LOTTERY_ABI } from "../constants";
import * as dotenv from 'dotenv';
dotenv.config();

// --- IMPORTANT ---
// 1. COMPILE your smart contract (e.g., in Remix, Hardhat, or Foundry).
// 2. COPY the bytecode from the compilation output.
// 3. PASTE it here. The bytecode is a long hexadecimal string starting with "0x...".
const CONTRACT_BYTECODE = "PASTE_YOUR_CONTRACT_BYTECODE_HERE";

async function main() {
  console.log("🚀 Starting deployment...");

  // --- 1. SETUP PROVIDER AND WALLET ---
  const rpcUrl = process.env.MERLIN_RPC_URL;
  if (!rpcUrl) {
    throw new Error("MERLIN_RPC_URL not found in .env file. Please set it.");
  }
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    throw new Error("PRIVATE_KEY not found in .env file. Please set it.");
  }
  if (CONTRACT_BYTECODE === "PASTE_YOUR_CONTRACT_BYTECODE_HERE") {
    throw new Error("Please paste your contract's bytecode into the CONTRACT_BYTECODE variable in this script.");
  }

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const wallet = new ethers.Wallet(privateKey, provider);
  console.log(`✅ Connected to wallet: ${wallet.address}`);

  // --- 2. DEFINE CONSTRUCTOR ARGUMENTS ---
  // These values will be passed to your contract's constructor when it's deployed.
  const initialOwner = wallet.address;
  const devWallet = wallet.address; // For simplicity, using the same address
  const referralTreasury = wallet.address; // For simplicity, using the same address
  const initialTicketPrice = ethers.parseEther("0.00001"); // e.g., 0.00001 BTC
  const initialReferralReward = ethers.parseEther("0.000001"); // e.g., 10% of ticket price

  const constructorArgs = [
    initialOwner,
    devWallet,
    referralTreasury,
    initialTicketPrice,
    initialReferralReward
  ];

  console.log("\nConstructor Arguments:");
  console.log(`- initialOwner: ${initialOwner}`);
  console.log(`- devWallet: ${devWallet}`);
  console.log(`- referralTreasury: ${referralTreasury}`);
  console.log(`- initialTicketPrice: ${ethers.formatEther(initialTicketPrice)} BTC`);
  console.log(`- initialReferralReward: ${ethers.formatEther(initialReferralReward)} BTC`);

  // --- 3. DEPLOY CONTRACT ---
  console.log("\n🚢 Deploying contract...");
  const contractFactory = new ethers.ContractFactory(LOTTERY_ABI, CONTRACT_BYTECODE, wallet);
  const contract = await contractFactory.deploy(...constructorArgs);

  console.log("Transaction sent. Waiting for deployment to complete...");
  await contract.waitForDeployment();
  
  const contractAddress = await contract.getAddress();

  // --- 4. LOG RESULTS ---
  console.log("\n🎉 Contract deployed successfully!");
  console.log("----------------------------------------------------");
  console.log(`OnChainJackpot Contract Address: ${contractAddress}`);
  console.log("----------------------------------------------------");
  console.log("\nACTION REQUIRED:");
  console.log(`1. Copy the new contract address above.`);
  console.log(`2. Paste it into the 'CONTRACT_ADDRESS' variable in your 'constants.tsx' file.`);
  console.log("3. Redeploy your frontend application.");
}

main().catch((error) => {
  console.error("❌ Deployment failed:", error);
  // FIX: Replaced `process.exit(1)` with `process.exitCode = 1` to fix a TypeScript error
  // where the `exit` method was not found on the `Process` type. This is a safer way to exit.
  process.exitCode = 1;
});
