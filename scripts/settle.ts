// scripts/settle.ts
// FIX: Add a manual type declaration for the Node.js `process` object
declare var process: {
  env: {
    MERLIN_RPC_URL?: string;
    PRIVATE_KEY?: string;
  };
  exitCode: number;
};

import { ethers } from "ethers";
import { LOTTERY_ABI, CONTRACT_ADDRESS } from "../constants";
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env' });

// This logic MUST exactly match the frontend to be verifiable
const ONCHAIN_SEED_PHRASE = "onchain-jackpot-v3-merlin-stable";
const getWinningNumbersForSlot = (timestamp: number): number[] => {
  const seed = new Date(timestamp).toISOString() + ONCHAIN_SEED_PHRASE;
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash) + seed.charCodeAt(i);
    hash |= 0;
  }
  const result: number[] = [];
  let currentHash = hash;
  while (result.length < 4) {
    currentHash = (currentHash * 1664525 + 1013904223) | 0;
    const num = (Math.abs(currentHash) % 9) + 1;
    if (!result.includes(num)) result.push(num);
  }
  return result.sort((a, b) => a - b);
};

// This function contains the core logic to find and settle one draw.
async function checkAndSettle(contract: ethers.Contract) {
    const now = new Date();
    const currentHour = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), now.getUTCHours())).getTime();
    let targetDrawMs: number | null = null;

    // Check the last 48 hours to be safe, in case of prolonged downtime.
    // The script will automatically catch up.
    for (let i = 0; i < 48; i++) {
        const checkTime = currentHour - (i * 3600 * 1000);
        const d = new Date(checkTime);
        if (d.getUTCHours() === 0 || d.getUTCHours() === 12) {
            const drawTimestampSec = Math.floor(checkTime / 1000);
            try {
                const drawData = await contract.draws(drawTimestampSec);
                if (!drawData.settled) {
                    targetDrawMs = checkTime;
                    break; // Found the most recent unsettled draw
                }
            } catch (e) {
                console.error(`Could not check draw status for ${d.toUTCString()}, may be a network issue. Retrying next cycle.`);
                return; 
            }
        }
    }

    if (targetDrawMs === null) {
        // This is the normal state when no action is needed.
        return;
    }
    
    // If we have a target, proceed with settlement
    const targetDrawSec = Math.floor(targetDrawMs / 1000);
    console.log(`\n🎯 Found unsettled draw for: ${new Date(targetDrawMs).toUTCString()} (Timestamp: ${targetDrawSec})`);
    
    const winningNumbers = getWinningNumbersForSlot(targetDrawMs);
    console.log(`🔢 Verifiable winning numbers: [${winningNumbers.join(', ')}]`);

    console.log("📞 Calling settleAndRollover on the contract...");
    try {
        const tx = await contract.settleAndRollover(targetDrawSec, winningNumbers);
        console.log(`Transaction sent! Hash: ${tx.hash}`);
        console.log("Waiting for confirmation...");
        
        const receipt = await tx.wait();
        console.log(`\n🎉 Draw settled successfully in block ${receipt.blockNumber}!`);
        console.log(`Gas used: ${receipt.gasUsed.toString()}`);

    } catch (error: any) {
        const reason = error.reason || error.message;
        console.error("❌ Settlement transaction failed:", reason);
        if (reason && reason.includes("Draw already settled")) {
            console.log("ℹ️ It seems this draw was already settled by another process.");
        } else if (reason && reason.includes("Draw is in the future")) {
            console.log("ℹ️ The calculated draw time is still in the future. Please wait until after the draw time has passed.");
        }
    }
}

// The main execution function that runs the keeper loop.
async function main() {
    console.log("🚀 Starting Keeper Bot for Onchain Jackpot.");
    console.log("This script will run continuously to settle draws automatically.");
    console.log("Leave this terminal window open on a server or a machine that is always on.");
    console.log("----------------------------------------------------------------------");

    const rpcUrl = process.env.MERLIN_RPC_URL;
    if (!rpcUrl) throw new Error("MERLIN_RPC_URL not found in .env file.");
    const privateKey = process.env.PRIVATE_KEY;
    if (!privateKey) throw new Error("PRIVATE_KEY not found in .env file.");

    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const wallet = new ethers.Wallet(privateKey, provider);
    console.log(`✅ Using owner wallet: ${wallet.address}`);

    const contract = new ethers.Contract(CONTRACT_ADDRESS, LOTTERY_ABI, wallet);
    console.log(`✅ Connected to contract: ${CONTRACT_ADDRESS}`);

    const runCheck = async () => {
        console.log(`[${new Date().toLocaleTimeString()}] Checking for draws...`);
        try {
            await checkAndSettle(contract);
        } catch (e: any) {
            console.error("❌ An unexpected error occurred in the check loop:", e.message);
        }
    };

    // Run immediately on start, then every minute.
    await runCheck();
    setInterval(runCheck, 60 * 1000); // Check every 60 seconds
}

main().catch((error) => {
  console.error("❌ Keeper script failed critically:", error.message);
  process.exitCode = 1;
});
