-- =========================================================
-- IQBAL TRAVELS — TRANSPORTATION MANAGEMENT SYSTEM
-- Single MySQL database, modular-monolith schema
-- Engine: InnoDB (required for foreign keys) | Charset: utf8mb4
-- =========================================================

-- The migration runner creates/selects the database using DB_NAME before
-- applying this file. Keeping database selection out of the migration lets
-- each laptop use its own configured database name.

SET FOREIGN_KEY_CHECKS = 0;

-- =========================================================
-- MODULE: IDENTITY & ACCESS (Users, Roles, Permissions)
-- =========================================================

CREATE TABLE IF NOT EXISTS roles (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(50)  NOT NULL UNIQUE,   -- 'super_admin','city_admin','counter_operator'
  description   VARCHAR(255)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS permissions (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  module_name   VARCHAR(50)  NOT NULL,          -- 'fleet','driver','route','schedule','booking','reports','user'
  code          VARCHAR(60)  NOT NULL UNIQUE,   -- 'FLEET_CREATE','BOOKING_CANCEL' etc.
  description   VARCHAR(255)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS role_permissions (
  role_id        INT UNSIGNED NOT NULL,
  permission_id  INT UNSIGNED NOT NULL,
  PRIMARY KEY (role_id, permission_id),
  CONSTRAINT fk_rp_role FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
  CONSTRAINT fk_rp_perm FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Cities & Terminals declared here since users reference them for scope
CREATE TABLE IF NOT EXISTS cities (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(100) NOT NULL UNIQUE,
  status        ENUM('Active','Inactive') NOT NULL DEFAULT 'Active',
  created_by    INT UNSIGNED,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by    INT UNSIGNED,
  updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS terminals (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  city_id       INT UNSIGNED NOT NULL,
  name          VARCHAR(150) NOT NULL,
  address       VARCHAR(255),
  phone         VARCHAR(20),
  status        ENUM('Active','Inactive') NOT NULL DEFAULT 'Active',
  created_by    INT UNSIGNED,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by    INT UNSIGNED,
  updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_terminal_city_name (city_id, name),
  CONSTRAINT fk_terminal_city FOREIGN KEY (city_id) REFERENCES cities(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS users (
  id             INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name           VARCHAR(100) NOT NULL,
  username       VARCHAR(50)  NOT NULL UNIQUE,
  password_hash  VARCHAR(255) NOT NULL,
  phone          VARCHAR(20),
  role_id        INT UNSIGNED NOT NULL,
  city_id        INT UNSIGNED NULL,   -- NULL = super admin (all cities)
  terminal_id    INT UNSIGNED NULL,   -- set for counter operators; scopes to ONE terminal
  status         ENUM('Active','Inactive') NOT NULL DEFAULT 'Active',
  last_login_at  DATETIME NULL,
  created_by     INT UNSIGNED,
  created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by     INT UNSIGNED,
  updated_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_user_role     FOREIGN KEY (role_id) REFERENCES roles(id),
  CONSTRAINT fk_user_city     FOREIGN KEY (city_id) REFERENCES cities(id),
  CONSTRAINT fk_user_terminal FOREIGN KEY (terminal_id) REFERENCES terminals(id)
) ENGINE=InnoDB;

-- =========================================================
-- MODULE: FLEET
-- =========================================================

CREATE TABLE IF NOT EXISTS vehicles (
  id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  vehicle_number      VARCHAR(30)  NOT NULL UNIQUE,   -- 'Bus-12'
  registration_number VARCHAR(30)  NOT NULL UNIQUE,
  chassis_number      VARCHAR(50)  UNIQUE,
  engine_number       VARCHAR(50)  UNIQUE,
  registration_date   DATE,
  bus_name            VARCHAR(100),
  vehicle_type        VARCHAR(50)  NOT NULL,          -- 'AC Coach','Non-AC', etc.
  seating_capacity    TINYINT UNSIGNED NOT NULL,
  status              ENUM('Active','Under Maintenance','Inactive') NOT NULL DEFAULT 'Active',
  created_by          INT UNSIGNED,
  created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by          INT UNSIGNED,
  updated_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS vehicle_status_history (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  vehicle_id   INT UNSIGNED NOT NULL,
  old_status   VARCHAR(30),
  new_status   VARCHAR(30) NOT NULL,
  reason       VARCHAR(255),
  changed_by   INT UNSIGNED,
  changed_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_vsh_vehicle FOREIGN KEY (vehicle_id) REFERENCES vehicles(id),
  CONSTRAINT fk_vsh_user    FOREIGN KEY (changed_by) REFERENCES users(id)
) ENGINE=InnoDB;

-- =========================================================
-- MODULE: DRIVER
-- =========================================================

CREATE TABLE IF NOT EXISTS drivers (
  id                   INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name                 VARCHAR(100) NOT NULL,
  cnic                 VARCHAR(20)  NOT NULL UNIQUE,
  phone                VARCHAR(20),
  city_id              INT UNSIGNED NOT NULL,
  address              VARCHAR(255),
  license_number       VARCHAR(30)  NOT NULL UNIQUE,
  license_expiry_date  DATE NOT NULL,
  status               ENUM('Active','Suspended') NOT NULL DEFAULT 'Active',
  created_by           INT UNSIGNED,
  created_at           DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by           INT UNSIGNED,
  updated_at           DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_driver_city FOREIGN KEY (city_id) REFERENCES cities(id)
) ENGINE=InnoDB;

-- =========================================================
-- MODULE: ROUTE
-- =========================================================

CREATE TABLE IF NOT EXISTS routes (
  id                        INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name                      VARCHAR(150) NOT NULL,
  origin_terminal_id        INT UNSIGNED NOT NULL,
  destination_terminal_id   INT UNSIGNED NOT NULL,
  distance_km               DECIMAL(6,1),
  estimated_duration_minutes INT UNSIGNED,
  status                    ENUM('Active','Inactive') NOT NULL DEFAULT 'Active',
  created_by                INT UNSIGNED,
  created_at                DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by                INT UNSIGNED,
  updated_at                DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_route_pair (origin_terminal_id, destination_terminal_id),
  CONSTRAINT chk_route_diff CHECK (origin_terminal_id <> destination_terminal_id),
  CONSTRAINT fk_route_origin FOREIGN KEY (origin_terminal_id) REFERENCES terminals(id),
  CONSTRAINT fk_route_dest   FOREIGN KEY (destination_terminal_id) REFERENCES terminals(id)
) ENGINE=InnoDB;

-- =========================================================
-- MODULE: SCHEDULE (trips)
-- =========================================================

CREATE TABLE IF NOT EXISTS schedules (
  id                     INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  schedule_number        VARCHAR(30) NOT NULL UNIQUE,
  route_id               INT UNSIGNED NOT NULL,
  vehicle_id             INT UNSIGNED NOT NULL,
  driver_id              INT UNSIGNED NOT NULL,
  departure_terminal_id  INT UNSIGNED NOT NULL,   -- SCOPING FIELD: counter/city visibility is filtered on this, never on arrival
  arrival_terminal_id    INT UNSIGNED NOT NULL,
  departure_datetime     DATETIME NOT NULL,
  arrival_datetime       DATETIME NOT NULL,
  fare                   DECIMAL(10,2) NOT NULL,
  status                 ENUM('Open','Departed','Completed','Cancelled') NOT NULL DEFAULT 'Open',
  created_by             INT UNSIGNED,
  created_at             DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by             INT UNSIGNED,
  updated_at             DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT chk_sched_time CHECK (arrival_datetime > departure_datetime),
  CONSTRAINT fk_sched_route     FOREIGN KEY (route_id) REFERENCES routes(id),
  CONSTRAINT fk_sched_vehicle   FOREIGN KEY (vehicle_id) REFERENCES vehicles(id),
  CONSTRAINT fk_sched_driver    FOREIGN KEY (driver_id) REFERENCES drivers(id),
  CONSTRAINT fk_sched_dep_term  FOREIGN KEY (departure_terminal_id) REFERENCES terminals(id),
  CONSTRAINT fk_sched_arr_term  FOREIGN KEY (arrival_terminal_id) REFERENCES terminals(id),
  -- these two indexes are what your availability-overlap query (vehicle/driver conflict check) will hit on every schedule creation
  INDEX idx_vehicle_time (vehicle_id, departure_datetime, arrival_datetime),
  INDEX idx_driver_time  (driver_id, departure_datetime, arrival_datetime),
  INDEX idx_departure_terminal (departure_terminal_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS vehicle_replacements (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  schedule_id     INT UNSIGNED NOT NULL,
  old_vehicle_id  INT UNSIGNED NOT NULL,
  new_vehicle_id  INT UNSIGNED NOT NULL,
  reason          VARCHAR(255),
  replaced_by     INT UNSIGNED,
  replaced_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_vr_schedule FOREIGN KEY (schedule_id) REFERENCES schedules(id),
  CONSTRAINT fk_vr_old      FOREIGN KEY (old_vehicle_id) REFERENCES vehicles(id),
  CONSTRAINT fk_vr_new      FOREIGN KEY (new_vehicle_id) REFERENCES vehicles(id),
  CONSTRAINT fk_vr_user     FOREIGN KEY (replaced_by) REFERENCES users(id)
) ENGINE=InnoDB;

-- =========================================================
-- MODULE: SEATS (auto-generated per schedule from vehicle capacity)
-- =========================================================

CREATE TABLE IF NOT EXISTS seats (
  id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  schedule_id   INT UNSIGNED NOT NULL,
  seat_number   VARCHAR(5) NOT NULL,      -- '1A','1B', etc.
  status        ENUM('Available','Reserved','Booked') NOT NULL DEFAULT 'Available',
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_seat_per_schedule (schedule_id, seat_number),
  CONSTRAINT fk_seat_schedule FOREIGN KEY (schedule_id) REFERENCES schedules(id)
) ENGINE=InnoDB;

-- =========================================================
-- MODULE: PASSENGER (reusable master)
-- =========================================================

CREATE TABLE IF NOT EXISTS passengers (
  id             BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name           VARCHAR(100) NOT NULL,
  cnic           VARCHAR(20)  UNIQUE,     -- allows re-lookup on repeat bookings; NULLs allowed for walk-ins without CNIC
  mobile_number  VARCHAR(20),
  gender         ENUM('M','F','Other'),
  created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_mobile (mobile_number)
) ENGINE=InnoDB;

-- =========================================================
-- MODULE: BOOKING (core transaction)
-- =========================================================

CREATE TABLE IF NOT EXISTS bookings (
  id                 BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  booking_number     VARCHAR(30) NOT NULL UNIQUE,
  ticket_number      VARCHAR(30) NOT NULL UNIQUE,
  schedule_id        INT UNSIGNED NOT NULL,
  counter_user_id    INT UNSIGNED NOT NULL,      -- who sold it
  terminal_id        INT UNSIGNED NOT NULL,      -- denormalized: the SELLING terminal, for fast counter/terminal reports
  fare_per_seat      DECIMAL(10,2) NOT NULL,
  total_amount       DECIMAL(10,2) NOT NULL,
  status             ENUM('Booked','Cancelled','Refunded','Transferred') NOT NULL DEFAULT 'Booked',
  booking_date       DATE NOT NULL,
  created_by         INT UNSIGNED,
  created_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by         INT UNSIGNED,
  updated_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_booking_schedule FOREIGN KEY (schedule_id) REFERENCES schedules(id),
  CONSTRAINT fk_booking_counter  FOREIGN KEY (counter_user_id) REFERENCES users(id),
  CONSTRAINT fk_booking_terminal FOREIGN KEY (terminal_id) REFERENCES terminals(id),
  INDEX idx_booking_date (booking_date),
  INDEX idx_booking_terminal (terminal_id)
) ENGINE=InnoDB;

-- Junction: one booking can cover multiple seats/passengers in a single transaction
CREATE TABLE IF NOT EXISTS booking_seats (
  id             BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  booking_id     BIGINT UNSIGNED NOT NULL,
  seat_id        BIGINT UNSIGNED NOT NULL,
  passenger_id   BIGINT UNSIGNED NOT NULL,
  seat_number    VARCHAR(5) NOT NULL,     -- denormalized copy for fast ticket/manifest printing
  CONSTRAINT fk_bs_booking   FOREIGN KEY (booking_id) REFERENCES bookings(id),
  CONSTRAINT fk_bs_seat      FOREIGN KEY (seat_id) REFERENCES seats(id),
  CONSTRAINT fk_bs_passenger FOREIGN KEY (passenger_id) REFERENCES passengers(id)
  -- NOTE: no UNIQUE(seat_id) here on purpose — a permanent unique constraint would block
  -- re-selling a seat after cancellation/refund. Enforce "no double booking" in the app
  -- transaction: SELECT seat FOR UPDATE, check seats.status = 'Available', then insert here
  -- and flip seats.status to 'Booked', all inside one DB transaction.
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS payments (
  id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  booking_id    BIGINT UNSIGNED NOT NULL,
  amount        DECIMAL(10,2) NOT NULL,
  payment_method ENUM('Cash','Card','Online') NOT NULL DEFAULT 'Cash',
  collected_by  INT UNSIGNED,
  collected_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_pay_booking FOREIGN KEY (booking_id) REFERENCES bookings(id),
  CONSTRAINT fk_pay_user    FOREIGN KEY (collected_by) REFERENCES users(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS refunds (
  id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  booking_id    BIGINT UNSIGNED NOT NULL,
  amount        DECIMAL(10,2) NOT NULL,
  reason        VARCHAR(255),
  processed_by  INT UNSIGNED,
  processed_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_ref_booking FOREIGN KEY (booking_id) REFERENCES bookings(id),
  CONSTRAINT fk_ref_user    FOREIGN KEY (processed_by) REFERENCES users(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS transfers (
  id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  booking_id      BIGINT UNSIGNED NOT NULL,
  from_schedule_id INT UNSIGNED NOT NULL,
  to_schedule_id   INT UNSIGNED NOT NULL,
  transferred_by  INT UNSIGNED,
  transferred_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_tr_booking FOREIGN KEY (booking_id) REFERENCES bookings(id),
  CONSTRAINT fk_tr_from    FOREIGN KEY (from_schedule_id) REFERENCES schedules(id),
  CONSTRAINT fk_tr_to      FOREIGN KEY (to_schedule_id) REFERENCES schedules(id),
  CONSTRAINT fk_tr_user    FOREIGN KEY (transferred_by) REFERENCES users(id)
) ENGINE=InnoDB;

-- =========================================================
-- MODULE: AUDIT LOG (mandatory, cross-cutting)
-- =========================================================

CREATE TABLE IF NOT EXISTS audit_logs (
  id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id       INT UNSIGNED NULL,
  action_type   VARCHAR(60) NOT NULL,   -- 'Booking Created','Schedule Cancelled', etc.
  entity_name   VARCHAR(50) NOT NULL,   -- 'Booking','Vehicle','Schedule'...
  entity_id     BIGINT UNSIGNED,
  old_value     JSON,
  new_value     JSON,
  ip_address    VARCHAR(45),
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_audit_user FOREIGN KEY (user_id) REFERENCES users(id),
  INDEX idx_audit_entity (entity_name, entity_id),
  INDEX idx_audit_user (user_id),
  INDEX idx_audit_created (created_at)
) ENGINE=InnoDB;

-- =========================================================
-- MODULE: NOTIFICATIONS (internal only)
-- =========================================================

CREATE TABLE IF NOT EXISTS notifications (
  id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id       INT UNSIGNED NULL,       -- NULL = broadcast to all
  title         VARCHAR(150) NOT NULL,
  message       VARCHAR(500) NOT NULL,
  is_read       TINYINT(1) NOT NULL DEFAULT 0,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_notif_user FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB;

SET FOREIGN_KEY_CHECKS = 1;

-- =========================================================
-- SEED: base roles + permission codes (extend as needed)
-- =========================================================

INSERT IGNORE INTO roles (name, description) VALUES
('super_admin','Full access across all cities'),
('city_admin','Manages a single assigned city'),
('counter_operator','Sells tickets at a single terminal');

INSERT IGNORE INTO permissions (module_name, code, description) VALUES
('fleet','FLEET_CREATE','Create/edit vehicles'),
('driver','DRIVER_CREATE','Create/edit drivers'),
('route','ROUTE_CREATE','Create/edit routes'),
('schedule','SCHEDULE_CREATE','Create/edit schedules'),
('booking','BOOKING_CREATE','Book tickets'),
('booking','BOOKING_CANCEL','Cancel/refund bookings'),
('reports','REPORTS_VIEW_ALL','View all reports'),
('user','USER_MANAGE','Create/manage users');
