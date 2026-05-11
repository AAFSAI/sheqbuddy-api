import { createPool } from "./db.js";

const pool = createPool();

const statements = [
  `CREATE TABLE IF NOT EXISTS tenants (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    tenant_key VARCHAR(80) NOT NULL UNIQUE,
    company_name VARCHAR(255) NOT NULL,
    primary_contact VARCHAR(255),
    email VARCHAR(255),
    status ENUM('Active','Suspended','Expired','Cancelled') NOT NULL DEFAULT 'Active',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS licences (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    tenant_id BIGINT UNSIGNED NOT NULL,
    licence_key VARCHAR(120) NOT NULL UNIQUE,
    plan_name VARCHAR(120) NOT NULL,
    user_limit INT UNSIGNED NOT NULL DEFAULT 10,
    status ENUM('Active','Trial','Suspended','Expired','Cancelled') NOT NULL DEFAULT 'Trial',
    activation_code VARCHAR(120) NOT NULL UNIQUE,
    start_date DATE,
    renewal_date DATE,
    payment_status ENUM('Pending','Paid','Waived','Rejected','Expired') NOT NULL DEFAULT 'Pending',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_licences_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id)
  )`,
  `CREATE TABLE IF NOT EXISTS users (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    tenant_id BIGINT UNSIGNED NOT NULL,
    email VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role ENUM('User','Manager','Senior Manager','Company Admin') NOT NULL DEFAULT 'User',
    division VARCHAR(255),
    job_role VARCHAR(255),
    status ENUM('Invited','Email verified','Active','Suspended','Removed') NOT NULL DEFAULT 'Invited',
    email_verified_at TIMESTAMP NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_users_tenant_email (tenant_id, email),
    CONSTRAINT fk_users_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id)
  )`,
  `CREATE TABLE IF NOT EXISTS devices (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    tenant_id BIGINT UNSIGNED NOT NULL,
    user_id BIGINT UNSIGNED NOT NULL,
    device_key VARCHAR(160) NOT NULL UNIQUE,
    platform VARCHAR(80),
    device_name VARCHAR(255),
    status ENUM('Active','Revoked') NOT NULL DEFAULT 'Active',
    activated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_sync_at TIMESTAMP NULL,
    CONSTRAINT fk_devices_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    CONSTRAINT fk_devices_user FOREIGN KEY (user_id) REFERENCES users(id)
  )`,
  `CREATE TABLE IF NOT EXISTS activation_events (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    tenant_id BIGINT UNSIGNED NOT NULL,
    user_id BIGINT UNSIGNED NULL,
    device_id BIGINT UNSIGNED NULL,
    event_type VARCHAR(120) NOT NULL,
    notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_activation_events_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id)
  )`,
  `CREATE TABLE IF NOT EXISTS reports (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    tenant_id BIGINT UNSIGNED NOT NULL,
    report_key VARCHAR(80) NOT NULL,
    module VARCHAR(80) NOT NULL,
    stage VARCHAR(120),
    reporter_email VARCHAR(255),
    division VARCHAR(255),
    payload JSON NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_reports_tenant_key (tenant_id, report_key),
    CONSTRAINT fk_reports_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id)
  )`,
  `CREATE TABLE IF NOT EXISTS actions (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    tenant_id BIGINT UNSIGNED NOT NULL,
    action_key VARCHAR(80) NOT NULL,
    assigned_email VARCHAR(255),
    stage VARCHAR(120),
    due_date DATE,
    payload JSON NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_actions_tenant_key (tenant_id, action_key),
    CONSTRAINT fk_actions_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id)
  )`,
  `CREATE TABLE IF NOT EXISTS notification_queue (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    tenant_id BIGINT UNSIGNED NULL,
    recipient_email VARCHAR(255) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    status ENUM('Queued','Sent','Failed') NOT NULL DEFAULT 'Queued',
    send_after TIMESTAMP NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS payments (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    tenant_id BIGINT UNSIGNED NULL,
    provider VARCHAR(80),
    reference VARCHAR(255),
    status ENUM('Pending','Paid','Waived','Rejected','Expired') NOT NULL DEFAULT 'Pending',
    amount_cents INT UNSIGNED NULL,
    currency CHAR(3) DEFAULT 'AUD',
    notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  )`
];

try {
  for (const statement of statements) {
    await pool.query(statement);
  }
  console.log(`Applied ${statements.length} database migration statements.`);
} finally {
  await pool.end();
}
