import cors from "cors";
import express from "express";
import { config } from "./config.js";
import { createPool } from "./db.js";

const app = express();
const pool = createPool();

app.use(express.json({ limit: "1mb" }));
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || config.corsOrigins.length === 0 || config.corsOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error("Origin not allowed by CORS"));
    }
  })
);

app.get("/health", (_request, response) => {
  response.json({
    ok: true,
    service: "sheqbuddy-api",
    environment: config.env,
    timestamp: new Date().toISOString()
  });
});

app.get("/db/health", async (_request, response) => {
  try {
    const [rows] = await pool.query("SELECT 1 AS ok");
    response.json({ ok: rows[0]?.ok === 1 });
  } catch (error) {
    response.status(500).json({ ok: false, error: error.message });
  }
});

app.use((_request, response) => {
  response.status(404).json({ ok: false, error: "Not found" });
});

app.listen(config.port, () => {
  console.log(`SHEQBuddy API listening on port ${config.port}`);
});
