# Database Structure

## Tables

### users
- `id` (SERIAL PRIMARY KEY)
- `username` (VARCHAR NOT NULL UNIQUE)
- `email` (VARCHAR NOT NULL UNIQUE)
- `password_hash` (VARCHAR NOT NULL)
- `socket_id` (VARCHAR)
- `created_at` (TIMESTAMP NOT NULL DEFAULT NOW())
- `updated_at` (TIMESTAMP NOT NULL DEFAULT NOW())

### rooms
- `id` (SERIAL PRIMARY KEY)
- `name` (VARCHAR NOT NULL)
- `status` (VARCHAR NOT NULL DEFAULT 'waiting')
- `max_players` (INTEGER NOT NULL)
- `current_players` (INTEGER NOT NULL DEFAULT 1)
- `created_by` (INTEGER NOT NULL REFERENCES users(id))
- `is_private` (BOOLEAN NOT NULL DEFAULT false)
- `password` (VARCHAR)
- `starting_cards` (INTEGER NOT NULL DEFAULT 7)
- `draw_until_playable` (BOOLEAN NOT NULL DEFAULT false)
- `stacking` (BOOLEAN NOT NULL DEFAULT false)
- `created_at` (TIMESTAMP NOT NULL DEFAULT NOW())
- `updated_at` (TIMESTAMP NOT NULL DEFAULT NOW())

### room_users
- `id` (SERIAL PRIMARY KEY)
- `room_id` (INTEGER NOT NULL REFERENCES rooms(id) ON DELETE CASCADE)
- `user_id` (INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE)
- `socket_id` (VARCHAR)
- `joined_at` (TIMESTAMP NOT NULL DEFAULT NOW())
- UNIQUE(room_id, user_id)

### messages
- `id` (SERIAL PRIMARY KEY)
- `content` (TEXT NOT NULL)
- `type` (VARCHAR NOT NULL)
- `sender_id` (INTEGER NOT NULL REFERENCES users(id))
- `room_id` (INTEGER REFERENCES rooms(id) ON DELETE CASCADE)
- `game_id` (INTEGER REFERENCES games(id) ON DELETE CASCADE)
- `is_global` (BOOLEAN NOT NULL DEFAULT false)
- `created_at` (TIMESTAMP NOT NULL DEFAULT NOW())

### games
- `id` (SERIAL PRIMARY KEY)
- `room_id` (INTEGER NOT NULL REFERENCES rooms(id) ON DELETE CASCADE)
- `status` (VARCHAR NOT NULL DEFAULT 'playing')
- `start_time` (TIMESTAMP NOT NULL DEFAULT NOW())
- `end_time` (TIMESTAMP)
- `created_at` (TIMESTAMP NOT NULL DEFAULT NOW())
- `updated_at` (TIMESTAMP NOT NULL DEFAULT NOW())

### gamePlayers
- `id` (SERIAL PRIMARY KEY)
- `game_id` (INTEGER NOT NULL REFERENCES games(id) ON DELETE CASCADE)
- `user_id` (INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE)
- `hand_cards` (JSONB NOT NULL DEFAULT '[]')
- `is_active` (BOOLEAN NOT NULL DEFAULT true)
- `created_at` (TIMESTAMP NOT NULL DEFAULT NOW())
- `updated_at` (TIMESTAMP NOT NULL DEFAULT NOW())
- UNIQUE(game_id, user_id)

### gameCards
- `id` (SERIAL PRIMARY KEY)
- `game_id` (INTEGER NOT NULL REFERENCES games(id) ON DELETE CASCADE)
- `card_type` (VARCHAR NOT NULL)
- `card_color` (VARCHAR NOT NULL)
- `card_value` (VARCHAR)
- `location` (VARCHAR NOT NULL) -- 'draw_pile', 'discard_pile', 'player_hand'
- `player_id` (INTEGER REFERENCES users(id) ON DELETE SET NULL)
- `position` (INTEGER)
- `created_at` (TIMESTAMP NOT NULL DEFAULT NOW())
- `updated_at` (TIMESTAMP NOT NULL DEFAULT NOW())

### gameState
- `id` (SERIAL PRIMARY KEY)
- `game_id` (INTEGER NOT NULL REFERENCES games(id) ON DELETE CASCADE)
- `status` (VARCHAR NOT NULL DEFAULT 'playing')
- `current_player_id` (INTEGER NOT NULL)
- `direction` (VARCHAR NOT NULL DEFAULT 'clockwise')
- `current_color` (VARCHAR NOT NULL DEFAULT 'red')
- `last_card_played_id` (INTEGER)
- `discard_pile_count` (INTEGER NOT NULL DEFAULT 0)
- `draw_pile_count` (INTEGER NOT NULL DEFAULT 0)
- `last_action_time` (TIMESTAMP NOT NULL DEFAULT NOW())
- `created_at` (TIMESTAMP NOT NULL DEFAULT NOW())
- `updated_at` (TIMESTAMP NOT NULL DEFAULT NOW())

## Indexes

### users
- `idx_users_username` ON users(username)
- `idx_users_email` ON users(email)

### rooms
- `idx_rooms_created_by` ON rooms(created_by)
- `idx_rooms_status` ON rooms(status)

### room_users
- `idx_room_users_room_id` ON room_users(room_id)
- `idx_room_users_user_id` ON room_users(user_id)
- `idx_room_users_socket_id` ON room_users(socket_id)

### messages
- `idx_messages_sender_id` ON messages(sender_id)
- `idx_messages_room_id` ON messages(room_id)
- `idx_messages_game_id` ON messages(game_id)
- `idx_messages_created_at` ON messages(created_at)

### games
- `idx_games_room_id` ON games(room_id)

### gamePlayers
- `idx_game_players_game_id` ON "gamePlayers"(game_id)
- `idx_game_players_user_id` ON "gamePlayers"(user_id)

### gameCards
- `idx_game_cards_game_id` ON "gameCards"(game_id)
- `idx_game_cards_player_id` ON "gameCards"(player_id)
- `idx_game_cards_location` ON "gameCards"(location)

### gameState
- `idx_game_state_game_id` ON "gameState"(game_id)
- `idx_game_state_current_player` ON "gameState"(current_player_id)

## Relationships

1. **Users to Rooms** (Many-to-Many)
   - Through `room_users` table
   - A user can be in multiple rooms
   - A room can have multiple users

2. **Users to Messages** (One-to-Many)
   - A user can send multiple messages
   - Each message has one sender

3. **Rooms to Messages** (One-to-Many)
   - A room can have multiple messages
   - Each message can belong to one room

4. **Rooms to Games** (One-to-One)
   - A room can have one active game
   - Each game belongs to one room

5. **Games to Game Players** (One-to-Many)
   - A game can have multiple players
   - Each player record belongs to one game

6. **Games to Game Cards** (One-to-Many)
   - A game can have multiple cards
   - Each card belongs to one game

7. **Games to Game State** (One-to-One)
   - A game has one state
   - Each game state belongs to one game

8. **Users to Game Players** (One-to-Many)
   - A user can be a player in multiple games
   - Each game player record belongs to one user

9. **Users to Game Cards** (One-to-Many)
   - A user can have multiple cards in a game
   - Each card can belong to one user (when in player's hand)

## Notes

- All tables include `created_at` and `updated_at` timestamps for tracking record changes
- Foreign key constraints use `ON DELETE CASCADE` where appropriate to maintain referential integrity
- Unique constraints prevent duplicate entries in many-to-many relationships
- Indexes are created on frequently queried columns and foreign keys
- The `gameState` table tracks the current state of an active game
- The `gameCards` table manages the distribution and location of cards in a game
- The `gamePlayers` table tracks player participation and their hand cards 