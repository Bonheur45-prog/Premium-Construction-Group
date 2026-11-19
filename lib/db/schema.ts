/**
 * Tables added by the CMS upgrade (media library, activity log, enquiries, client portal).
 * Appended to the base schema in lib/db/postgres.ts; every statement is idempotent so it runs safely on each start.
 */
export const REQUEST_STATUSES = ["received", "reviewing", "site_visit", "quote_sent", "approved", "in_progress", "completed", "on_hold", "closed"] as const;

const statusList = REQUEST_STATUSES.map((status) => `'${status}'`).join(", ");

export const EXTRA_SCHEMA = `
  CREATE TABLE IF NOT EXISTS pcg_media (
    id TEXT PRIMARY KEY,
    storage TEXT NOT NULL CHECK (storage IN ('r2', 'local')),
    object_key TEXT NOT NULL,
    url TEXT NOT NULL,
    kind TEXT NOT NULL CHECK (kind IN ('image', 'video', 'document')),
    mime TEXT NOT NULL,
    size_bytes BIGINT NOT NULL DEFAULT 0,
    filename TEXT NOT NULL DEFAULT '',
    alt TEXT NOT NULL DEFAULT '',
    uploaded_by TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  CREATE INDEX IF NOT EXISTS pcg_media_created ON pcg_media(created_at DESC);

  CREATE TABLE IF NOT EXISTS pcg_activity (
    id BIGSERIAL PRIMARY KEY,
    actor_type TEXT NOT NULL CHECK (actor_type IN ('staff', 'client', 'system', 'visitor')),
    actor_id TEXT NOT NULL DEFAULT '',
    actor_name TEXT NOT NULL DEFAULT '',
    action TEXT NOT NULL,
    target_type TEXT NOT NULL DEFAULT '',
    target_id TEXT NOT NULL DEFAULT '',
    summary TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  CREATE INDEX IF NOT EXISTS pcg_activity_created ON pcg_activity(created_at DESC);

  CREATE TABLE IF NOT EXISTS pcg_rate_events (
    key TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  CREATE INDEX IF NOT EXISTS pcg_rate_events_key ON pcg_rate_events(key, created_at);

  CREATE TABLE IF NOT EXISTS pcg_clients (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    phone TEXT NOT NULL DEFAULT '',
    company TEXT NOT NULL DEFAULT '',
    salt TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    email_verified_at TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
    notify_email BOOLEAN NOT NULL DEFAULT TRUE,
    session_version INTEGER NOT NULL DEFAULT 1,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS pcg_client_tokens (
    token_hash TEXT PRIMARY KEY,
    client_id TEXT NOT NULL REFERENCES pcg_clients(id) ON DELETE CASCADE,
    purpose TEXT NOT NULL CHECK (purpose IN ('verify', 'reset')),
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  CREATE INDEX IF NOT EXISTS pcg_client_tokens_client ON pcg_client_tokens(client_id, purpose);

  CREATE SEQUENCE IF NOT EXISTS pcg_request_ref_seq START 1001;

  CREATE TABLE IF NOT EXISTS pcg_requests (
    id TEXT PRIMARY KEY,
    ref TEXT NOT NULL UNIQUE,
    client_id TEXT REFERENCES pcg_clients(id) ON DELETE SET NULL,
    contact_name TEXT NOT NULL,
    contact_email TEXT NOT NULL,
    contact_phone TEXT NOT NULL DEFAULT '',
    company TEXT NOT NULL DEFAULT '',
    category TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    location TEXT NOT NULL DEFAULT '',
    budget TEXT NOT NULL DEFAULT '',
    timeline TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'received' CHECK (status IN (${statusList})),
    priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    progress SMALLINT NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
    assigned_to TEXT NOT NULL DEFAULT '',
    source TEXT NOT NULL DEFAULT 'portal' CHECK (source IN ('portal', 'enquiry', 'reservation', 'staff')),
    source_id TEXT NOT NULL DEFAULT '',
    client_last_seen_at TIMESTAMPTZ,
    staff_last_seen_at TIMESTAMPTZ,
    last_client_activity_at TIMESTAMPTZ,
    last_staff_activity_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  CREATE INDEX IF NOT EXISTS pcg_requests_client ON pcg_requests(client_id, updated_at DESC);
  CREATE INDEX IF NOT EXISTS pcg_requests_status ON pcg_requests(status, updated_at DESC);
  CREATE INDEX IF NOT EXISTS pcg_requests_email ON pcg_requests(lower(contact_email));

  CREATE TABLE IF NOT EXISTS pcg_request_events (
    id TEXT PRIMARY KEY,
    request_id TEXT NOT NULL REFERENCES pcg_requests(id) ON DELETE CASCADE,
    kind TEXT NOT NULL CHECK (kind IN ('message', 'update', 'note', 'status', 'file', 'system')),
    author_type TEXT NOT NULL CHECK (author_type IN ('client', 'staff', 'system')),
    author_id TEXT NOT NULL DEFAULT '',
    author_name TEXT NOT NULL DEFAULT '',
    body TEXT NOT NULL DEFAULT '',
    visibility TEXT NOT NULL DEFAULT 'client' CHECK (visibility IN ('client', 'internal')),
    meta JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  CREATE INDEX IF NOT EXISTS pcg_request_events_request ON pcg_request_events(request_id, created_at);

  CREATE TABLE IF NOT EXISTS pcg_request_files (
    id TEXT PRIMARY KEY,
    request_id TEXT NOT NULL REFERENCES pcg_requests(id) ON DELETE CASCADE,
    event_id TEXT NOT NULL DEFAULT '',
    uploaded_by_type TEXT NOT NULL CHECK (uploaded_by_type IN ('client', 'staff')),
    uploaded_by_id TEXT NOT NULL DEFAULT '',
    uploaded_by_name TEXT NOT NULL DEFAULT '',
    category TEXT NOT NULL DEFAULT 'other',
    filename TEXT NOT NULL,
    mime TEXT NOT NULL,
    size_bytes BIGINT NOT NULL DEFAULT 0,
    storage TEXT NOT NULL CHECK (storage IN ('r2', 'local')),
    object_key TEXT NOT NULL,
    visibility TEXT NOT NULL DEFAULT 'client' CHECK (visibility IN ('client', 'internal')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  CREATE INDEX IF NOT EXISTS pcg_request_files_request ON pcg_request_files(request_id, created_at);

  CREATE TABLE IF NOT EXISTS pcg_enquiries (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL DEFAULT '',
    enquiry_type TEXT NOT NULL DEFAULT 'personal' CHECK (enquiry_type IN ('personal', 'company')),
    company TEXT NOT NULL DEFAULT '',
    project_type TEXT NOT NULL DEFAULT '',
    location TEXT NOT NULL DEFAULT '',
    budget TEXT NOT NULL DEFAULT '',
    timeline TEXT NOT NULL DEFAULT '',
    message TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'read', 'replied', 'archived', 'converted')),
    request_id TEXT NOT NULL DEFAULT '',
    staff_notified BOOLEAN NOT NULL DEFAULT FALSE,
    sender_notified BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  CREATE INDEX IF NOT EXISTS pcg_enquiries_status ON pcg_enquiries(status, created_at DESC);

  CREATE TABLE IF NOT EXISTS pcg_projects (
    id TEXT PRIMARY KEY,
    slug TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT '',
    stage TEXT NOT NULL DEFAULT 'completed' CHECK (stage IN ('completed', 'ongoing', 'upcoming')),
    location TEXT NOT NULL DEFAULT '',
    year TEXT NOT NULL DEFAULT '',
    client TEXT NOT NULL DEFAULT '',
    summary TEXT NOT NULL DEFAULT '',
    body TEXT NOT NULL DEFAULT '',
    cover TEXT NOT NULL DEFAULT '',
    cover_alt TEXT NOT NULL DEFAULT '',
    gallery JSONB NOT NULL DEFAULT '[]'::jsonb,
    facts JSONB NOT NULL DEFAULT '[]'::jsonb,
    featured BOOLEAN NOT NULL DEFAULT FALSE,
    published BOOLEAN NOT NULL DEFAULT FALSE,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  CREATE INDEX IF NOT EXISTS pcg_projects_public ON pcg_projects(published, sort_order, created_at DESC);

  -- One table for every CMS collection (services, projects, insights, testimonials, partners, team, jobs).
  -- "data" is what the website shows; "draft" holds saved-but-unpublished changes to a published item.
  CREATE TABLE IF NOT EXISTS pcg_entries (
    id TEXT PRIMARY KEY,
    collection TEXT NOT NULL,
    slug TEXT NOT NULL,
    title TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
    sort_order INTEGER NOT NULL DEFAULT 0,
    show_on_home BOOLEAN NOT NULL DEFAULT FALSE,
    data JSONB NOT NULL DEFAULT '{}'::jsonb,
    draft JSONB,
    published_at TIMESTAMPTZ,
    created_by TEXT NOT NULL DEFAULT '',
    updated_by TEXT NOT NULL DEFAULT '',
    deleted_at TIMESTAMPTZ,
    deleted_by TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  CREATE UNIQUE INDEX IF NOT EXISTS pcg_entries_slug ON pcg_entries(collection, slug) WHERE deleted_at IS NULL;
  CREATE INDEX IF NOT EXISTS pcg_entries_list ON pcg_entries(collection, deleted_at, status, sort_order);

  CREATE TABLE IF NOT EXISTS pcg_entry_versions (
    id BIGSERIAL PRIMARY KEY,
    entry_id TEXT NOT NULL REFERENCES pcg_entries(id) ON DELETE CASCADE,
    title TEXT NOT NULL DEFAULT '',
    data JSONB NOT NULL,
    note TEXT NOT NULL DEFAULT '',
    created_by TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  CREATE INDEX IF NOT EXISTS pcg_entry_versions_entry ON pcg_entry_versions(entry_id, created_at DESC);

  -- Old page addresses keep working after a slug change.
  CREATE TABLE IF NOT EXISTS pcg_redirects (
    from_path TEXT PRIMARY KEY,
    to_path TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS pcg_cms_meta (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL DEFAULT '',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
`;
