// scripts/settle.ts
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
  while (result.length < 6) {
    currentHash = (currentHash * 1664525 + 1013904223) | 0;
    const num = (Math.abs(currentHash) % 99) + 1;
    if (!result.includes(num)) result.push(num);
  }
  return result.sort((a, b) => a - b);
};

async function checkAndSettle(contract: ethers.Contract) {
    const now = new Date();
    const currentHour = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), now.getUTCHours())).getTime();
    let targetDrawMs: number | null = null;

    for (let i = 0; i < 48; i++) {
        const checkTime = currentHour - (i * 3600 * 1000);
        const d = new Date(checkTime);
        if (d.getUTCHours() === 0 || d.getUTCHours() === 12) {
            const drawTimestampSec = Math.floor(checkTime / 1000);
            try {
                const drawData = await contract.draws(drawTimestampSec);
                if (!drawData.settled) {
                    targetDrawMs = checkTime;
                    break;
                }
            } catch (e) {
                console.error(`Could not check draw status for ${d.toUTCString()}`);
                return; 
            }
        }
    }

    if (targetDrawMs === null) return;
    
    const targetDrawSec = Math.floor(targetDrawMs / 1000);
    const winningNumbers = getWinningNumbersForSlot(targetDrawMs);
    console.log(`🎯 Settling draw: ${new Date(targetDrawMs).toUTCString()}`);
    console.log(`🔢 Winning numbers: [${winningNumbers.join(', ')}]`);

    try {
        const tx = await contract.settleAndRollover(targetDrawSec, winningNumbers);
        await tx.wait();
        console.log(`🎉 Success! Block confirmed.`);
    } catch (error: any) {
        console.error("❌ Failed:", error.reason || error.message);
    }
}

async function main() {
    console.log("🚀 Starting Keeper Bot (6/99 Logic)");
    const rpcUrl = process.env.MERLIN_RPC_URL;
    const privateKey = process.env.PRIVATE_KEY;
    if (!rpcUrl || !privateKey) throw new Error("Missing .env variables");

    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const wallet = new ethers.Wallet(privateKey, provider);
    const contract = new ethers.Contract(CONTRACT_ADDRESS, LOTTERY_ABI, wallet);

    const runCheck = async () => {
        try { await checkAndSettle(contract); } catch (e) {}
    };

    await runCheck();
    setInterval(runCheck, 60 * 1000);
}

main().catch(console.error);