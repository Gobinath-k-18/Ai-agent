
import express from "express";

const app = express();
const PORT = 3000;

app.use(express.json());

// Basic health check
app.get("/", (req, res) => {
  res.json({
    message: "F.R.I.D.A.Y. backend is online!"
  });
});

// Send a message to our local AI
app.post("/api/chat", async (req, res) => {
  try {
    const { message } = req.body;

    if (typeof message !== "string" || !message.trim()) {
      return res.status(400).json({
        error: "Please provide a message."
      });
    }

    const aiResponse = await fetch(
      "http://localhost:11434/api/generate",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "qwen2.5:3b",
          prompt: message,
          stream: false
        })
      }
    );

    if (!aiResponse.ok) {
      throw new Error("Ollama request failed.");
    }

    const data = await aiResponse.json();

    res.json({
      reply: data.response
    });
  } catch (error) {
    console.error("AI connection error:", error.message);

    res.status(500).json({
      error: "Could not connect to the local AI. Check Ollama."
    });
  }
});

app.listen(PORT, "127.0.0.1", () => {
  console.log(`F.R.I.D.A.Y. is running at http://127.0.0.1:${PORT}`);
});
