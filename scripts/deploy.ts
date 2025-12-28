// FIX: Add a manual type declaration for the Node.js `process` object
declare var process: {
  env: {
    MERLIN_RPC_URL?: string;
    PRIVATE_KEY?: string;
  };
  exitCode: number;
};

import { ethers } from "ethers";
import { LOTTERY_ABI } from "../constants";
import * as dotenv from 'dotenv';
dotenv.config();

// --- IMPORTANT ---
// 1. COMPILE your smart contract (e.g., in Remix).
// 2. COPY the bytecode from the compilation output.
// 3. PASTE it here.
const CONTRACT_BYTECODE = "PASTE_YOUR_CONTRACT_BYTECODE_HERE";

async function main() {
  console.log("🚀 Starting deployment of 4/9 Onchain Jackpot...");

  const rpcUrl = process.env.MERLIN_RPC_URL;
  if (!rpcUrl) throw new Error("MERLIN_RPC_URL not found.");
  
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) throw new Error("PRIVATE_KEY not found.");

  if (CONTRACT_BYTECODE === "PASTE_YOUR_CONTRACT_BYTECODE_HERE") {
    throw new Error("Please paste your contract's bytecode into the CONTRACT_BYTECODE variable.");
  }

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const wallet = new ethers.Wallet(privateKey, provider);
  console.log(`✅ Connected to: ${wallet.address}`);

  // --- CONSTRUCTOR ARGUMENTS ---
  const initialOwner = wallet.address;
  const devWallet = wallet.address; 
  const initialTicketPrice = ethers.parseEther("0.00001"); // Adjust as needed
  const initialReferralReward = ethers.parseEther("0.000001"); // Adjust as needed
  const jackpotBps = 8000; // 80%
  const devBps = 1000; // 10%

  const constructorArgs = [
    initialOwner,
    devWallet,
    initialTicketPrice,
    initialReferralReward,
    jackpotBps,
    devBps
  ];

  console.log("\n🚢 Deploying...");
  const contractFactory = new ethers.ContractFactory(LOTTERY_ABI, CONTRACT_BYTECODE, wallet);
  const contract = await contractFactory.deploy(...constructorArgs);

  console.log("Transaction sent. Waiting...");
  await contract.waitForDeployment();
  
  const contractAddress = await contract.getAddress();

  console.log("\n🎉 Deployment Successful!");
  console.log("----------------------------------------------------");
  console.log(`Address: ${contractAddress}`);
  console.log("----------------------------------------------------");
  console.log("\nNEXT STEPS:");
  console.log(`1. Update 'CONTRACT_ADDRESS' in 'constants.tsx'`);
  console.log(`2. Update the ABI in 'constants.tsx' if you made contract changes.`);
}

main().catch((error) => {
  console.error("❌ Deployment failed:", error);
  process.exitCode = 1;
});
