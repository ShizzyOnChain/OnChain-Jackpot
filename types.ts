export interface Ticket {
  id: string;
  owner: string;
  numbers: number[];
  drawTimestamp: number;
  claimed: boolean;
}

export interface Draw {
    jackpotTotal: number;
    winnerCount: number;
    prizePerWinner: number;
    winningNumbers: number[];
    settled: boolean;
    isRollover?: boolean;
}
