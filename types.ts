
export interface Ticket {
  id: string;
  numbers: number[];
  timestamp: number;
  targetLottery: number;
  isWinner?: boolean;
  claimed?: boolean;
}

export interface Winner {
  address: string;
  amount: string;
  numbers: number[];
  date: string;
}

export interface HistoricalPrediction {
  id: string;
  numbers: number[];
  date: string;
  jackpot: string;
  winners: number;
  txHash: string;
}

export interface PredictionConfig {
  numberCount: number;
  maxNumber: number;
  ticketPrice: number;
  currency: string;
}

export enum PredictionStatus {
  OPEN = 'OPEN',
  LOCKED = 'LOCKED',
  SETTLING = 'SETTLING'
}
