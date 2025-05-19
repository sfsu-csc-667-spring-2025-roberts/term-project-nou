# Project Structure Documentation

## 1. Root Directory Structure

```
term-project-nou/
├── src/                  # Source code directory
├── public/              # Static assets
├── migrations/          # Database migrations
├── dist/               # Compiled output
├── node_modules/       # Dependencies
├── .husky/            # Git hooks
├── package.json        # Project configuration and dependencies
├── tsconfig.json      # TypeScript configuration
└── webpack.config.ts  # Webpack bundler configuration
```

## 2. Source Code Structure (`src/`)

```
src/
├── client/            # Client-side code
└── server/            # Server-side code
    ├── routes/        # API route handlers
    ├── views/         # EJS templates
    ├── middleware/    # Express middleware
    ├── db/           # Database related code
    ├── config/       # Configuration files
    ├── index.ts      # Server entry point
    └── socket.ts     # WebSocket implementation
```

## 3. Detailed File Analysis

### Server-Side Components

#### A. Main Server Files

1. **`src/server/index.ts`**

   - Server entry point
   - Express application setup
   - Middleware configuration
   - Route registration
   - WebSocket server initialization
   - Development environment setup (livereload)

2. **`src/server/socket.ts`**
   - WebSocket server implementation
   - Real-time game state management
   - Player communication handling
   - Game event broadcasting

#### B. Routes (`src/server/routes/`)

1. **`auth.ts`**

   - User authentication endpoints
   - Login/Register functionality
   - Session management
   - User validation

2. **`lobby.ts`**

   - Game lobby management
   - Player waiting room
   - Room creation/joining
   - Player status updates

3. **`rooms.ts`**

   - Room management
   - Player matching
   - Room state management
   - Room lifecycle handling

4. **`games.ts`**

   - Game logic endpoints
   - Game state management
   - Player actions handling
   - Game results processing

5. **`root.ts`**

   - Root route handlers
   - Homepage rendering
   - Basic navigation

6. **`test.ts`**
   - Testing endpoints
   - Development utilities

#### C. Configuration (`src/server/config/`)

- Environment configuration
- Database connection settings
- Session configuration
- Security settings

#### D. Database (`src/server/db/`)

- Database models
- Query handlers
- Data access layer
- Migration scripts

#### E. Middleware (`src/server/middleware/`)

- Authentication middleware
- Request validation
- Error handling
- Logging middleware

#### F. Views (`src/server/views/`)

- EJS templates
- Page layouts
- Dynamic content rendering

### Client-Side Components

#### A. Client Code (`src/client/`)

- Frontend JavaScript/TypeScript
- UI components
- WebSocket client implementation
- Game interface logic

## 4. Data Flow Diagram

```
[Client] <---> [Server]
   |             |
   |             v
   |        [Middleware]
   |             |
   |             v
   |        [Routes]
   |             |
   |             v
   |        [Database]
   |             |
   |             v
[WebSocket] <---> [Game Logic]
```

## 5. Key Features and Responsibilities

### Authentication System

- User registration and login
- Session management
- Security middleware
- User validation

### Game Lobby System

- Player waiting room
- Room creation interface
- Player matching
- Status updates

### Room Management

- Room creation/deletion
- Player joining/leaving
- Room state synchronization
- Player matching logic

### Game Logic

- Game state management
- Player actions processing
- Real-time updates
- Game rules implementation

### Real-time Communication

- WebSocket connections
- Event broadcasting
- State synchronization
- Player interaction

## 6. Development Tools and Configuration

### Build Tools

- TypeScript configuration
- Webpack bundling
- Development server
- Hot reloading

### Database

- Migration system
- Schema management
- Data models
- Query optimization

### Security

- Session management
- Authentication
- Route protection
- Data validation

## 7. Deployment Structure

```
[Production Environment]
├── Compiled JavaScript
├── Static Assets
├── Database
└── Environment Configuration
```
