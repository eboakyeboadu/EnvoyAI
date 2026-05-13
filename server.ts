import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import axios from "axios";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Gemini Proxy Endpoint
  app.post("/api/gemini", async (req, res) => {
    try {
      const { model: modelName, contents, config, tools } = req.body;
      const response = await ai.models.generateContent({
        model: modelName || "gemini-3-flash-preview",
        contents,
        tools,
        config
      });
      res.json({ text: response.text });
    } catch (err: any) {
      console.error('Gemini error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // LinkedIn OAuth Configuration
  const LINKEDIN_CLIENT_ID = process.env.VITE_LINKEDIN_CLIENT_ID;
  const LINKEDIN_CLIENT_SECRET = process.env.LINKEDIN_CLIENT_SECRET;
  
  // 1. Get Auth URL
  app.get("/api/auth/linkedin/url", (req, res) => {
    const redirectUri = `${req.protocol}://${req.get('host')}/auth/linkedin/callback`;
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: LINKEDIN_CLIENT_ID || '',
      redirect_uri: redirectUri,
      scope: 'openid profile email', // Standard LinkedIn OpenID Connect scopes
    });
    
    // LinkedIn authorization endpoint
    const authUrl = `https://www.linkedin.com/oauth/v2/authorization?${params}`;
    res.json({ url: authUrl });
  });

  // 2. Callback handler
  app.get(["/auth/linkedin/callback", "/auth/linkedin/callback/"], async (req, res) => {
    const { code, error } = req.query;

    if (error) {
      return res.send(`
        <html>
          <body>
            <script>
              window.opener.postMessage({ type: 'LINKEDIN_AUTH_ERROR', error: '${error}' }, '*');
              window.close();
            </script>
          </body>
        </html>
      `);
    }

    try {
      const redirectUri = `${req.protocol}://${req.get('host')}/auth/linkedin/callback`;
      
      // Exchange code for token
      const tokenResponse = await axios.post('https://www.linkedin.com/oauth/v2/accessToken', 
        new URLSearchParams({
          grant_type: 'authorization_code',
          code: code as string,
          redirect_uri: redirectUri,
          client_id: LINKEDIN_CLIENT_ID || '',
          client_secret: LINKEDIN_CLIENT_SECRET || '',
        }).toString(),
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        }
      );

      const accessToken = tokenResponse.data.access_token;

      // Get profile info
      const profileResponse = await axios.get('https://api.linkedin.com/v2/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` }
      });

      const profile = profileResponse.data;

      // Send success message to parent window and close popup
      res.send(`
        <html>
          <body>
            <script>
              if (window.opener) {
                window.opener.postMessage({ 
                  type: 'LINKEDIN_AUTH_SUCCESS', 
                  profile: ${JSON.stringify(profile)},
                  accessToken: '${accessToken}'
                }, '*');
                window.close();
              } else {
                window.location.href = '/';
              }
            </script>
            <p>Authentication successful. Synchronizing profile...</p>
          </body>
        </html>
      `);
    } catch (err: any) {
      console.error('LinkedIn exchange error:', err.response?.data || err.message);
      res.status(500).send('Authentication failed');
    }
  });

  // API routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
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
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
