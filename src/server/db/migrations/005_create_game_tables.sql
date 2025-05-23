-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  email VARCHAR(100) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  socket_id VARCHAR(100),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create rooms table
CREATE TABLE IF NOT EXISTS rooms (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'waiting',
  max_players INTEGER NOT NULL DEFAULT 4,
  current_players INTEGER NOT NULL DEFAULT 0,
  created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  is_private BOOLEAN NOT NULL DEFAULT false,
  password VARCHAR(255),
  starting_cards INTEGER NOT NULL DEFAULT 7,
  draw_until_playable BOOLEAN NOT NULL DEFAULT false,
  stacking BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create room users table
CREATE TABLE IF NOT EXISTS room_users (
  id SERIAL PRIMARY KEY,
  room_id INTEGER NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  socket_id VARCHAR(100),
  joined_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(room_id, user_id)
);

-- Create messages table
CREATE TABLE IF NOT EXISTS messages (
  id SERIAL PRIMARY KEY,
  content TEXT NOT NULL,
  type VARCHAR(20) NOT NULL DEFAULT 'chat',
  sender_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  room_id INTEGER REFERENCES rooms(id) ON DELETE CASCADE,
  game_id INTEGER REFERENCES games(id) ON DELETE CASCADE,
  is_global BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create games table
CREATE TABLE IF NOT EXISTS games (
  id SERIAL PRIMARY KEY,
  room_id INTEGER NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  start_time TIMESTAMP NOT NULL DEFAULT NOW(),
  end_time TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create game players table
CREATE TABLE IF NOT EXISTS "gamePlayers" (
  id SERIAL PRIMARY KEY,
  game_id INTEGER NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  hand_cards JSONB NOT NULL DEFAULT '[]',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(game_id, user_id)
);

-- Create game cards table
CREATE TABLE IF NOT EXISTS "gameCards" (
  id SERIAL PRIMARY KEY,
  game_id INTEGER NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  card_type VARCHAR(20) NOT NULL,
  card_color VARCHAR(10) NOT NULL,
  card_value VARCHAR(10),
  location VARCHAR(20) NOT NULL, -- 'draw_pile', 'discard_pile', 'player_hand'
  player_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  position INTEGER,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create game state table
CREATE TABLE IF NOT EXISTS "gameState" (
  id SERIAL PRIMARY KEY,
  game_id INTEGER NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'playing',
  current_player_id INTEGER NOT NULL,
  direction VARCHAR(10) NOT NULL DEFAULT 'clockwise',
  current_color VARCHAR(10) NOT NULL DEFAULT 'red',
  last_card_played_id INTEGER,
  discard_pile_count INTEGER NOT NULL DEFAULT 0,
  draw_pile_count INTEGER NOT NULL DEFAULT 0,
  last_action_time TIMESTAMP NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Add indexes for users and rooms
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_rooms_created_by ON rooms(created_by);
CREATE INDEX IF NOT EXISTS idx_rooms_status ON rooms(status);

-- Add indexes for room users and messages
CREATE INDEX IF NOT EXISTS idx_room_users_room_id ON room_users(room_id);
CREATE INDEX IF NOT EXISTS idx_room_users_user_id ON room_users(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_room_id ON messages(room_id);
CREATE INDEX IF NOT EXISTS idx_messages_game_id ON messages(game_id);
CREATE INDEX IF NOT EXISTS idx_messages_is_global ON messages(is_global);

-- Add indexes for games and game-related tables
CREATE INDEX IF NOT EXISTS idx_games_room_id ON games(room_id);
CREATE INDEX IF NOT EXISTS idx_game_players_game_id ON "gamePlayers"(game_id);
CREATE INDEX IF NOT EXISTS idx_game_players_user_id ON "gamePlayers"(user_id);
CREATE INDEX IF NOT EXISTS idx_game_cards_game_id ON "gameCards"(game_id);
CREATE INDEX IF NOT EXISTS idx_game_cards_player_id ON "gameCards"(player_id);
CREATE INDEX IF NOT EXISTS idx_game_cards_location ON "gameCards"(location);
CREATE INDEX IF NOT EXISTS idx_game_state_game_id ON "gameState"(game_id);
CREATE INDEX IF NOT EXISTS idx_game_state_current_player ON "gameState"(current_player_id); 