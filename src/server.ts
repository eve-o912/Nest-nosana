/**
 * Express server to serve frontend and provide API endpoints
 */

import express, { Request, Response } from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.SERVER_PORT || 3000;

app.use(cors());
app.use(express.json());

// In-memory cache for yield data (populated by the plugin)
let yieldCache: {
  pools: unknown[];
  timestamp: string;
} = {
  pools: [],
  timestamp: new Date().toISOString(),
};

// Chat endpoint - forwards to ElizaOS runtime
app.post("/api/chat", async (req: Request, res: Response) => {
  try {
    const { message } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }

    // In production, this would interact with the ElizaOS runtime
    // For now, return a simple response indicating the agent is processing
    res.json({
      text: `Processing: "${message}"\n\n(This endpoint should connect to the ElizaOS agent runtime. The agent actions are defined in plugin-yieldscout.)`,
      content: {
        pools: yieldCache.pools.slice(0, 5),
      },
    });
  } catch (error) {
    console.error("Chat error:", error);
    res.status(500).json({ 
      error: "Failed to process message",
      text: "Sorry, I encountered an error. Please try again."
    });
  }
});

// Yields endpoint - returns cached pool data
app.get("/api/yields", (_req: Request, res: Response) => {
  res.json({
    pools: yieldCache.pools,
    timestamp: yieldCache.timestamp,
    count: yieldCache.pools.length,
  });
});

// Update cache endpoint (called by the plugin)
app.post("/api/cache/update", (req: Request, res: Response) => {
  const { pools, timestamp } = req.body;
  if (pools && Array.isArray(pools)) {
    yieldCache = {
      pools,
      timestamp: timestamp || new Date().toISOString(),
    };
    res.json({ success: true, count: pools.length });
  } else {
    res.status(400).json({ error: "Invalid pool data" });
  }
});

// Health check
app.get("/api/health", (_req: Request, res: Response) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    pools_cached: yieldCache.pools.length,
  });
});

// Serve static frontend files
app.use(express.static(path.join(__dirname, "../frontend/dist")));

// Fallback to index.html for SPA routes
app.get("*", (_req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, "../frontend/dist/index.html"));
});

app.listen(PORT, () => {
  console.log(`[Server] Running on port ${PORT}`);
  console.log(`[Server] API available at http://localhost:${PORT}/api`);
  console.log(`[Server] Frontend available at http://localhost:${PORT}`);
});

export default app;
