-- Create game_cards table
CREATE TABLE IF NOT EXISTS "game_cards" (
  id SERIAL PRIMARY KEY,
  game_id INTEGER NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  card_type VARCHAR(20) NOT NULL,
  card_color VARCHAR(20) NOT NULL,
  card_value VARCHAR(10) NOT NULL,
  location VARCHAR(20) NOT NULL DEFAULT 'deck',
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_game_cards_game_id ON "game_cards"(game_id);
CREATE INDEX IF NOT EXISTS idx_game_cards_user_id ON "game_cards"(user_id);
CREATE INDEX IF NOT EXISTS idx_game_cards_location ON "game_cards"(location);

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_game_cards_updated_at
    BEFORE UPDATE ON "game_cards"
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column(); 