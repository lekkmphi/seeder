PRAGMA foreign_keys=off;

CREATE TABLE task_comment_reactions_next (
  id TEXT PRIMARY KEY,
  comment_id TEXT NOT NULL REFERENCES task_comments(id) ON DELETE CASCADE,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  reaction TEXT NOT NULL CHECK (reaction IN ('like', 'dislike', 'heart', 'laugh', 'wow', 'sad', 'angry')),
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);

INSERT INTO task_comment_reactions_next (id, comment_id, project_id, user_id, reaction, created_at)
SELECT id, comment_id, project_id, user_id, reaction, created_at
FROM task_comment_reactions;

DROP TABLE task_comment_reactions;
ALTER TABLE task_comment_reactions_next RENAME TO task_comment_reactions;

CREATE UNIQUE INDEX task_comment_reactions_user_idx ON task_comment_reactions(comment_id, user_id);
CREATE INDEX task_comment_reactions_comment_idx ON task_comment_reactions(comment_id);
CREATE INDEX task_comment_reactions_project_idx ON task_comment_reactions(project_id);

CREATE TABLE request_comment_reactions_next (
  id TEXT PRIMARY KEY,
  comment_id TEXT NOT NULL REFERENCES request_comments(id) ON DELETE CASCADE,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  reaction TEXT NOT NULL CHECK (reaction IN ('like', 'dislike', 'heart', 'laugh', 'wow', 'sad', 'angry')),
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);

INSERT INTO request_comment_reactions_next (id, comment_id, project_id, user_id, reaction, created_at)
SELECT id, comment_id, project_id, user_id, reaction, created_at
FROM request_comment_reactions;

DROP TABLE request_comment_reactions;
ALTER TABLE request_comment_reactions_next RENAME TO request_comment_reactions;

CREATE UNIQUE INDEX request_comment_reactions_user_idx ON request_comment_reactions(comment_id, user_id);
CREATE INDEX request_comment_reactions_comment_idx ON request_comment_reactions(comment_id);
CREATE INDEX request_comment_reactions_project_idx ON request_comment_reactions(project_id);

PRAGMA foreign_keys=on;
