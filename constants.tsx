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
  chainId: '0xa7b44', // 686868
  chainName: 'MerlinChain',
  nativeCurrency: {
    name: 'BTC',
    symbol: 'BTC',
    decimals: 18,
  },
  rpcUrls: ['https://testnet-rpc.merlinchain.io'],
  blockExplorerUrls: ['https://testnet-scan.merlinchain.io'],
};

export const CONTRACT_ADDRESS = "0x7E12C06AD5F5C14ADA01563b197838A5328f07Cb";

export const LOTTERY_ABI = [
  "constructor(address initialOwner, address _devWallet, uint256 _ticketPrice, uint256 _referralReward, uint16 _jackpotBps, uint16 _devBps)",
  "event DevWalletUpdated(address newDevWallet)",
  "event DrawRolledOver(uint64 indexed fromDraw, uint64 indexed toDraw, uint256 amount)",
  "event DrawSettled(uint64 indexed drawTimestamp, uint8[4] winningNumbers, uint256 jackpot, uint256 winnerCount, uint256 prizePerWinner)",
  "event FeeBpsUpdated(uint16 jackpotBps, uint16 devBps)",
  "event OwnershipTransferred(address indexed previousOwner, address indexed newOwner)",
  "event PrizeClaimed(address indexed winner, uint256 indexed ticketId, uint256 amount)",
  "event ReferralClaimed(address indexed referrer, uint256 amount)",
  "event ReferralRewardUpdated(uint256 newReward)",
  "event ReferrerSet(address indexed user, address indexed referrer)",
  "event TicketMinted(address indexed buyer, uint256 indexed ticketId, uint64 indexed drawTimestamp, uint8[4] numbers)",
  "event TicketPriceUpdated(uint256 newPrice)",
  "function DRAW_INTERVAL() view returns (uint64)",
  "function claimPrize(uint256 ticketId) nonpayable",
  "function claimReferralRewards() nonpayable",
  "function devBps() view returns (uint16)",
  "function devWallet() view returns (address)",
  "function draws(uint64) view returns (uint256 jackpotTotal, uint256 winnerCount, uint256 prizePerWinner, uint8[4] winningNumbers, bool settled, uint256 remainingJackpot)",
  "function getJackpot() view returns (uint256)",
  "function getJackpotForDraw(uint64 drawTimestamp) view returns (uint256)",
  "function getTicketsByOwner(address user) view returns (tuple(uint256 id, address owner, uint8[4] numbers, uint64 drawTimestamp, bool claimed)[])",
  "function isWinningTicket(uint256 ticketId) view returns (bool)",
  "function jackpotBps() view returns (uint16)",
  "function mintTicket(uint8[4] calldata numbers, uint64 drawTimestamp) payable",
  "function nextTicketId() view returns (uint256)",
  "function normalizeDraw(uint64 ts) pure returns (uint64)",
  "function owner() view returns (address)",
  "function referralBalances(address) view returns (uint256)",
  "function referralReward() view returns (uint256)",
  "function referrerOf(address) view returns (address)",
  "function renounceOwnership() nonpayable",
  "function setDevWallet(address newDevWallet) nonpayable",
  "function setFeeBps(uint16 _jackpotBps, uint16 _devBps) nonpayable",
  "function setReferralReward(uint256 newReward) nonpayable",
  "function setReferrer(address ref) nonpayable",
  "function setTicketPrice(uint256 newPrice) nonpayable",
  "function settleAndRollover(uint64 drawTimestamp, uint8[4] calldata winningNumbers) nonpayable",
  "function settleDraw(uint64 drawTimestamp, uint8[4] calldata winningNumbers, uint256 winnerCount) nonpayable",
  "function ticketPrice() view returns (uint256)",
  "function tickets(uint256) view returns (uint256 id, address owner, uint8[4] numbers, uint64 drawTimestamp, bool claimed)",
  "function totalUnsettledJackpots() view returns (uint256)",
  "function transferOwnership(address newOwner) nonpayable",
  "function withdrawStuckFunds(address payable to, uint256 amount) nonpayable"
];