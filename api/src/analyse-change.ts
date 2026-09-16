import path from "node:path";
import { existsSync } from "node:fs";
import dotenv from "dotenv";

const envPath = existsSync(path.resolve(process.cwd(), ".env"))
  ? path.resolve(process.cwd(), ".env")
  : path.resolve(process.cwd(), "../.env");

dotenv.config({ path: envPath });

type RiskLevel = "Low" | "Medium" | "High";

export type Analysis = {
  riskLevel: RiskLevel;
  impactedAreas: string[];
  recommendedTesting: string[];
};

type Rule = {
  keywords: string[];
  score: number;
  area: string;
  testing: string;
};

const rules: Rule[] = [
  { keywords: ["authentication", "mfa", "password", "login"], score: 3, area: "Authentication", testing: "Verify valid users can still sign in and invalid users are blocked." },
  { keywords: ["authorization", "authorisation", "permission", "role", "admin"], score: 3, area: "User permissions", testing: "Verify only authorised users can perform the action." },
  { keywords: ["payment", "billing", "card", "transaction"], score: 3, area: "Payments", testing: "Verify successful, failed and duplicate payment requests." },
  { keywords: ["security", "sensitive data", "personal data", "privacy"], score: 3, area: "Security", testing: "Check sensitive information is protected and access is logged." },
  { keywords: ["database", "migration", "data change", "delete data"], score: 1, area: "Data storage", testing: "Verify existing data remains correct after the change." },
  { keywords: ["api", "endpoint"], score: 1, area: "API", testing: "Test valid requests, invalid requests and error responses." },
  { keywords: ["cache", "caching"], score: 1, area: "Caching", testing: "Verify updated data is not hidden by stale cached values." },
  { keywords: ["integration", "webhook", "third-party", "external service"], score: 1, area: "Integrations", testing: "Test the integration response and a failed external request." },
  { keywords: ["ui", "styling", "text", "layout", "label"], score: 0, area: "User interface", testing: "Check the change works at common screen sizes and is understandable." }
];

function isRiskLevel(value: unknown): value is RiskLevel {
  return value === "Low" || value === "Medium" || value === "High";
}

export function analyseChange(description: string): Analysis {
  const text = description.toLowerCase();
  const matchedRules: Rule[] = [];
  let score = 0;

  for (const rule of rules) {
    const isMatch = rule.keywords.some((keyword) => text.includes(keyword));

    if (isMatch) {
      matchedRules.push(rule);
      score += rule.score;
    }
  }

  if (matchedRules.length === 0) {
    return {
      riskLevel: "Low",
      impactedAreas: ["General application behaviour"],
      recommendedTesting: ["Verify the change works as described and existing behaviour is unaffected."]
    };
  }

  let riskLevel: RiskLevel = "Low";
  if (score >= 3) {
    riskLevel = "High";
  } else if (score >= 1) {
    riskLevel = "Medium";
  }

  return {
    riskLevel,
    impactedAreas: [...new Set(matchedRules.map((rule) => rule.area))],
    recommendedTesting: [...new Set(matchedRules.map((rule) => rule.testing))]
  };
}

export async function analyseChangeWithAi(description: string): Promise<Analysis> {
  const fallback = analyseChange(description);

  const apiKey = process.env.GEMINI_API_KEY 
  console.log("Using API key:", apiKey );
  if (!apiKey) {  
    return fallback;
  }

  try {
    const model = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: `Analyse this change for a development team: ${description}. Return JSON only with riskLevel, impactedAreas, recommendedTesting. riskLevel must be Low, Medium or High.` }]
          }],
          generationConfig: {
            responseMimeType: "application/json"
          }
        })
      }
    );
    console.log("AI response status:", response.status, response.statusText);
    if (!response.ok) {
      return fallback;
    }

    const data = (await response.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };

    const text = data.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("")?.trim();
    if (!text) {
      return fallback;
    }

    const parsed = JSON.parse(text.replace(/^```json|```$/g, "")) as Partial<Analysis>;
    if (!Array.isArray(parsed.impactedAreas) || !Array.isArray(parsed.recommendedTesting)) {
      return fallback;
    }

    return {
      riskLevel: isRiskLevel(parsed.riskLevel) ? parsed.riskLevel : fallback.riskLevel,
      impactedAreas: parsed.impactedAreas.filter((item): item is string => typeof item === "string").length ? parsed.impactedAreas.filter((item): item is string => typeof item === "string") : fallback.impactedAreas,
      recommendedTesting: parsed.recommendedTesting.filter((item): item is string => typeof item === "string").length ? parsed.recommendedTesting.filter((item): item is string => typeof item === "string") : fallback.recommendedTesting
    };
  } catch {
    return fallback;
  }
}
