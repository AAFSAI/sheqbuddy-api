import cors from "cors";
import express from "express";
import { config } from "./config.js";
import { createPool } from "./db.js";
import { runMigrations } from "./migrate.js";

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

function workspaceKey(request) {
  return String(request.query.key || request.body?.key || "default").slice(0, 160);
}

function requireStateNamespace(namespace, response) {
  if (!["admin-portal", "sheq-app"].includes(namespace)) {
    response.status(400).json({ ok: false, error: "Unsupported state namespace" });
    return false;
  }
  return true;
}

app.get("/state/:namespace", async (request, response) => {
  const { namespace } = request.params;
  if (!requireStateNamespace(namespace, response)) return;

  try {
    const [rows] = await pool.execute(
      "SELECT payload, updated_at FROM app_state_snapshots WHERE namespace = ? AND workspace_key = ?",
      [namespace, workspaceKey(request)]
    );
    response.json({
      ok: true,
      state: rows[0]?.payload || null,
      updatedAt: rows[0]?.updated_at || null
    });
  } catch (error) {
    response.status(500).json({ ok: false, error: error.message });
  }
});

app.put("/state/:namespace", async (request, response) => {
  const { namespace } = request.params;
  if (!requireStateNamespace(namespace, response)) return;

  const payload = request.body?.state;
  if (!payload || typeof payload !== "object") {
    response.status(400).json({ ok: false, error: "State payload is required" });
    return;
  }

  try {
    await pool.execute(
      `INSERT INTO app_state_snapshots (namespace, workspace_key, payload)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE payload = VALUES(payload), updated_at = CURRENT_TIMESTAMP`,
      [namespace, workspaceKey(request), JSON.stringify(payload)]
    );
    response.json({ ok: true });
  } catch (error) {
    response.status(500).json({ ok: false, error: error.message });
  }
});

app.post("/admin/migrate", async (request, response) => {
  const suppliedKey = request.get("x-admin-task-key") || request.query.key;

  if (!config.adminTaskKey || suppliedKey !== config.adminTaskKey) {
    response.status(403).json({ ok: false, error: "Forbidden" });
    return;
  }

  try {
    const result = await runMigrations();
    response.json({ ok: true, ...result });
  } catch (error) {
    response.status(500).json({ ok: false, error: error.message });
  }
});

app.get("/admin/migrate", async (request, response) => {
  const suppliedKey = request.query.key;

  if (!config.adminTaskKey || suppliedKey !== config.adminTaskKey) {
    response.status(403).json({ ok: false, error: "Forbidden" });
    return;
  }

  try {
    const result = await runMigrations();
    response.json({ ok: true, ...result });
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
