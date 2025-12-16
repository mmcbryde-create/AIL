// server.js
// Simple Express backend to store session data and optionally call OpenAI for a coach message.
//
// Usage:
//   1) npm install
//   2) (optional) create .env with OPENAI_API_KEY=your_key
//   3) npm start
//
// Sessions are saved to sessions.json in server directory.

import express from "express";
import bodyParser from "body-parser";
import fs from "fs";
import path from "path";
import cors from "cors";
import fetch from "node-fetch";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(process.cwd(), "public")));

const SESSIONS_FILE = path.join(process.cwd(), "sessions.json");

function loadSessions() {
  try {
    const raw = fs.readFileSync(SESSIONS_FILE, "utf8");
    return JSON.parse(raw);
  } catch (e) {
    return [];
  }
}

function saveSessions(sessions) {
  fs.writeFileSync(SESSIONS_FILE, JSON.stringify(sessions, null, 2));
}

app.post("/api/save-session", async (req, res) => {
  try {
    const session = req.body;
    if (!session || !session.exercises) {
      return res.status(400).json({ error: "invalid session payload" });
    }

    // timestamp
    session.createdAt = new Date().toISOString();

    // Append to local file
    const sessions = loadSessions();
    sessions.push(session);
    saveSessions(sessions);

    // If OPENAI_API_KEY is set, call OpenAI to generate a short coach message.
    const openaiKey = process.env.OPENAI_API_KEY;
    let coach = null;
    if (openaiKey) {
      try {
        const prompt = generateCoachPrompt(session);
        const openaiResp = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${openaiKey}`
          },
          body: JSON.stringify({
            model: "gpt-4o-mini", // use a sensible default; change as you like
            messages: [
              { role: "system", content: "You are a friendly, concise workout coach." },
              { role: "user", content: prompt }
            ],
            max_tokens: 150,
            temperature: 0.7
          })
        });
        const json = await openaiResp.json();
        coach = json?.choices?.[0]?.message?.content ?? null;
      } catch (err) {
        console.error("OpenAI call failed:", err?.message ?? err);
      }
    }

    res.json({ ok: true, coach });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server error" });
  }
});

function generateCoachPrompt(session) {
  // Build a short session summary to pass to LLM
  const lines = [];
  lines.push(`User session on ${session.createdAt || "recently"}.`);
  for (const ex of session.exercises) {
    lines.push(`Exercise: ${ex.name} — reps: ${ex.reps}, sets: ${ex.sets || 1}.`);
    if (ex.issues && ex.issues.length) {
      lines.push(`Detected issues: ${ex.issues.join(", ")}.`);
    }
  }
  lines.push("Write a warm, concise 2-4 sentence coach message: praise progress, one clear correction, and one small drill or tip.");
  return lines.join(" ");
}

app.post("/api/buddy-chat", async (req, res) => {
  try {
    const { context } = req.body;
    if (!context) return res.status(400).json({ error: "missing context" });

    // If no key, return generic fallback so client doesn't break
    const openaiKey = process.env.OPENAI_API_KEY;
    if (!openaiKey) {
      return res.json({ message: "Excellent work! Keep moving!" });
    }

    // Rate limit check could go here, but we'll rely on client for now.

    // Construct Prompt
    const prompt = `
      You are "Lunaris", a chaotic, funny, and slightly sassy futuristic boxing coach AI. 
      The user is playing a VR-style workout game.
      
      Current Game Context:
      - Mode: ${context.mode}
      - Score: ${context.score}
      - Event: ${context.event || "Just hanging out"}
      - Is Stalling? ${context.isStalling ? "YES" : "NO"}
      
      Instructions:
      - If event is "GREETING", say a funny, random 'hello' (e.g., "Systems online, human present.", "Oh, it's you again.", "Prepare for glory!").
      - If event is "AMBIENT", just say something random, funny, or philosophical about punching pixels (e.g. "Do pixels feel pain?", "Nice form, I guess.").
      - If stalling, mock them gently!
      - KEEP IT SHORT. Under 2 sentences. 
      - Use a unique dialect (maybe slightly glitchy or slang-heavy).
    `;

    const openaiResp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openaiKey}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "You are a cyber-fitness coach." },
          { role: "user", content: prompt }
        ],
        max_tokens: 60,
        temperature: 0.9
      })
    });

    const json = await openaiResp.json();
    const message = json?.choices?.[0]?.message?.content || "Focus! Hit the targets!";
    res.json({ message });

  } catch (err) {
    console.error("Buddy API Error:", err);
    res.status(500).json({ message: "System Override! Keep fighting!" }); // Fallback on error
  }
});

app.get("/api/sessions", (req, res) => {
  const sessions = loadSessions();
  res.json({ sessions });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  if (!process.env.OPENAI_API_KEY) {
    console.warn("WARNING: OPENAI_API_KEY is not set in .env. The AI Coach feature will be disabled.");
  }
});
