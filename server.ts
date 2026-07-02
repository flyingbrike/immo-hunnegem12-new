import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import nodemailer from "nodemailer";

let aiClient: GoogleGenAI | null = null;
let isApiKeyConfirmedExpired = false;

function getAiClient(): GoogleGenAI | null {
  if (isApiKeyConfirmedExpired) {
    return null;
  }

  const key = process.env.GEMINI_API_KEY;
  if (!key || key.trim() === "" || key === "MY_GEMINI_API_KEY" || key.includes("YOUR_")) {
    return null;
  }

  if (!aiClient) {
    try {
      aiClient = new GoogleGenAI({
        apiKey: key.trim(),
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });
    } catch (e) {
      return null;
    }
  }

  return aiClient;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Configure high-volume body limits for full original PDF uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // Create local storage directory if not exists
  const uploadsDir = path.join(process.cwd(), "uploads");
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  // Local File Upload proxy endpoint
  app.post("/api/upload", async (req, res) => {
    try {
      const { fileName, fileType, base64Data } = req.body;
      if (!base64Data) {
        return res.status(400).json({ error: "Missing file base64 data" });
      }

      // Strip potential mime prefix
      const base64Clean = base64Data.replace(/^data:.*;base64,/, "");
      const buffer = Buffer.from(base64Clean, "base64");

      // Sanitize the file name to avoid injection or path-traversal
      const safeName = fileName.replace(/[^a-zA-Z0-9.\-_]/g, "_");
      const savedFileName = `${Date.now()}_${safeName}`;
      const savedFilePath = path.join(uploadsDir, savedFileName);

      fs.writeFileSync(savedFilePath, buffer);

      console.log(`[Upload] File saved locally: ${savedFileName} (${(buffer.length / 1024).toFixed(1)} KB)`);

      res.json({
        success: true,
        url: `/uploads/${savedFileName}`,
        fileName: safeName,
        fileSize: (buffer.length / 1024).toFixed(1) + " KB"
      });
    } catch (err: any) {
      console.error("[Upload] Local write failed:", err);
      res.status(500).json({ error: err.message || "Failed to write file" });
    }
  });

  // Local JSON Database Endpoints
  const galleryJsonPath = path.join(uploadsDir, "db_gallery.json");
  const surroundingsJsonPath = path.join(uploadsDir, "db_surroundings.json");
  const pagesJsonPath = path.join(uploadsDir, "db_pages.json");

  // Helper to read JSON safely
  function readJsonFile(filePath: string, defaultValue: any) {
    try {
      if (fs.existsSync(filePath)) {
        return JSON.parse(fs.readFileSync(filePath, "utf8"));
      }
    } catch (e) {
      console.error(`Error reading database file ${filePath}:`, e);
    }
    return defaultValue;
  }

  // Helper to write JSON safely
  function writeJsonFile(filePath: string, data: any) {
    try {
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
    } catch (e) {
      console.error(`Error writing database file ${filePath}:`, e);
    }
  }

  // Gallery Endpoints
  app.get("/api/db/gallery", (req, res) => {
    const data = readJsonFile(galleryJsonPath, []);
    res.json(data);
  });

  app.post("/api/db/gallery", (req, res) => {
    const { image } = req.body;
    if (!image || !image.id) {
      return res.status(400).json({ error: "Invalid image data" });
    }
    const gallery = readJsonFile(galleryJsonPath, []);
    const index = gallery.findIndex((item: any) => item.id === image.id);
    if (index >= 0) {
      gallery[index] = { ...gallery[index], ...image, updatedAt: new Date().toISOString() };
    } else {
      gallery.push({ ...image, createdAt: new Date().toISOString() });
    }
    writeJsonFile(galleryJsonPath, gallery);
    res.json({ success: true, image });
  });

  app.delete("/api/db/gallery/:id", (req, res) => {
    const { id } = req.params;
    let gallery = readJsonFile(galleryJsonPath, []);
    const imgToDelete = gallery.find((item: any) => item.id === id);
    if (imgToDelete && imgToDelete.url && imgToDelete.url.startsWith("/uploads/")) {
      try {
        const physicalPath = path.join(process.cwd(), imgToDelete.url);
        if (fs.existsSync(physicalPath)) {
          fs.unlinkSync(physicalPath);
          console.log(`[Database] Deleted orphaned file: ${physicalPath}`);
        }
      } catch (e) {
        console.error("Failed to delete local file:", e);
      }
    }
    gallery = gallery.filter((item: any) => item.id !== id);
    writeJsonFile(galleryJsonPath, gallery);
    res.json({ success: true });
  });

  // Surroundings Endpoints
  app.get("/api/db/surroundings", (req, res) => {
    const data = readJsonFile(surroundingsJsonPath, []);
    res.json(data);
  });

  app.post("/api/db/surroundings", (req, res) => {
    const { image } = req.body;
    if (!image || !image.id) {
      return res.status(400).json({ error: "Invalid image data" });
    }
    const surroundings = readJsonFile(surroundingsJsonPath, []);
    const index = surroundings.findIndex((item: any) => item.id === image.id);
    if (index >= 0) {
      surroundings[index] = { ...surroundings[index], ...image, updatedAt: new Date().toISOString() };
    } else {
      surroundings.push({ ...image, createdAt: new Date().toISOString() });
    }
    writeJsonFile(surroundingsJsonPath, surroundings);
    res.json({ success: true, image });
  });

  app.delete("/api/db/surroundings/:id", (req, res) => {
    const { id } = req.params;
    let surroundings = readJsonFile(surroundingsJsonPath, []);
    const imgToDelete = surroundings.find((item: any) => item.id === id);
    if (imgToDelete && imgToDelete.url && imgToDelete.url.startsWith("/uploads/")) {
      try {
        const physicalPath = path.join(process.cwd(), imgToDelete.url);
        if (fs.existsSync(physicalPath)) {
          fs.unlinkSync(physicalPath);
          console.log(`[Database] Deleted orphaned file: ${physicalPath}`);
        }
      } catch (e) {
        console.error("Failed to delete local file:", e);
      }
    }
    surroundings = surroundings.filter((item: any) => item.id !== id);
    writeJsonFile(surroundingsJsonPath, surroundings);
    res.json({ success: true });
  });

  // Pages Text Endpoints (e.g. home_data, technical_data, contact_data, surroundings_data, gallery_data)
  app.get("/api/db/pages/:collection", (req, res) => {
    const { collection } = req.params;
    const pages = readJsonFile(pagesJsonPath, {});
    res.json(pages[collection] || {});
  });

  app.post("/api/db/pages/:collection", (req, res) => {
    const { collection } = req.params;
    const { data } = req.body;
    if (!data) {
      return res.status(400).json({ error: "Invalid page data" });
    }
    const pages = readJsonFile(pagesJsonPath, {});
    pages[collection] = {
      ...(pages[collection] || {}),
      ...data,
      updatedAt: new Date().toISOString()
    };
    writeJsonFile(pagesJsonPath, pages);
    res.json({ success: true, data: pages[collection] });
  });

  // Local Messages Endpoints
  const messagesJsonPath = path.join(uploadsDir, "db_messages.json");

  app.get("/api/db/messages", (req, res) => {
    const data = readJsonFile(messagesJsonPath, []);
    res.json(data);
  });

  app.post("/api/db/messages", (req, res) => {
    const { message } = req.body;
    if (!message || !message.id) {
      return res.status(400).json({ error: "Invalid message data" });
    }
    const messages = readJsonFile(messagesJsonPath, []);
    messages.push({ ...message, createdAt: new Date().toISOString() });
    writeJsonFile(messagesJsonPath, messages);
    res.json({ success: true, message });
  });

  app.delete("/api/db/messages/:id", (req, res) => {
    const { id } = req.params;
    let messages = readJsonFile(messagesJsonPath, []);
    messages = messages.filter((item: any) => item.id !== id);
    writeJsonFile(messagesJsonPath, messages);
    res.json({ success: true });
  });

  // Local static file serving endpoint for uploaded items
  app.get("/uploads/:filename", (req, res) => {
    try {
      const filename = req.params.filename;
      const safeFilename = path.basename(filename);
      const filePath = path.join(uploadsDir, safeFilename);

      if (fs.existsSync(filePath)) {
        res.sendFile(filePath);
      } else {
        res.status(404).send("File not found");
      }
    } catch (err) {
      res.status(500).send("Error rendering file");
    }
  });

  // AI Route voor slimme samenvatting
  app.post("/api/ai-summary", async (req, res) => {
    const fallbackSummary = "Dit unieke, stijlvolle en verrassend ruime appartement in het hart van Geraardsbergen biedt een perfecte combinatie van historisch karakter en modern comfort. Gekenmerkt door overvloedig lichtinval, royale open leefruimten en een uiterst gunstig EPC-label B, is dit de ultieme oase van rust in de Vlaamse Ardennen.";
    
    // Check if client is available
    const client = getAiClient();
    if (!client) {
      return res.json({ summary: fallbackSummary, fallback: true });
    }

    try {
      const { specs } = req.body;
      const prompt = `Je bent een luxe vastgoedmakelaar. Schrijf een verleidelijke, korte verkooptekst (max 100 woorden) in het Nederlands voor een appartement met deze kenmerken: ${specs}. Focus op luxe en emotie.`;
      
      const response = await client.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
      });

      res.json({ summary: response.text });
    } catch (error: any) {
      const errMsg = error?.message || String(error);
      if (errMsg.includes("API key expired") || errMsg.includes("API_KEY_INVALID") || errMsg.includes("400") || errMsg.includes("key")) {
        isApiKeyConfirmedExpired = true;
        console.log("Status: Switching to high-fidelity local content fallback.");
      } else {
        console.log("Summary update: Using default layout presentation.");
      }
      res.json({ summary: fallbackSummary, fallback: true });
    }
  });

  // API Route voor contact formulier
  app.post("/api/contact", async (req, res) => {
    const { name, email, subject, message } = req.body;
    console.log("Contact aanvraag ontvangen:", { name, email, subject, message });

    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = process.env.SMTP_PORT;
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;
    const smtpFrom = process.env.SMTP_FROM || smtpUser;
    const smtpTo = process.env.SMTP_TO || "eriksuniverse@gmail.com";

    let emailSent = false;
    let smtpConfigured = !!(smtpHost && smtpUser && smtpPass);
    let errorMessage = "";

    if (smtpConfigured) {
      try {
        const transporter = nodemailer.createTransport({
          host: smtpHost,
          port: parseInt(smtpPort || "587"),
          secure: smtpPort === "465", // Use SSL for port 465, TLS/STARTTLS for others
          auth: {
            user: smtpUser,
            pass: smtpPass,
          },
        });

        const mailSubject = `[Hunnegemresidentie Lead] ${subject || "Nieuw contactbericht"}`;
        const mailHtml = `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
            <div style="background-color: #0f172a; padding: 24px; border-radius: 8px 8px 0 0; text-align: center; color: #ffffff;">
              <h1 style="margin: 0; font-size: 20px; font-weight: 800; letter-spacing: -0.025em; text-transform: uppercase;">Hunnegemresidentie</h1>
              <p style="margin: 4px 0 0 0; font-size: 12px; color: #94a3b8;">Nieuwe lead aanvraag van de website</p>
            </div>
            <div style="padding: 24px; color: #334155;">
              <h2 style="font-size: 16px; font-weight: 700; color: #0f172a; margin-top: 0; margin-bottom: 20px;">Bericht Details</h2>
              
              <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 8px 0; font-weight: 700; width: 120px; color: #64748b; font-size: 13px; border-bottom: 1px solid #f1f5f9;">Naam:</td>
                  <td style="padding: 8px 0; color: #0f172a; font-size: 14px; border-bottom: 1px solid #f1f5f9;">${name || "Onbekend"}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-weight: 700; color: #64748b; font-size: 13px; border-bottom: 1px solid #f1f5f9;">E-mail:</td>
                  <td style="padding: 8px 0; color: #0f172a; font-size: 14px; border-bottom: 1px solid #f1f5f9;"><a href="mailto:${email}" style="color: #0284c7; text-decoration: none;">${email}</a></td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-weight: 700; color: #64748b; font-size: 13px; border-bottom: 1px solid #f1f5f9;">Onderwerp:</td>
                  <td style="padding: 8px 0; color: #0f172a; font-size: 14px; border-bottom: 1px solid #f1f5f9;">${subject || "Geen onderwerp aangegeven"}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-weight: 700; color: #64748b; font-size: 13px; border-bottom: 1px solid #f1f5f9;">Datum/Tijd:</td>
                  <td style="padding: 8px 0; color: #0f172a; font-size: 14px; border-bottom: 1px solid #f1f5f9;">${new Date().toLocaleString("nl-BE")}</td>
                </tr>
              </table>

              <div style="background-color: #f8fafc; padding: 16px; border-radius: 8px; border-left: 4px solid #475569; margin-bottom: 24px;">
                <h3 style="font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; margin-top: 0; margin-bottom: 8px;">Bericht</h3>
                <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #0f172a; white-space: pre-wrap;">${message || "Geen tekst ingevuld."}</p>
              </div>

              <div style="text-align: center; margin-top: 32px;">
                <a href="mailto:${email}" style="display: inline-block; background-color: #1e293b; color: #ffffff; padding: 12px 24px; border-radius: 6px; font-weight: 700; font-size: 13px; text-decoration: none; text-transform: uppercase; letter-spacing: 0.05em;">Beantwoord Lead</a>
              </div>
            </div>
            <div style="background-color: #f1f5f9; padding: 16px; border-radius: 0 0 8px 8px; text-align: center; font-size: 11px; color: #64748b;">
              Dit bericht is automatisch gegenereerd door het Hunnegemresidentie vastgoedportaal.
            </div>
          </div>
        `;

        await transporter.sendMail({
          from: smtpFrom,
          to: smtpTo,
          replyTo: email,
          subject: mailSubject,
          html: mailHtml,
        });

        emailSent = true;
        console.log(`[SMTP] Contact email successfully sent via ${smtpHost} to ${smtpTo}`);
      } catch (err: any) {
        console.error("[SMTP] Contact email failure:", err);
        errorMessage = err.message || String(err);
      }
    } else {
      console.warn("[SMTP] SMTP host is not configured. Email NOT physically sent. Declare SMTP_HOST, SMTP_PORT, SMTP_USER, and SMTP_PASS in secrets.");
    }

    res.json({
      success: true,
      message: "Bericht ontvangen.",
      emailSent,
      smtpConfigured,
      ...(errorMessage ? { error: errorMessage } : {})
    });
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
