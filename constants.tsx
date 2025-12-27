
import React from 'react';

export const COLORS = {
  midnight: "#063A30",
  midnight2: "#0A4A3D",
  mintBg: "#E9FFF6",
  mintBg2: "#DFFAEF",
  mintStroke: "#7FE6C3",
  mintText: "#0D6B58",
  cardBorder: "rgba(6, 58, 48, 0.10)",
  shadow: "0 18px 50px rgba(6,58,48,0.10)",
};

export const MERLIN_NETWORK = {
  chainId: '0x6b4f', // Merlin Testnet Chain ID is 686868
  chainName: 'Merlin Testnet',
  nativeCurrency: {
    name: 'BTC',
    symbol: 'BTC',
    decimals: 18,
  },
  rpcUrls: ['https://testnet-rpc.merlinchain.io'],
  blockExplorerUrls: ['https://testnet-scan.merlinchain.io'],
};

// IMPORTANT: Replace this with the address you get after deploying the new contract
export const CONTRACT_ADDRESS = "YOUR_NEW_DEPLOYED_CONTRACT_ADDRESS_HERE";


export const LOTTERY_ABI = [
  {
    "inputs": [
      { "internalType": "address", "name": "initialOwner", "type": "address" },
      { "internalType": "address", "name": "_devWallet", "type": "address" },
      { "internalType": "address", "name": "_referralTreasury", "type": "address" },
      { "internalType": "uint256", "name": "_initialTicketPrice", "type": "uint256" },
      { "internalType": "uint256", "name": "_initialReferralReward", "type": "uint256" }
    ],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "uint64", "name": "drawTimestamp", "type": "uint64" },
      { "indexed": false, "internalType": "uint8[4]", "name": "winningNumbers", "type": "uint8[4]" },
      { "indexed": false, "internalType": "uint256", "name": "jackpot", "type": "uint256" },
      { "indexed": false, "internalType": "uint256", "name": "winnerCount", "type": "uint256" },
      { "indexed": false, "internalType": "uint256", "name": "prizePerWinner", "type": "uint256" }
    ],
    "name": "DrawSettled",
    "type": "event"
  },
  { "anonymous": false, "inputs": [{ "indexed": false, "internalType": "uint16", "name": "jackpotBps", "type": "uint16" }, { "indexed": false, "internalType": "uint16", "name": "devBps", "type": "uint16" }], "name": "FeeBpsUpdated", "type": "event" },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "address", "name": "previousOwner", "type": "address" },
      { "indexed": true, "internalType": "address", "name": "newOwner", "type": "address" }
    ],
    "name": "OwnershipTransferred",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "address", "name": "winner", "type": "address" },
      { "indexed": true, "internalType": "uint256", "name": "ticketId", "type": "uint256" },
      { "indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256" }
    ],
    "name": "PrizeClaimed",
    "type": "event"
  },
  { "anonymous": false, "inputs": [{ "indexed": true, "internalType": "address", "name": "referrer", "type": "address" }, { "indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256" }], "name": "ReferralClaimed", "type": "event" },
  { "anonymous": false, "inputs": [{ "indexed": false, "internalType": "uint256", "name": "newReward", "type": "uint256" }], "name": "ReferralRewardUpdated", "type": "event" },
  { "anonymous": false, "inputs": [{ "indexed": true, "internalType": "address", "name": "user", "type": "address" }, { "indexed": true, "internalType": "address", "name": "referrer", "type": "address" }], "name": "ReferrerSet", "type": "event" },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "address", "name": "buyer", "type": "address" },
      { "indexed": true, "internalType": "uint256", "name": "ticketId", "type": "uint256" },
      { "indexed": true, "internalType": "uint64", "name": "drawTimestamp", "type": "uint64" },
      { "indexed": false, "internalType": "uint8[4]", "name": "numbers", "type": "uint8[4]" }
    ],
    "name": "TicketMinted",
    "type": "event"
  },
  { "anonymous": false, "inputs": [{ "indexed": false, "internalType": "uint256", "name": "newPrice", "type": "uint256" }], "name": "TicketPriceUpdated", "type": "event" },
  { "inputs": [{ "internalType": "uint256", "name": "ticketId", "type": "uint256" }], "name": "claimPrize", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  { "inputs": [], "name": "claimReferralRewards", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  { "inputs": [], "name": "devBps", "outputs": [{ "internalType": "uint16", "name": "", "type": "uint16" }], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "devWallet", "outputs": [{ "internalType": "address", "name": "", "type": "address" }], "stateMutability": "view", "type": "function" },
  {
    "inputs": [{ "internalType": "uint64", "name": "", "type": "uint64" }],
    "name": "draws",
    "outputs": [
      { "internalType": "uint256", "name": "jackpotTotal", "type": "uint256" },
      { "internalType": "uint256", "name": "winnerCount", "type": "uint256" },
      { "internalType": "uint256", "name": "prizePerWinner", "type": "uint256" },
      { "internalType": "uint8[4]", "name": "winningNumbers", "type": "uint8[4]" },
      { "internalType": "bool", "name": "settled", "type": "bool" },
      { "internalType": "uint256", "name": "remainingJackpot", "type": "uint256" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  { "inputs": [], "name": "getJackpot", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  { "inputs": [{ "internalType": "uint64", "name": "drawTimestamp", "type": "uint64" }], "name": "getJackpotForDraw", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  {
    "inputs": [{ "internalType": "address", "name": "user", "type": "address" }],
    "name": "getTicketsByOwner",
    "outputs": [
      {
        "components": [
          { "internalType": "uint256", "name": "id", "type": "uint256" },
          { "internalType": "address", "name": "owner", "type": "address" },
          { "internalType": "uint8[4]", "name": "numbers", "type": "uint8[4]" },
          { "internalType": "uint64", "name": "drawTimestamp", "type": "uint64" },
          { "internalType": "bool", "name": "claimed", "type": "bool" }
        ],
        "internalType": "struct OnChainJackpot.Ticket[]",
        "name": "",
        "type": "tuple[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  { "inputs": [{ "internalType": "uint256", "name": "ticketId", "type": "uint256" }], "name": "isWinningTicket", "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "jackpotBps", "outputs": [{ "internalType": "uint16", "name": "", "type": "uint16" }], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "jackpotPool", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  { "inputs": [{ "internalType": "uint8[4]", "name": "numbers", "type": "uint8[4]" }, { "internalType": "uint64", "name": "drawTimestamp", "type": "uint64" }], "name": "mintTicket", "outputs": [], "stateMutability": "payable", "type": "function" },
  { "inputs": [], "name": "nextTicketId", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "owner", "outputs": [{ "internalType": "address", "name": "", "type": "address" }], "stateMutability": "view", "type": "function" },
  { "inputs": [{ "internalType": "address", "name": "", "type": "address" }], "name": "referralBalances", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "referralReward", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "referralTreasury", "outputs": [{ "internalType": "address", "name": "", "type": "address" }], "stateMutability": "view", "type": "function" },
  { "inputs": [{ "internalType": "address", "name": "", "type": "address" }], "name": "referrerOf", "outputs": [{ "internalType": "address", "name": "", "type": "address" }], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "renounceOwnership", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  {
    "inputs": [
      { "internalType": "uint64", "name": "drawTimestamp", "type": "uint64" },
      { "internalType": "uint8[4]", "name": "winningNumbers", "type": "uint8[4]" },
      { "internalType": "uint256", "name": "winnerCount", "type": "uint256" }
    ],
    "name": "settleDraw",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  { "inputs": [{ "internalType": "uint16", "name": "_jackpotBps", "type": "uint16" }, { "internalType": "uint16", "name": "_devBps", "type": "uint16" }], "name": "setFeeBps", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  { "inputs": [{ "internalType": "address", "name": "ref", "type": "address" }], "name": "setReferrer", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  { "inputs": [{ "internalType": "uint256", "name": "newReward", "type": "uint256" }], "name": "setReferralReward", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  { "inputs": [{ "internalType": "uint256", "name": "newPrice", "type": "uint256" }], "name": "setTicketPrice", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  {
    "inputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "name": "tickets",
    "outputs": [
      { "internalType": "uint256", "name": "id", "type": "uint256" },
      { "internalType": "address", "name": "owner", "type": "address" },
      { "internalType": "uint8[4]", "name": "numbers", "type": "uint8[4]" },
      { "internalType": "uint64", "name": "drawTimestamp", "type": "uint64" },
      { "internalType": "bool", "name": "claimed", "type": "bool" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  { "inputs": [], "name": "ticketPrice", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  { "inputs": [{ "internalType": "address", "name": "newOwner", "type": "address" }], "name": "transferOwnership", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  { "inputs": [{ "internalType": "address payable", "name": "to", "type": "address" }, { "internalType": "uint256", "name": "amount", "type": "uint256" }], "name": "withdrawStuckFunds", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  { "stateMutability": "payable", "type": "receive" }
];
