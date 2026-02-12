-- Create properties table
CREATE TABLE IF NOT EXISTS properties (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  address TEXT,
  total_blocks INTEGER DEFAULT 0,
  total_rooms INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create blocks table
CREATE TABLE IF NOT EXISTS blocks (
  id SERIAL PRIMARY KEY,
  property_id INTEGER REFERENCES properties(id) ON DELETE CASCADE,
  name VARCHAR(50) NOT NULL,
  total_floors INTEGER NOT NULL,
  rooms_per_floor INTEGER NOT NULL,
  total_rooms INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create rooms table
CREATE TABLE IF NOT EXISTS rooms (
  id SERIAL PRIMARY KEY,
  block_id INTEGER REFERENCES blocks(id) ON DELETE CASCADE,
  room_number VARCHAR(10) NOT NULL,
  floor_number INTEGER NOT NULL,
  status VARCHAR(20) DEFAULT 'vacant',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(block_id, room_number)
);

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create tenants table
CREATE TABLE IF NOT EXISTS tenants (
  id SERIAL PRIMARY KEY,
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE,
  phone VARCHAR(50) NOT NULL,
  id_number VARCHAR(50) UNIQUE NOT NULL,
  emergency_contact VARCHAR(255),
  emergency_phone VARCHAR(50),
  kyc_status VARCHAR(50) DEFAULT 'pending',
  kyc_verified_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create leases table
CREATE TABLE IF NOT EXISTS leases (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE,
  room_id INTEGER REFERENCES rooms(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  monthly_rent DECIMAL(10, 2) NOT NULL,
  deposit_amount DECIMAL(10, 2) NOT NULL,
  status VARCHAR(50) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create payments table
CREATE TABLE IF NOT EXISTS payments (
  id SERIAL PRIMARY KEY,
  lease_id INTEGER REFERENCES leases(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL,
  payment_date TIMESTAMP NOT NULL,
  payment_method VARCHAR(50) NOT NULL,
  transaction_reference VARCHAR(255) UNIQUE,
  status VARCHAR(50) DEFAULT 'completed',
  notes TEXT,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create payment_status table
CREATE TABLE IF NOT EXISTS payment_status (
  id SERIAL PRIMARY KEY,
  room_id INTEGER REFERENCES rooms(id) ON DELETE CASCADE,
  lease_id INTEGER REFERENCES leases(id) ON DELETE CASCADE,
  billing_month DATE NOT NULL,
  amount_due DECIMAL(10, 2) NOT NULL,
  amount_paid DECIMAL(10, 2) DEFAULT 0,
  status VARCHAR(50) DEFAULT 'pending',
  due_date DATE NOT NULL,
  last_payment_date TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(room_id, billing_month)
);

-- Create audit_logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  action VARCHAR(255) NOT NULL,
  entity_type VARCHAR(100),
  entity_id INTEGER,
  details JSONB,
  ip_address VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create ipn_logs table
CREATE TABLE IF NOT EXISTS ipn_logs (
  id SERIAL PRIMARY KEY,
  transaction_reference VARCHAR(255) NOT NULL,
  payload JSONB NOT NULL,
  signature VARCHAR(500),
  status VARCHAR(50) DEFAULT 'received',
  processed_at TIMESTAMP,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create offline_queue table
CREATE TABLE IF NOT EXISTS offline_queue (
  id SERIAL PRIMARY KEY,
  action_type VARCHAR(100) NOT NULL,
  payload JSONB NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  retry_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  processed_at TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_rooms_block ON rooms(block_id);
CREATE INDEX IF NOT EXISTS idx_rooms_status ON rooms(status);
CREATE INDEX IF NOT EXISTS idx_leases_tenant ON leases(tenant_id);
CREATE INDEX IF NOT EXISTS idx_leases_room ON leases(room_id);
CREATE INDEX IF NOT EXISTS idx_leases_status ON leases(status);
CREATE INDEX IF NOT EXISTS idx_payments_lease ON payments(lease_id);
CREATE INDEX IF NOT EXISTS idx_payments_date ON payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_payment_status_room ON payment_status(room_id);
CREATE INDEX IF NOT EXISTS idx_payment_status_month ON payment_status(billing_month);
CREATE INDEX IF NOT EXISTS idx_payment_status_status ON payment_status(status);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at);

-- Insert demo users
INSERT INTO users (email, password_hash, full_name, role)
VALUES 
  ('admin@rentflow.com', '$2a$10$rZ8qNqZ7YxEZxKj0vZ8qNe7YxEZxKj0vZ8qNe7YxEZxKj0vZ8qNe', 'Admin User', 'admin'),
  ('manager@rentflow.com', '$2a$10$rZ8qNqZ7YxEZxKj0vZ8qNe7YxEZxKj0vZ8qNe7YxEZxKj0vZ8qNe', 'Property Manager', 'manager'),
  ('accountant@rentflow.com', '$2a$10$rZ8qNqZ7YxEZxKj0vZ8qNe7YxEZxKj0vZ8qNe7YxEZxKj0vZ8qNe', 'Accountant User', 'accountant'),
  ('viewer@rentflow.com', '$2a$10$rZ8qNqZ7YxEZxKj0vZ8qNe7YxEZxKj0vZ8qNe7YxEZxKj0vZ8qNe', 'Viewer User', 'viewer')
ON CONFLICT (email) DO NOTHING;
