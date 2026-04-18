-- Room Reservation System DB Schema

CREATE TABLE IF NOT EXISTS departments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  dept_name VARCHAR(100) NOT NULL UNIQUE,
  parent_dept_id INT DEFAULT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (parent_dept_id) REFERENCES departments(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id VARCHAR(50) NOT NULL UNIQUE, -- Login ID or Kakao ID
  password_hash VARCHAR(255),          -- Optional if using Kakao
  user_name VARCHAR(100) NOT NULL,
  email VARCHAR(100),
  phone VARCHAR(20),
  dept_name VARCHAR(100),
  kakao_id VARCHAR(50) UNIQUE,         -- Store Kakao unique identifier
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (dept_name) REFERENCES departments(dept_name) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS roles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  role_name VARCHAR(50) NOT NULL UNIQUE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS user_roles (
  user_id INT NOT NULL,
  role_id INT NOT NULL,
  PRIMARY KEY (user_id, role_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Room Information
CREATE TABLE IF NOT EXISTS rooms (
  id INT AUTO_INCREMENT PRIMARY KEY,
  room_name VARCHAR(100) NOT NULL,
  floor VARCHAR(20) NOT NULL,
  dept_name VARCHAR(100), -- Managed department
  manager_name VARCHAR(100),
  manager_contact VARCHAR(50),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (dept_name) REFERENCES departments(dept_name) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Reservations
CREATE TABLE IF NOT EXISTS reservations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  room_id INT NOT NULL,
  requester_id INT, -- FK to users if logged in
  requester_name VARCHAR(100) NOT NULL,
  requester_phone VARCHAR(50),
  reservation_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  reason TEXT,
  status VARCHAR(20) DEFAULT 'approved', -- approved, cancelled
  is_recurring BOOLEAN DEFAULT FALSE,
  recurrence_rule VARCHAR(100), -- e.g., 'WEEKLY', 'DAILY'
  parent_reservation_id INT, -- For recurring series
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
  FOREIGN KEY (requester_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Conflict Inquiries
CREATE TABLE IF NOT EXISTS reservation_inquiries (
  id INT AUTO_INCREMENT PRIMARY KEY,
  reservation_id INT NOT NULL,
  inquirer_id INT NOT NULL,
  content TEXT NOT NULL,
  answer TEXT,
  status VARCHAR(20) DEFAULT 'pending', -- pending, answered, transferred
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (reservation_id) REFERENCES reservations(id) ON DELETE CASCADE,
  FOREIGN KEY (inquirer_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Initial Roles
INSERT IGNORE INTO roles (role_name) VALUES ('관리자'), ('사용자');

-- Initial Data (Optional)
INSERT IGNORE INTO departments (dept_name) VALUES ('교회'), ('재정부'), ('청년부'), ('주일학교');

-- Initial Users
INSERT IGNORE INTO users (user_id, user_name, email, dept_name) VALUES 
('user', '일반사용자', 'user@example.com', '교회'),
('admin', '관리자', 'admin@example.com', '교회');

-- Assign Roles
INSERT IGNORE INTO user_roles (user_id, role_id)
SELECT u.id, r.id FROM users u, roles r 
WHERE u.user_id = 'user' AND r.role_name = '사용자'
ON DUPLICATE KEY UPDATE user_id = user_id;

INSERT IGNORE INTO user_roles (user_id, role_id)
SELECT u.id, r.id FROM users u, roles r 
WHERE u.user_id = 'admin' AND r.role_name = '관리자'
ON DUPLICATE KEY UPDATE user_id = user_id;
