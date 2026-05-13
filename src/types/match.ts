export interface Player {
  id: string;
  name: string;
  isCaptain?: boolean;
  isWicketKeeper?: boolean;
}

export interface Team {
  id: string;
  name: string;
  logo?: string;
  players: Player[];
}

export type ExtraType = 'wide' | 'noball' | 'bye' | 'legbye' | 'penalty';
export type WicketType = 'bowled' | 'caught' | 'lbw' | 'runout' | 'stumped' | 'hitwicket' | 'handledball' | 'obstructing' | 'retired' | 'timedout';

export interface Ball {
  id: string;
  batsmanId: string;
  bowlerId: string;
  runs: number;
  isBoundary?: boolean;
  isSix?: boolean;
  extra?: {
    type: ExtraType;
    runs: number;
  };
  wicket?: {
    type: WicketType;
    playerOutId: string;
    fielderId?: string;
  };
  overNumber: number;
  ballNumber: number; // 1-6
  timestamp: number;
}

export interface Innings {
  battingTeamId: string;
  bowlingTeamId: string;
  score: number;
  wickets: number;
  balls: Ball[];
  isCompleted: boolean;
}

export interface MatchSettings {
  totalOvers: number;
  venue: string;
  date: string;
  matchType: 'T20' | 'T10' | 'ODI' | 'Test' | 'Custom';
}

export interface Match {
  id: string;
  teamA: Team;
  teamB: Team;
  settings: MatchSettings;
  innings: [Innings, Innings];
  currentInningsIndex: 0 | 1;
  status: 'setup' | 'live' | 'completed';
  winnerTeamId?: string;
  manOfTheMatchId?: string;
  ownerId: string;
  createdAt: number;
  updatedAt: number;
}
