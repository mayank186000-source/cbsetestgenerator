import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface GenerateRequest {
  subject: string;
  classLevel: number;
  chapter?: string;
  questionType: "MCQ" | "Short" | "Long";
  difficulty: "Easy" | "Medium" | "Hard";
  count: number;
  provider: "openai" | "gemini";
  apiKey: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const body: GenerateRequest = await req.json();
    const { subject, classLevel, chapter, questionType, difficulty, count, provider, apiKey } = body;

    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "No API key provided. Add your API key in Settings." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const chapterText = chapter ? ` from the chapter "${chapter}"` : "";
    const typeInstruction = questionType === "MCQ"
      ? "multiple choice questions with 4 options (A, B, C, D) and the correct option letter"
      : questionType === "Short"
      ? "short answer questions (1-3 sentence answers)"
      : "long answer questions (detailed multi-paragraph answers)";

    const prompt = `You are a CBSE exam question generator. Generate ${count} ${difficulty} ${typeInstruction} for Class ${classLevel} ${subject}${chapterText}.

Return ONLY a valid JSON array. Each object must have:
- "question_text": the question string
- "correct_answer": ${questionType === "MCQ" ? "the letter (A, B, C, or D) of the correct option" : "the model answer"}
${questionType === "MCQ" ? '- "option_a", "option_b", "option_c", "option_d": the four option strings' : ""}

Return ONLY the JSON array, no markdown, no explanation.`;

    let questions: unknown[];

    if (provider === "openai") {
      questions = await callOpenAI(apiKey, prompt);
    } else if (provider === "gemini") {
      questions = await callGemini(apiKey, prompt);
    } else {
      return new Response(
        JSON.stringify({ error: "Unsupported provider. Use 'openai' or 'gemini'." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ questions }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message || "Failed to generate questions" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function callOpenAI(apiKey: string, prompt: string): Promise<unknown[]> {
  const resp = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are a CBSE exam question generator. Always return valid JSON only." },
        { role: "user", content: prompt },
      ],
      temperature: 0.7,
    }),
  });

  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`OpenAI API error (${resp.status}): ${errText}`);
  }

  const data = await resp.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("Empty response from OpenAI");

  return JSON.parse(content);
}

async function callGemini(apiKey: string, prompt: string): Promise<unknown[]> {
  const resp = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.7 },
      }),
    }
  );

  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`Gemini API error (${resp.status}): ${errText}`);
  }

  const data = await resp.json();
  const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!content) throw new Error("Empty response from Gemini");

  const cleaned = content.replace(/```json/g, "").replace(/```/g, "").trim();
  return JSON.parse(cleaned);
}
