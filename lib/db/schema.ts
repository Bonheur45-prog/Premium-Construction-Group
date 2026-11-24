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

  /* ---------- Client portal: chat room ---------- */
  CREATE TABLE IF NOT EXISTS pcg_conversations (
    id TEXT PRIMARY KEY,
    client_id TEXT NOT NULL REFERENCES pcg_clients(id) ON DELETE CASCADE,
    subject TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'waiting', 'closed')),
    request_id TEXT REFERENCES pcg_requests(id) ON DELETE SET NULL,
    project_id TEXT,
    assigned_to TEXT NOT NULL DEFAULT '',
    created_by_type TEXT NOT NULL CHECK (created_by_type IN ('client', 'staff')),
    last_message_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_preview TEXT NOT NULL DEFAULT '',
    client_read_seq BIGINT NOT NULL DEFAULT 0,
    staff_read_seq BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  CREATE INDEX IF NOT EXISTS pcg_conversations_client ON pcg_conversations(client_id, last_message_at DESC);
  CREATE INDEX IF NOT EXISTS pcg_conversations_recent ON pcg_conversations(last_message_at DESC);

  CREATE TABLE IF NOT EXISTS pcg_messages (
    seq BIGSERIAL PRIMARY KEY,
    id TEXT NOT NULL UNIQUE,
    conversation_id TEXT NOT NULL REFERENCES pcg_conversations(id) ON DELETE CASCADE,
    author_type TEXT NOT NULL CHECK (author_type IN ('client', 'staff', 'system')),
    author_id TEXT NOT NULL DEFAULT '',
    author_name TEXT NOT NULL DEFAULT '',
    kind TEXT NOT NULL DEFAULT 'text' CHECK (kind IN ('text', 'voice', 'call', 'quote', 'milestone', 'meeting', 'system')),
    body TEXT NOT NULL DEFAULT '',
    file_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
    meta JSONB NOT NULL DEFAULT '{}'::jsonb,
    reply_to TEXT NOT NULL DEFAULT '',
    internal BOOLEAN NOT NULL DEFAULT FALSE,
    pinned BOOLEAN NOT NULL DEFAULT FALSE,
    edited_at TIMESTAMPTZ,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  CREATE INDEX IF NOT EXISTS pcg_messages_conversation ON pcg_messages(conversation_id, seq);
  CREATE INDEX IF NOT EXISTS pcg_messages_search ON pcg_messages USING gin (to_tsvector('simple', body));

  /* ---------- Client portal: file space ---------- */
  CREATE TABLE IF NOT EXISTS pcg_client_folders (
    id TEXT PRIMARY KEY,
    client_id TEXT NOT NULL REFERENCES pcg_clients(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  CREATE TABLE IF NOT EXISTS pcg_client_files (
    id TEXT PRIMARY KEY,
    client_id TEXT NOT NULL REFERENCES pcg_clients(id) ON DELETE CASCADE,
    folder_id TEXT REFERENCES pcg_client_folders(id) ON DELETE SET NULL,
    family_id TEXT NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    name TEXT NOT NULL,
    mime TEXT NOT NULL,
    size_bytes BIGINT NOT NULL,
    original_bytes BIGINT NOT NULL DEFAULT 0,
    encoding TEXT NOT NULL DEFAULT '',
    storage TEXT NOT NULL CHECK (storage IN ('r2', 'local')),
    object_key TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'ready')),
    uploaded_by_type TEXT NOT NULL CHECK (uploaded_by_type IN ('client', 'staff')),
    uploaded_by_id TEXT NOT NULL DEFAULT '',
    uploaded_by_name TEXT NOT NULL DEFAULT '',
    counts_quota BOOLEAN NOT NULL DEFAULT TRUE,
    meta JSONB NOT NULL DEFAULT '{}'::jsonb,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  CREATE INDEX IF NOT EXISTS pcg_client_files_client ON pcg_client_files(client_id, created_at DESC);
  CREATE INDEX IF NOT EXISTS pcg_client_files_family ON pcg_client_files(family_id, version DESC);

  /* ---------- Client portal: quotes, change orders and sign-off ---------- */
  CREATE TABLE IF NOT EXISTS pcg_quotes (
    id TEXT PRIMARY KEY,
    ref TEXT NOT NULL UNIQUE,
    client_id TEXT NOT NULL REFERENCES pcg_clients(id) ON DELETE CASCADE,
    conversation_id TEXT REFERENCES pcg_conversations(id) ON DELETE SET NULL,
    project_id TEXT,
    kind TEXT NOT NULL CHECK (kind IN ('quote', 'change_order')),
    title TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'accepted', 'changes_requested', 'declined', 'withdrawn')),
    currency TEXT NOT NULL DEFAULT 'RWF',
    created_by TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  CREATE INDEX IF NOT EXISTS pcg_quotes_client ON pcg_quotes(client_id, updated_at DESC);
  CREATE TABLE IF NOT EXISTS pcg_quote_revisions (
    id TEXT PRIMARY KEY,
    quote_id TEXT NOT NULL REFERENCES pcg_quotes(id) ON DELETE CASCADE,
    revision INTEGER NOT NULL,
    items JSONB NOT NULL DEFAULT '[]'::jsonb,
    notes TEXT NOT NULL DEFAULT '',
    vat_rate NUMERIC(5,2) NOT NULL DEFAULT 18,
    subtotal BIGINT NOT NULL DEFAULT 0,
    vat BIGINT NOT NULL DEFAULT 0,
    total BIGINT NOT NULL DEFAULT 0,
    valid_until DATE,
    sent_at TIMESTAMPTZ,
    sent_by TEXT NOT NULL DEFAULT '',
    response TEXT NOT NULL DEFAULT '' CHECK (response IN ('', 'accepted', 'changes_requested', 'declined')),
    response_note TEXT NOT NULL DEFAULT '',
    responded_at TIMESTAMPTZ,
    signed_name TEXT NOT NULL DEFAULT '',
    signed_ip TEXT NOT NULL DEFAULT '',
    signed_agent TEXT NOT NULL DEFAULT '',
    signature_hash TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (quote_id, revision)
  );

  /* ---------- Client portal: project progress ---------- */
  CREATE TABLE IF NOT EXISTS pcg_client_projects (
    id TEXT PRIMARY KEY,
    client_id TEXT NOT NULL REFERENCES pcg_clients(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    location TEXT NOT NULL DEFAULT '',
    summary TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'planning' CHECK (status IN ('planning', 'active', 'on_hold', 'completed')),
    start_date DATE,
    target_date DATE,
    cover_file_id TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  CREATE INDEX IF NOT EXISTS pcg_client_projects_client ON pcg_client_projects(client_id, updated_at DESC);
  CREATE TABLE IF NOT EXISTS pcg_milestones (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES pcg_client_projects(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    due_date DATE,
    status TEXT NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'in_progress', 'done')),
    weight INTEGER NOT NULL DEFAULT 1,
    photo_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
    sort_order INTEGER NOT NULL DEFAULT 0,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  CREATE INDEX IF NOT EXISTS pcg_milestones_project ON pcg_milestones(project_id, sort_order);
  CREATE TABLE IF NOT EXISTS pcg_milestone_comments (
    id TEXT PRIMARY KEY,
    milestone_id TEXT NOT NULL REFERENCES pcg_milestones(id) ON DELETE CASCADE,
    author_type TEXT NOT NULL CHECK (author_type IN ('client', 'staff')),
    author_name TEXT NOT NULL,
    body TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  /* ---------- Phone notifications ---------- */
  CREATE TABLE IF NOT EXISTS pcg_push_subscriptions (
    endpoint TEXT PRIMARY KEY,
    owner_type TEXT NOT NULL CHECK (owner_type IN ('client', 'staff')),
    owner_id TEXT NOT NULL,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  CREATE INDEX IF NOT EXISTS pcg_push_owner ON pcg_push_subscriptions(owner_type, owner_id);

`;
