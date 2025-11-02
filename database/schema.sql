PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS scales (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    size INTEGER NOT NULL CHECK(size >= 0)
);

CREATE TABLE IF NOT EXISTS scale_degrees (
    scale_id TEXT NOT NULL,
    position INTEGER NOT NULL CHECK(position >= 0),
    semitone INTEGER NOT NULL,
    PRIMARY KEY (scale_id, position),
    FOREIGN KEY (scale_id) REFERENCES scales(id) ON DELETE CASCADE
);
