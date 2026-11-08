-- Apply before starting the updated server. Does not alter existing users or reservations.
CREATE TABLE IF NOT EXISTS otp_challenges (
  id CHAR(36) PRIMARY KEY,
  phone VARCHAR(20) NOT NULL,
  code_digest CHAR(64) NOT NULL,
  ip_hash CHAR(64) NOT NULL,
  session_digest CHAR(64) NOT NULL,
  attempts INT NOT NULL DEFAULT 0,
  used TINYINT NOT NULL DEFAULT 0,
  sent TINYINT NOT NULL DEFAULT 0,
  expires_at DATETIME NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX otp_phone_created (phone, created_at),
  INDEX otp_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS auth_sessions (
  id CHAR(64) PRIMARY KEY,
  data MEDIUMTEXT NOT NULL,
  expires_at DATETIME NOT NULL,
  INDEX session_expiry (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
