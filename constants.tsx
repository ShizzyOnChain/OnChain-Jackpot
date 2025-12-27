
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

export const PREDICTION_CONFIG = {
  numberCount: 4,
  maxNumber: 9,
  ticketPrice: 1.00,
  currency: "M-USDT",
  network: "MerlinChain"
};

export const MERLIN_NETWORK = {
  chainId: '0x106888', // Updated Chain ID as per request
  chainName: 'Merlin Testnet',
  nativeCurrency: {
    name: 'BTC',
    symbol: 'BTC',
    decimals: 18,
  },
  rpcUrls: ['https://testnet-rpc.merlinchain.io'],
  blockExplorerUrls: ['https://testnet-scan.merlinchain.io'],
};

export const CONTRACT_ADDRESS = "0x967aEC3276b63c5E2262da9641DB9dbeBB07dC0d";

export const LOTTERY_ABI = [
  // Read Functions
  "function getJackpot() public view returns (uint256)",
  "function getTicketsByOwner(address owner) public view returns (tuple(uint256 id, uint8[4] numbers, uint256 lotteryTimestamp, bool claimed)[] memory)",
  
  // Write Functions
  "function mintTicket(uint8[4] memory numbers, uint256 lotteryTimestamp) public payable",
  "function claimPrize(uint256 ticketId) public",

  // Events
  "event TicketMinted(address indexed owner, uint256 indexed ticketId, uint8[4] numbers, uint256 lotteryTimestamp)",
  "event PrizeClaimed(address indexed owner, uint256 indexed ticketId, uint256 amount)"
];


export const ICONS = {
  Check: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
  ),
  Sparkles: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l1.912 5.813a2 2 0 001.275 1.275L21 12l-5.813 1.912a2 2 0 00-1.275 1.275L12 21l-1.912-5.813a2 2 0 00-1.275-1.275L3 12l5.813-1.912a2 2 0 001.275-1.275L12 3z"></path></svg>
  ),
  Wallet: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5z"></path><path d="M16 12h.01"></path></svg>
  )
};
