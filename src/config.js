import dotenv from "dotenv";

dotenv.config();

export const config = {
  env: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT || 3000),
  db: {
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT || 3306),
    database: process.env.DB_NAME || "",
    user: process.env.DB_USER || "",
    password: process.env.DB_PASSWORD || ""
  },
  corsOrigins: String(process.env.CORS_ORIGINS || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
  email: {
    provider: process.env.EMAIL_PROVIDER || "manual",
    from: process.env.EMAIL_FROM || "info@sheqbuddy.com",
    notifyTo: process.env.REGISTRATION_NOTIFY_TO || process.env.EMAIL_FROM || "info@sheqbuddy.com",
    smtp: {
      host: process.env.SMTP_HOST || "",
      port: Number(process.env.SMTP_PORT || 465),
      secure: String(process.env.SMTP_SECURE || "true").toLowerCase() !== "false",
      user: process.env.SMTP_USER || "",
      password: process.env.SMTP_PASS || ""
    }
  },
  adminTaskKey: process.env.ADMIN_TASK_KEY || process.env.JWT_SECRET || ""
};
