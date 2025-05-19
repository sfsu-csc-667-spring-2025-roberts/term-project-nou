# Database Tables Visualization

## Users Table

```mermaid
classDiagram
    class Users {
        +serial id
        +varchar username
        +varchar email
        +varchar password
        +integer gamesPlayed
        +integer gamesWon
        +float winRate
        +integer totalScore
        +boolean isOnline
        +timestamp lastActive
        +timestamp createdAt
        +timestamp updatedAt
    }
```

## Rooms Table

```mermaid
classDiagram
    class Rooms {
        +serial id
        +varchar name
        +varchar status
        +integer max_players
        +integer current_players
        +integer starting_cards
        +boolean draw_until_playable
        +boolean stacking
        +integer created_by
        +boolean is_private
        +varchar password
        +timestamp created_at
        +timestamp updated_at
    }
```

## Games Table

```mermaid
classDiagram
    class Games {
        +serial id
        +integer room_id
        +varchar status
        +integer current_player_id
        +integer direction
        +timestamp created_at
        +timestamp updated_at
    }
```

## Game State Table

```mermaid
classDiagram
    class GameState {
        +serial id
        +integer game_id
        +json state
        +timestamp created_at
        +timestamp updated_at
    }
```

## Player Hand Table

```mermaid
classDiagram
    class PlayerHand {
        +serial id
        +integer game_id
        +integer user_id
        +json cards
        +timestamp created_at
        +timestamp updated_at
    }
```

## Messages Table

```mermaid
classDiagram
    class Messages {
        +serial id
        +integer game_id
        +integer user_id
        +varchar content
        +timestamp created_at
    }
```

## Room Users Table

```mermaid
classDiagram
    class RoomUsers {
        +serial id
        +integer room_id
        +integer user_id
        +varchar socket_id
        +timestamp created_at
    }
```

## Game Users Table

```mermaid
classDiagram
    class GameUsers {
        +serial id
        +integer game_id
        +integer user_id
        +integer score
        +boolean is_ready
        +timestamp created_at
    }
```

## Cards Table

```mermaid
classDiagram
    class Cards {
        +serial id
        +integer game_id
        +varchar color
        +varchar value
        +boolean is_played
        +timestamp created_at
    }
```

## Table Relationships

```mermaid
erDiagram
    USERS ||--o{ ROOMS : creates
    USERS ||--o{ GAMES : plays
    USERS ||--o{ PLAYER_HAND : has
    ROOMS ||--o{ GAMES : contains
    GAMES ||--o{ GAME_STATE : has
    GAMES ||--o{ PLAYER_HAND : contains
    GAMES ||--o{ MESSAGES : contains
    ROOMS ||--o{ ROOM_USERS : contains
    GAMES ||--o{ GAME_USERS : contains
    GAMES ||--o{ CARDS : uses
```

## Data Flow

```mermaid
graph TD
    A[Users] --> B[Rooms]
    A --> C[Games]
    B --> C
    C --> D[Game State]
    C --> E[Player Hand]
    C --> F[Messages]
    C --> G[Cards]
    B --> H[Room Users]
    C --> I[Game Users]
    A --> H
    A --> I
    A --> E
```
