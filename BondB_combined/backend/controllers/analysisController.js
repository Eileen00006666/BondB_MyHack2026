require("dotenv").config();

const { GoogleGenAI } = require("@google/genai");

const GOOGLE_CLOUD_PROJECT =
  process.env.GOOGLE_CLOUD_PROJECT || process.env.GOOGLE_VERTEX_PROJECT;
const GOOGLE_CLOUD_LOCATION = process.env.GOOGLE_CLOUD_LOCATION || "global";
const GOOGLE_GENAI_MODEL =
  process.env.GOOGLE_GENAI_MODEL || "gemini-3-flash-preview";
const USE_VERTEX_AI =
  String(process.env.GOOGLE_GENAI_USE_VERTEXAI || "").toLowerCase() === "true";

let vertexAiClient;

const getVertexAiClient = () => {
  if (!GOOGLE_CLOUD_PROJECT) {
    throw new Error(
      "Missing GOOGLE_CLOUD_PROJECT or GOOGLE_VERTEX_PROJECT environment variable"
    );
  }

  if (!vertexAiClient) {
    vertexAiClient = new GoogleGenAI({
      vertexai: true,
      project: GOOGLE_CLOUD_PROJECT,
      location: GOOGLE_CLOUD_LOCATION,
    });
  }

  return vertexAiClient;
};

const buildPrompt = ({ message, fromActor, toActor, relType, programme }) => {
  if (fromActor) {
    return `You are BondB's ecosystem relationship intelligence engine for a Malaysian accelerator platform.

Analyse this relationship and return a JSON assessment.

RELATIONSHIP: ${fromActor?.name} (${fromActor?.type}) <-> ${toActor?.name} (${toActor?.type || "Programme"})
TYPE: ${relType || "Mentor<->Company"}
PROGRAMME: ${programme || "Unknown"}
CONTEXT: ${message || "New relationship assessment"}

Return ONLY valid JSON:
{
  "trustScore": 82,
  "communicationScore": 76,
  "fitScore": 88,
  "successProbability": 81,
  "relationshipType": "mentor",
  "relationshipHealth": "Strong",
  "insight": "one sentence summary",
  "reasons": ["reason1", "reason2", "reason3"],
  "risks": ["risk1"],
  "recommendedAction": "one clear action sentence"
}

Do not return an empty object. Scores must be integers from 0 to 100.`;
  }

  return `Analyse this ecosystem interaction message for a Malaysian accelerator:
"${message}"

Return ONLY valid JSON:
{
  "trustScore": 82,
  "communicationScore": 76,
  "relationshipType": "mentor",
  "insight": "one sentence"
}

Do not return an empty object. Scores must be integers from 0 to 100.`;
};

const parseJsonFromModelText = (text) => {
  const clean = text.replace(/```json|```/g, "").trim();
  const parsed = JSON.parse(clean);

  if (
    !parsed ||
    typeof parsed !== "object" ||
    Array.isArray(parsed) ||
    Object.keys(parsed).length === 0
  ) {
    throw new Error("Model returned an empty JSON object");
  }

  return parsed;
};

const analyzeWithVertexAi = async (prompt) => {
  const client = getVertexAiClient();
  const response = await client.models.generateContent({
    model: GOOGLE_GENAI_MODEL,
    contents: prompt,
    config: {
      temperature: 0.3,
      maxOutputTokens: 2048,
      responseMimeType: "application/json",
      thinkingConfig: {
        thinkingBudget: 128,
      },
    },
  });

  return response.text || "";
};

const analyzeWithKeywordFallback = (message) => {
  let trustScore = 70;
  let communicationScore = 70;
  let relationshipType = "general";
  let insight = "This interaction is neutral.";

  const lowerMessage = (message || "").toLowerCase();

  if (
    lowerMessage.includes("thank") ||
    lowerMessage.includes("help") ||
    lowerMessage.includes("support") ||
    lowerMessage.includes("trust")
  ) {
    trustScore = 88;
    communicationScore = 85;
    relationshipType = "mentor";
    insight = "This interaction shows trust and positive support.";
  } else if (
    lowerMessage.includes("meeting") ||
    lowerMessage.includes("discussed") ||
    lowerMessage.includes("planned") ||
    lowerMessage.includes("progress")
  ) {
    trustScore = 80;
    communicationScore = 90;
    relationshipType = "collaboration";
    insight = "This interaction shows active collaboration and communication.";
  } else if (
    lowerMessage.includes("missed") ||
    lowerMessage.includes("late") ||
    lowerMessage.includes("conflict") ||
    lowerMessage.includes("problem")
  ) {
    trustScore = 45;
    communicationScore = 50;
    relationshipType = "at-risk";
    insight = "This relationship may need attention due to weak communication.";
  }

  return {
    trustScore,
    communicationScore,
    relationshipType,
    insight,
  };
};

const analyzeRelationship = async (req, res) => {
  try {
    const { message, fromActor, toActor, relType, programme } = req.body;

    if (!message && !fromActor) {
      return res.status(400).json({ error: "message or actor data is required" });
    }

    if (USE_VERTEX_AI) {
      const text = await analyzeWithVertexAi(
        buildPrompt({ message, fromActor, toActor, relType, programme })
      );

      try {
        return res.status(200).json(parseJsonFromModelText(text));
      } catch {
        return res.status(200).json({ raw_response: text });
      }
    }

    return res.status(200).json(analyzeWithKeywordFallback(message));
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

module.exports = { analyzeRelationship };
