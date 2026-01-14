import { TurnResult, TraitType } from "../types";

export const resolveTurn = async (
  p1Name: string,
  p1Action: string,
  p1Trait: TraitType,
  p2Name: string,
  p2Action: string,
  p2Trait: TraitType,
  historySummary: string
): Promise<TurnResult> => {
  const res = await fetch("/api/resolveTurn", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      p1Name, p1Action, p1Trait,
      p2Name, p2Action, p2Trait,
      historySummary,
    }),
  });

  if (!res.ok) throw new Error(await res.text());
  return await res.json();
};

export const generateBattleIllustration = async (
  p1Name: string,
  p1Action: string,
  p2Name: string,
  p2Action: string,
  narration: string
): Promise<string | null> => {
  const res = await fetch("/api/illustration", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ p1Name, p1Action, p2Name, p2Action, narration }),
  });

  if (!res.ok) throw new Error(await res.text());
  const data = await res.json();
  return data.imageUrl ?? null;
};
