import cors from "cors";
import express from "express";
import { config } from "./config.js";
import { createPool } from "./db.js";
import { sendRegistrationEmails } from "./email.js";
import { runMigrations } from "./migrate.js";

const app = express();
const pool = createPool();
const defaultCorsOrigins = [
  "https://sheqbuddy.com",
  "https://www.sheqbuddy.com",
  "https://register.sheqbuddy.com",
  "https://app.sheqbuddy.com",
  "https://demo.sheqbuddy.com",
  "http://127.0.0.1:8100",
  "http://127.0.0.1:8101",
  "http://127.0.0.1:8140"
];
const allowedOrigins = new Set([...defaultCorsOrigins, ...config.corsOrigins].map((origin) => origin.toLowerCase()));

function normalizeOrigin(origin = "") {
  return origin.toLowerCase().replace(/\/$/, "");
}

app.use(express.json({ limit: "1mb" }));
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.has(normalizeOrigin(origin))) {
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

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function parseStatePayload(payload) {
  if (!payload) return null;
  if (typeof payload === "string") return JSON.parse(payload);
  return payload;
}

function nextRegistrationId(registrations = []) {
  const highest = registrations.reduce((max, item) => {
    const number = Number(String(item.id || "").replace(/\D/g, ""));
    return Number.isFinite(number) && number > max ? number : max;
  }, 0);
  return `REG-${String(highest + 1).padStart(4, "0")}`;
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

app.post("/registrations/public", async (request, response) => {
  const data = request.body || {};
  const company = String(data.company || "").trim();
  const contactName = String(data.contactName || data.name || "").trim();
  const email = String(data.email || "").trim();

  if (!company || !contactName || !email) {
    response.status(400).json({ ok: false, error: "Company, contact name and email are required" });
    return;
  }

  try {
    const [rows] = await pool.execute(
      "SELECT payload FROM app_state_snapshots WHERE namespace = ? AND workspace_key = ?",
      ["admin-portal", "sheqbuddy-admin"]
    );
    const state = parseStatePayload(rows[0]?.payload) || {};
    const registrations = Array.isArray(state.registrations) ? state.registrations : [];
    const registration = {
      id: nextRegistrationId(registrations),
      createdAt: todayIso(),
      company,
      contactName,
      email,
      phone: String(data.phone || "").trim(),
      plan: data.plan || "Starter - 10 users",
      requestedUsers: String(data.requestedUsers || data.users || "").trim(),
      paymentMethod: data.paymentMethod || "Pending",
      paymentReference: data.paymentReference || "",
      paymentStatus: "Pending",
      stage: "Pending payment",
      activationCode: "",
      notes: String(data.notes || "").trim(),
      source: "public-website"
    };
    const nextState = { ...state, registrations: [registration, ...registrations] };

    await pool.execute(
      `INSERT INTO app_state_snapshots (namespace, workspace_key, payload)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE payload = VALUES(payload), updated_at = CURRENT_TIMESTAMP`,
      ["admin-portal", "sheqbuddy-admin", JSON.stringify(nextState)]
    );
    const emailResult = await sendRegistrationEmails(registration).catch((error) => ({
      sent: false,
      reason: error.message
    }));
    response.status(201).json({ ok: true, registrationId: registration.id, email: emailResult });
  } catch (error) {
    response.status(500).json({ ok: false, error: error.message });
  }
});

app.post("/integrations/users/import", async (request, response) => {
  const { tenantId = "default", source = "flat-file", users = [], divisions = [] } = request.body || {};

  if (!Array.isArray(users)) {
    response.status(400).json({ ok: false, error: "users must be an array" });
    return;
  }

  try {
    await pool.execute(
      `INSERT INTO app_state_snapshots (namespace, workspace_key, payload)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE payload = VALUES(payload), updated_at = CURRENT_TIMESTAMP`,
      [
        "user-import",
        String(tenantId).slice(0, 160),
        JSON.stringify({
          source,
          tenantId,
          users,
          divisions: Array.isArray(divisions) ? divisions : [],
          importedAt: new Date().toISOString()
        })
      ]
    );
    response.json({ ok: true, importedUsers: users.length, importedDivisions: Array.isArray(divisions) ? divisions.length : 0 });
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
