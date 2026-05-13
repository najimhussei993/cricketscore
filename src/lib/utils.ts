import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatOvers(balls: number): string {
  const overs = Math.floor(balls / 6);
  const remainder = balls % 6;
  return `${overs}.${remainder}`;
}

export function calculateRunRate(runs: number, balls: number): number {
  if (balls === 0) return 0;
  return Number(((runs / balls) * 6).toFixed(2));
}
