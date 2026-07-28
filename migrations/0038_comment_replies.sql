ALTER TABLE task_comments ADD COLUMN parent_comment_id TEXT;
ALTER TABLE request_comments ADD COLUMN parent_comment_id TEXT;

CREATE INDEX task_comments_parent_idx ON task_comments(parent_comment_id);
CREATE INDEX request_comments_parent_idx ON request_comments(parent_comment_id);
