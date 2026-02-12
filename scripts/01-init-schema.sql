-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'viewer',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index on email for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Create index on active users
CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active);

-- Insert demo users
INSERT INTO users (email, password_hash, full_name, role, is_active)
VALUES 
  ('admin@rentflow.com', 'demo123', 'Admin User', 'admin', true),
  ('manager@rentflow.com', 'demo123', 'Manager User', 'manager', true),
  ('accountant@rentflow.com', 'demo123', 'Accountant User', 'accountant', true),
  ('viewer@rentflow.com', 'demo123', 'Viewer User', 'viewer', true)
ON CONFLICT (email) DO NOTHING;
