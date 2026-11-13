CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  email VARCHAR(254) NOT NULL UNIQUE,
  subscribed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  consent_version TEXT NOT NULL,
  source TEXT NOT NULL,
  unsubscribed_at TIMESTAMPTZ,
  CHECK (email = lower(trim(email)))
);

CREATE TABLE IF NOT EXISTS newsletter_rate_limits (
  client_key CHAR(64) NOT NULL,
  window_start TIMESTAMPTZ NOT NULL,
  attempts INTEGER NOT NULL CHECK (attempts > 0),
  PRIMARY KEY (client_key, window_start)
);

CREATE INDEX IF NOT EXISTS newsletter_rate_limits_window_idx
  ON newsletter_rate_limits (window_start);
