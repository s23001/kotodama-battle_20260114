export type PlayerId = 'p1' | 'p2';

export enum GamePhase {
  SETUP = 'SETUP',
  P1_INPUT = 'P1_INPUT',
  P2_INPUT = 'P2_INPUT',
  PROCESSING = 'PROCESSING',
  RESULT = 'RESULT',
  GAME_OVER = 'GAME_OVER',
}

export type TraitType = 'TOUGH' | 'MENTAL';

export interface PlayerStats {
  id: PlayerId;
  name: string;
  hp: number;
  maxHp: number;
  avatar: string;
  themeColor: string;
  trait: TraitType; // Added trait
}

export interface TurnResult {
  winner: 'p1' | 'p2' | 'draw';
  damage: number; // Damage dealt to the loser (or both if draw)
  narration: string; // The AI's story of what happened
  p1Action: string;
  p2Action: string;
  crit: boolean; // Was it a critical hit/clever move?
  imageUrl?: string; // URL (base64) of the generated battle scene
}

export interface LogEntry {
  turn: number;
  result: TurnResult;
}