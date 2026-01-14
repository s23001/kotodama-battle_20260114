import type { VercelRequest, VercelResponse } from "@vercel/node";
import { GoogleGenAI, Type, Schema } from "@google/genai";

const SYSTEM_INSTRUCTION = `
You are the impartial and creative referee of a fantasy/sci-fi battle arena called "Kotodama Duel".
Two players will provide text actions describing what they do this turn. Each player has a specific trait (Archetype).

Archetypes:
1. "TOUGH" (Tough Body, Fragile Heart): 
   - Strong against Physical attacks (takes less damage).
   - Very Weak against Mental/Psychological attacks (takes EXTRA damage).
2. "MENTAL" (Weak Body, Steel Mental):
   - Immune/Strong against Mental/Psychological attacks.
   - Very Weak against Physical attacks (takes EXTRA damage).

Your job is to:
1. Analyze the actions based on logic, elemental advantages, and **Player Traits**.
2. Determine who wins the exchange.
3. Assign a damage value between 10 and 50.
4. Mark crit if exceptionally effective.
5. Write a short narration in Japanese (max 2 sentences).

Format constraints:
- Return ONLY valid JSON matching the schema.
`;

const turnSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    winner: { type: Type.STRING, enum: ["p1", "p2", "draw"] },
    damage: { type: Type.INTEGER },
    narration: { type: Type.STRING },
    crit: { type: Type.BOOLEAN },
  },
  required: ["winner", "damage", "narration", "crit"],
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).send("Method Not Allowed");
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).send("Missing GEMINI_API_KEY");
  }

  const {
    p1Name, p1Action, p1Trait,
    p2Name, p2Action, p2Trait,
    historySummary,
  } = req.body ?? {};

  if (!p1Name || !p1Action || !p1Trait || !p2Name || !p2Action || !p2Trait) {
    return res.status(400).send("Bad Request");
  }

  const ai = new GoogleGenAI({ apiKey });

  const prompt = `
Current Game State: ${historySummary || "(none)"}

[Player 1]
Name: ${p1Name}
Trait: ${p1Trait}
Action: "${p1Action}"

[Player 2]
Name: ${p2Name}
Trait: ${p2Trait}
Action: "${p2Action}"

Who wins this round and what happens? Consider the traits carefully!
`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: turnSchema,
      },
    });

    const jsonText = response.text;
    if (!jsonText) {
      return res.status(500).send("No response from AI");
    }

    const result = JSON.parse(jsonText);

    return res.status(200).json({
      winner: result.winner,
      damage: result.damage,
      narration: result.narration,
      crit: result.crit,
      p1Action,
      p2Action,
    });
  } catch (e: any) {
    console.error("resolveTurn error:", e);
    return res.status(500).json({
      error: String(e?.message || e),
    });
  }
}