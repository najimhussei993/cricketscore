import { useState, useCallback, useMemo } from 'react';
import { Match, Ball, Innings, Player, ExtraType, WicketType } from '../types/match';

export function useScoring(initialMatch: Match) {
  const [match, setMatch] = useState<Match>(initialMatch);

  const currentInnings = useMemo(() => match.innings[match.currentInningsIndex], [match]);
  
  const getStats = useCallback(() => {
    const { balls, score, wickets, battingTeamId, bowlingTeamId } = currentInnings;
    
    // Calculate batsman stats
    const batsmanStats = balls.reduce((acc, ball) => {
      if (!acc[ball.batsmanId]) {
        acc[ball.batsmanId] = { runs: 0, balls: 0, fours: 0, sixes: 0, out: false };
      }
      const b = acc[ball.batsmanId];
      if (!ball.extra || ball.extra.type !== 'wide') {
        b.balls += 1;
      }
      b.runs += ball.runs;
      if (ball.isBoundary && ball.runs === 4) b.fours += 1;
      if (ball.isSix) b.sixes += 1;
      if (ball.wicket && ball.wicket.playerOutId === ball.batsmanId) b.out = true;
      return acc;
    }, {} as Record<string, { runs: number, balls: number, fours: number, sixes: number, out: boolean }>);

    // Calculate bowler stats
    const bowlerStats = balls.reduce((acc, ball) => {
      if (!acc[ball.bowlerId]) {
        acc[ball.bowlerId] = { runs: 0, balls: 0, wickets: 0, maidens: 0 };
      }
      const b = acc[ball.bowlerId];
      b.runs += ball.runs + (ball.extra?.runs || 0);
      if (!ball.extra || (ball.extra.type !== 'wide' && ball.extra.type !== 'noball')) {
        b.balls += 1;
      }
      if (ball.wicket && ball.wicket.type !== 'runout') {
        b.wickets += 1;
      }
      return acc;
    }, {} as Record<string, { runs: number, balls: number, wickets: number, maidens: number }>);

    return { batsmanStats, bowlerStats, score, wickets, ballsCount: balls.filter(b => !b.extra || (b.extra.type !== 'wide' && b.extra.type !== 'noball')).length };
  }, [currentInnings]);

  const addBall = useCallback((ballData: Partial<Ball>) => {
    const { ballsCount } = getStats();
    const overNumber = Math.floor(ballsCount / 6);
    const ballNumber = (ballsCount % 6) + 1;

    const newBall: Ball = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      overNumber,
      ballNumber,
      runs: 0,
      batsmanId: '', // Should be passed
      bowlerId: '',  // Should be passed
      ...ballData,
    } as Ball;

    setMatch(prev => {
      const newInnings = { ...prev.innings[prev.currentInningsIndex] };
      newInnings.balls = [...newInnings.balls, newBall];
      
      // Update score and wickets
      let scoreAdd = newBall.runs;
      if (newBall.extra) scoreAdd += newBall.extra.runs;
      
      newInnings.score += scoreAdd;
      if (newBall.wicket) newInnings.wickets += 1;

      const newMatch = { ...prev };
      newMatch.innings = [...prev.innings];
      newMatch.innings[prev.currentInningsIndex] = newInnings;
      newMatch.updatedAt = Date.now();
      return newMatch;
    });
  }, [getStats]);

  const undoLastBall = useCallback(() => {
    setMatch(prev => {
      const newInnings = { ...prev.innings[prev.currentInningsIndex] };
      if (newInnings.balls.length === 0) return prev;
      
      const lastBall = newInnings.balls[newInnings.balls.length - 1];
      newInnings.balls = newInnings.balls.slice(0, -1);
      
      let scoreSubtract = lastBall.runs;
      if (lastBall.extra) scoreSubtract += lastBall.extra.runs;
      
      newInnings.score -= scoreSubtract;
      if (lastBall.wicket) newInnings.wickets -= 1;

      const newMatch = { ...prev };
      newMatch.innings = [...prev.innings];
      newMatch.innings[prev.currentInningsIndex] = newInnings;
      newMatch.updatedAt = Date.now();
      return newMatch;
    });
  }, []);

  return {
    match,
    setMatch,
    currentInnings,
    addBall,
    undoLastBall,
    stats: getStats(),
  };
}
