-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users Table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) NOT NULL,
    global_score INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- Matches Table
CREATE TABLE IF NOT EXISTS matches (
    id VARCHAR(10) PRIMARY KEY, -- Room Code
    total_rounds INT NOT NULL,
    timer_seconds INT NOT NULL,
    status VARCHAR(20) NOT NULL, -- 'waiting', 'playing', 'finished'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    finished_at TIMESTAMP WITH TIME ZONE
);

-- Match Players (Junction Table)
CREATE TABLE IF NOT EXISTS match_players (
    match_id VARCHAR(10) REFERENCES matches(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    match_score INT DEFAULT 0,
    is_winner BOOLEAN DEFAULT FALSE,
    PRIMARY KEY (match_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_match_players_user_id ON match_players(user_id);

-- Rounds Table
CREATE TABLE IF NOT EXISTS rounds (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    match_id VARCHAR(10) REFERENCES matches(id) ON DELETE CASCADE,
    round_number INT NOT NULL,
    target_word VARCHAR(5) NOT NULL,
    winner_id UUID REFERENCES users(id) ON DELETE SET NULL,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_rounds_match_id ON rounds(match_id);
