CREATE TABLE task_comment_reactions (
  id TEXT PRIMARY KEY,
  comment_id TEXT NOT NULL REFERENCES task_comments(id) ON DELETE CASCADE,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  reaction TEXT NOT NULL CHECK (reaction IN ('like', 'dislike', 'heart', 'laugh', 'wow', 'sad')),
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);

CREATE UNIQUE INDEX task_comment_reactions_user_idx ON task_comment_reactions(comment_id, user_id);
CREATE INDEX task_comment_reactions_comment_idx ON task_comment_reactions(comment_id);
CREATE INDEX task_comment_reactions_project_idx ON task_comment_reactions(project_id);

CREATE TABLE request_comment_reactions (
  id TEXT PRIMARY KEY,
  comment_id TEXT NOT NULL REFERENCES request_comments(id) ON DELETE CASCADE,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  reaction TEXT NOT NULL CHECK (reaction IN ('like', 'dislike', 'heart', 'laugh', 'wow', 'sad')),
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);

CREATE UNIQUE INDEX request_comment_reactions_user_idx ON request_comment_reactions(comment_id, user_id);
CREATE INDEX request_comment_reactions_comment_idx ON request_comment_reactions(comment_id);
CREATE INDEX request_comment_reactions_project_idx ON request_comment_reactions(project_id);
