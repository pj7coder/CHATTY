import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import Groq from "groq-sdk";
import { randomUUID } from "crypto";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

/*
  Chat storage
  Format:
  {
    chatId1: [ {role, content}, {role, content} ],
    chatId2: [...]
  }
*/
const chats = {};

// Test route
app.get("/", (req, res) => {
  res.send("Server is alive!");
});

// Main chat route
app.post("/chat", async (req, res) => {
  try {
    let { message, chatId, newChat } = req.body;

    if (!message && !newChat) {
      return res.json({ reply: "No message provided." });
    }

    // If new chat requested OR no chatId → create new
    if (newChat || !chatId) {
      chatId = randomUUID();
      chats[chatId] = [];
    }

    if (!chats[chatId]) {
      chats[chatId] = [];
    }

    // Add user message
    chats[chatId].push({
      role: "user",
      content: message
    });

    const response = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: chats[chatId]
    });

    const botReply = response.choices[0].message.content;

    // Save assistant reply
    chats[chatId].push({
      role: "assistant",
      content: botReply
    });

    res.json({
      reply: botReply,
      chatId
    });

  } catch (err) {
    console.error("Groq Error:", err);
    res.status(500).json({
      reply: "Groq failed. Check API key or model access."
    });
  }
});

app.listen(3000, () => {
  console.log("Server running at http://localhost:3000");
});