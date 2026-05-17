import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // AI Route voor slimme samenvatting
  app.post("/api/ai-summary", async (req, res) => {
    try {
      const { specs } = req.body;
      const prompt = `Je bent een luxe vastgoedmakelaar. Schrijf een verleidelijke, korte verkooptekst (max 100 woorden) in het Nederlands voor een appartement met deze kenmerken: ${specs}. Focus op luxe en emotie.`;
      
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
      });

      res.json({ summary: response.text });
    } catch (error) {
      console.error("AI Error:", error);
      res.status(500).json({ error: "Kon geen samenvatting genereren" });
    }
  });

  // API Route voor contact formulier
  app.post("/api/contact", (req, res) => {
    const { name, email, message } = req.body;
    console.log("Contact aanvraag ontvangen:", { name, email, message });
    res.json({ success: true, message: "Bericht ontvangen" });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server draait op http://localhost:${PORT}`);
  });
}

startServer();
