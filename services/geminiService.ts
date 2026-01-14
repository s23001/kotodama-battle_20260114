import { GoogleGenAI, Type, Schema } from "@google/genai";
import { TurnResult, TraitType } from "../types";

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
   - Example: If a TOUGH player is insulted, they should take massive damage.
   - Example: If a MENTAL player is punched, they should take massive damage.
2. Determine who wins the exchange.
3. Assign a damage value between 10 and 50 based on the effectiveness and traits. 
   - Standard: 15-25
   - Effective (Trait Weakness): 30-50
   - Ineffective (Trait Resistance): 5-10
4. If a move is extremely clever or exploits a trait weakness perfectly, mark it as a 'crit' (critical hit).
5. Write a short, exciting narration (in Japanese) describing the clash and the outcome.

Format constraints:
- Return ONLY valid JSON matching the schema.
- Narration should be dramatic but concise (max 2 sentences).
`;

const turnSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    winner: {
      type: Type.STRING,
      enum: ["p1", "p2", "draw"],
      description: "The winner of the round.",
    },
    damage: {
      type: Type.INTEGER,
      description: "Damage dealt to the loser. If draw, damage dealt to both.",
    },
    narration: {
      type: Type.STRING,
      description: "Dramatic description of the action result in Japanese.",
    },
    crit: {
      type: Type.BOOLEAN,
      description: "True if the winner's move was exceptionally effective.",
    },
  },
  required: ["winner", "damage", "narration", "crit"],
};

export const resolveTurn = async (
  p1Name: string,
  p1Action: string,
  p1Trait: TraitType,
  p2Name: string,
  p2Action: string,
  p2Trait: TraitType,
  historySummary: string
): Promise<TurnResult> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const prompt = `
      Current Game State: ${historySummary}
      
      [Player 1]
      Name: ${p1Name}
      Trait: ${p1Trait === 'TOUGH' ? 'Tough Body / Fragile Heart (Physical Res, Mental Weak)' : 'Weak Body / Steel Mental (Physical Weak, Mental Res)'}
      Action: "${p1Action}"

      [Player 2]
      Name: ${p2Name}
      Trait: ${p2Trait === 'TOUGH' ? 'Tough Body / Fragile Heart (Physical Res, Mental Weak)' : 'Weak Body / Steel Mental (Physical Weak, Mental Res)'}
      Action: "${p2Action}"
      
      Who wins this round and what happens? Consider the traits carefully!
    `;

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
    if (!jsonText) throw new Error("No response from AI");

    const result = JSON.parse(jsonText);

    return {
      winner: result.winner as 'p1' | 'p2' | 'draw',
      damage: result.damage,
      narration: result.narration,
      p1Action,
      p2Action,
      crit: result.crit,
    };
  } catch (error) {
    console.error("Gemini API Error:", error);
    return {
      winner: "draw",
      damage: 5,
      narration: "次元の歪みにより、判別不能！両者に軽微なダメージ。",
      p1Action,
      p2Action,
      crit: false,
    };
  }
};

export const generateBattleIllustration = async (
  p1Name: string,
  p1Action: string,
  p2Name: string,
  p2Action: string,
  narration: string
): Promise<string | null> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    // Construct a vivid prompt for the image model
    const prompt = `
      Create a dynamic, high-quality anime-style battle illustration.
      Scene description: Two powerful characters clashing.
      Character 1 (${p1Name}): Executing action "${p1Action}".
      Character 2 (${p2Name}): Executing action "${p2Action}".
      Result/Atmosphere: ${narration}
      Style: Shonen Manga/Anime, vibrant colors, dramatic lighting, impact effects, 16:9 aspect ratio.
      No text overlays.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: prompt,
      config: {
        // Nano Banana models do not support responseMimeType
      },
    });

    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        const base64EncodeString: string = part.inlineData.data;
        return `data:image/png;base64,${base64EncodeString}`;
      }
    }
    return null;
  } catch (error) {
    console.error("Image Generation Error:", error);
    return null;
  }
};