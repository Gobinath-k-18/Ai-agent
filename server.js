
import express from "express";
import cors from "cors";
import { spawn } from "node:child_process";
import fs from "node:fs";

const app = express();
const PORT = 3000;

// Allow only our local React development website.
app.use(
  cors({
    origin: "http://localhost:5173",
  })
);

app.use(express.json());

// Check whether the backend is running.
app.get("/", (req, res) => {
  res.json({
    message: "F.R.I.D.A.Y. backend is online!",
  });
});

// Normal AI chat endpoint.
app.post("/api/chat", async (req, res) => {
  try {
    const { message } = req.body;

    if (typeof message !== "string" || !message.trim()) {
      return res.status(400).json({
        error: "Please provide a message.",
      });
    }

    const aiResponse = await fetch(
      "http://localhost:11434/api/generate",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "qwen2.5:3b",
          prompt: message,
          stream: false,
        }),
      }
    );

    if (!aiResponse.ok) {
      return res.status(502).json({
        error: "Ollama could not process the request.",
      });
    }

    const data = await aiResponse.json();

    return res.json({
      reply: data.response,
    });
  } catch (error) {
    console.error("Chat error:", error.message);

    return res.status(500).json({
      error: "Could not connect to Ollama. Check whether it is running.",
    });
  }
});

// Computer action endpoint.
app.post("/api/action", async (req, res) => {
  try {
    const { message } = req.body;

    if (typeof message !== "string" || !message.trim()) {
      return res.status(400).json({
        success: false,
        error: "Please provide a command.",
      });
    }

    // Ask the local AI to choose an approved action.
    const aiResponse = await fetch(
      "http://localhost:11434/api/generate",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "qwen2.5:3b",
          stream: false,
          format: "json",
          prompt: `
You are F.R.I.D.A.Y., a Windows assistant.
Choose exactly one action from the list.

If the user asks to open File Explorer or File Manager:
{"action":"open_file_manager"}

If the user asks to open Google Chrome:
{"action":"open_chrome"}

For every other request:
{"action":"unsupported"}

User request: ${JSON.stringify(message)}
Return only JSON.
`,
        }),
      }
    );

    if (!aiResponse.ok) {
      return res.status(502).json({
        success: false,
        error: "AI service request failed.",
      });
    }

    const data = await aiResponse.json();

    let decision;

    try {
      decision = JSON.parse(data.response);
    } catch {
      return res.status(502).json({
        success: false,
        error: "The AI returned an invalid action response.",
      });
    }

    // Resolve Chrome from common Windows installation paths.
    const chromePaths = [
      "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
      "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
      `${process.env.LOCALAPPDATA}\\Google\\Chrome\\Application\\chrome.exe`,
    ];

    const actions = {
      open_file_manager: () => ({
        executable: "explorer.exe",
        args: [],
      }),

      open_chrome: () => {
        const chromePath = chromePaths.find(
          (path) => path && fs.existsSync(path)
        );

        if (!chromePath) {
          throw new Error(
            "Chrome was not found in the standard installation paths."
          );
        }

        return {
          executable: chromePath,
          args: [],
        };
      },
    };

    // Strict allow-list: no arbitrary commands are accepted.
    if (
      typeof decision.action !== "string" ||
      !Object.hasOwn(actions, decision.action)
    ) {
      return res.status(400).json({
        success: false,
        message: "This command is not supported yet.",
      });
    }

    const { executable, args } = actions[decision.action]();

    const child = spawn(executable, args, {
      detached: true,
      stdio: "ignore",
      shell: false,
    });

    child.once("error", (error) => {
      console.error("Application launch error:", error.message);
    });

    child.unref();

    const messages = {
      open_file_manager: "File Explorer launch requested.",
      open_chrome: "Google Chrome launch requested.",
    };

    return res.json({
      success: true,
      action: decision.action,
      message: messages[decision.action],
    });
  } catch (error) {
    console.error("Action error:", error.message);

    return res.status(500).json({
      success: false,
      error: error.message || "Could not process the command.",
    });
  }
});

// Start the backend server.
app.listen(PORT, "127.0.0.1", () => {
  console.log(
    `F.R.I.D.A.Y. backend is running at http://127.0.0.1:${PORT}`
  );
});
