PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  refresh_hash TEXT NOT NULL UNIQUE,
  expires_at INTEGER NOT NULL,
  revoked_at INTEGER,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS sessions_expires_at ON sessions(expires_at);

CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  database_type TEXT NOT NULL DEFAULT 'SQLite',
  environment TEXT NOT NULL DEFAULT 'test',
  seeded INTEGER NOT NULL DEFAULT 1 CHECK (seeded IN (0, 1)),
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS projects_user_id ON projects(user_id);

CREATE TABLE IF NOT EXISTS products (
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  id INTEGER NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  price REAL NOT NULL CHECK (price >= 0),
  stock INTEGER NOT NULL CHECK (stock >= 0),
  status TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (project_id, id)
);

CREATE TABLE IF NOT EXISTS customers (
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  id INTEGER NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (project_id, id)
);

CREATE TABLE IF NOT EXISTS orders (
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  id INTEGER NOT NULL,
  customer_id INTEGER NOT NULL,
  product_id INTEGER NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  amount REAL NOT NULL CHECK (amount >= 0),
  status TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (project_id, id),
  FOREIGN KEY (project_id, customer_id) REFERENCES customers(project_id, id),
  FOREIGN KEY (project_id, product_id) REFERENCES products(project_id, id)
);

CREATE TABLE IF NOT EXISTS rate_limits (
  bucket_key TEXT NOT NULL,
  window_start INTEGER NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (bucket_key, window_start)
);

CREATE TABLE IF NOT EXISTS storage_buckets (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE (project_id, name),
  UNIQUE (project_id, id)
);
CREATE INDEX IF NOT EXISTS storage_buckets_project_id ON storage_buckets(project_id);

CREATE TABLE IF NOT EXISTS storage_objects (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  bucket_id TEXT NOT NULL,
  object_key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  size INTEGER NOT NULL CHECK (size > 0 AND size <= 5242880),
  content_type TEXT NOT NULL,
  state TEXT NOT NULL DEFAULT 'uploading' CHECK (state IN ('uploading', 'ready')),
  created_at TEXT NOT NULL,
  FOREIGN KEY (project_id, bucket_id) REFERENCES storage_buckets(project_id, id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS storage_objects_project_bucket ON storage_objects(project_id, bucket_id);
CREATE INDEX IF NOT EXISTS storage_objects_project_state ON storage_objects(project_id, state);

-- End-user identities belong to one application project. They are separate from
-- the users/sessions tables used to sign in to the Grupedia dashboard.
CREATE TABLE IF NOT EXISTS app_auth_users (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL COLLATE NOCASE,
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL,
  last_sign_in_at TEXT,
  UNIQUE (project_id, email),
  UNIQUE (project_id, id)
);
CREATE INDEX IF NOT EXISTS app_auth_users_project_id ON app_auth_users(project_id);

CREATE TABLE IF NOT EXISTS app_auth_sessions (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  refresh_hash TEXT NOT NULL UNIQUE,
  expires_at INTEGER NOT NULL,
  revoked_at INTEGER,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (project_id, user_id) REFERENCES app_auth_users(project_id, id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS app_auth_sessions_project_user ON app_auth_sessions(project_id, user_id);
CREATE INDEX IF NOT EXISTS app_auth_sessions_expires_at ON app_auth_sessions(expires_at);

CREATE TABLE IF NOT EXISTS app_auth_settings (
  project_id TEXT PRIMARY KEY REFERENCES projects(id) ON DELETE CASCADE,
  allowed_origins TEXT NOT NULL DEFAULT '[]',
  signup_enabled INTEGER NOT NULL DEFAULT 1 CHECK (signup_enabled IN (0, 1)),
  updated_at TEXT NOT NULL
);


-- API drafts and published snapshots are independent so editing never silently
-- changes a live application route. Configuration only; application data stays
-- in the project's main tables.
CREATE TABLE IF NOT EXISTS api_endpoints (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  definition TEXT NOT NULL,
  published_definition TEXT,
  published_method TEXT,
  published_path TEXT,
  revision INTEGER NOT NULL DEFAULT 1 CHECK (revision >= 1),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  published_at TEXT,
  UNIQUE (project_id, published_method, published_path)
);
CREATE INDEX IF NOT EXISTS api_endpoints_project_id ON api_endpoints(project_id);
