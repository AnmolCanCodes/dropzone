# DROPZONE

**A browser-based, real-time multiplayer battle royale built with
Node.js, Express, Socket.IO, React, and Phaser.**

DROPZONE is an educational but production-minded multiplayer game
project. Players enter a shared arena, move around an island, collect
weapons and supplies, fight other players, avoid a shrinking safe zone,
and compete to be the last survivor.

The project is designed to teach backend engineering by building a
real-time application from the ground up. It is not a static game
mockup, a single-player demo, or a CRUD tutorial. The browser renders
the game, but the backend owns the authoritative match state and decides
what actually happens.

> **Initial scope decision:** The first playable version is a **2D
> top-down battle royale**. This keeps the rendering and asset workload
> manageable while preserving the important multiplayer engineering
> problems: real-time networking, server-authoritative simulation, input
> validation, synchronization, matchmaking, persistence, and operational
> reliability. A 3D client is a possible future project, not part of the
> initial MVP.

------------------------------------------------------------------------

## Contents

-   [1. Project vision](#1-project-vision)
-   [2. What players do](#2-what-players-do)
-   [3. Goals and non-goals](#3-goals-and-non-goals)
-   [4. Feature roadmap](#4-feature-roadmap)
-   [5. Technology stack](#5-technology-stack)
-   [6. System architecture](#6-system-architecture)
-   [7. Repository structure](#7-repository-structure)
-   [8. How a match works](#8-how-a-match-works)
-   [9. Backend request lifecycle](#9-backend-request-lifecycle)
-   [10. Game networking model](#10-game-networking-model)
-   [11. Data and persistence](#11-data-and-persistence)
-   [12. Local development setup](#12-local-development-setup)
-   [13. Environment configuration](#13-environment-configuration)
-   [14. Running the project](#14-running-the-project)
-   [15. Testing strategy](#15-testing-strategy)
-   [16. Security principles](#16-security-principles)
-   [17. Performance and scaling
    direction](#17-performance-and-scaling-direction)
-   [18. Documentation map](#18-documentation-map)
-   [19. Development workflow](#19-development-workflow)
-   [20. Current status](#20-current-status)

------------------------------------------------------------------------

## 1. Project vision

DROPZONE is a browser battle royale inspired by the core loop of games
such as PUBG and BGMI, adapted to a small 2D arena and a realistic
learning-project scope.

A player should be able to:

1.  Open the website and create an account.
2.  Enter a lobby and join a match queue.
3.  Be assigned to a match with other players.
4.  Spawn on an island map.
5.  Move, aim, shoot, collect loot, and fight.
6.  Survive as the safe zone shrinks.
7.  Win by being the last living player.
8.  View match results and update their profile statistics.

The first milestone is not to reproduce every feature of a commercial
battle royale. It is to build a complete, understandable, reliable
vertical slice: a small match that works from lobby to final result.

### Product principles

-   **Browser-first:** no native game installation is required.
-   **Server-authoritative:** the server validates actions and owns the
    canonical match state.
-   **Small, complete matches:** prioritize a complete match loop over a
    huge map or dozens of weapons.
-   **Readable architecture:** keep HTTP, networking, simulation,
    persistence, and rendering responsibilities separate.
-   **Incremental complexity:** begin with one backend process and
    introduce Redis or multiple game workers only when the design needs
    them.
-   **Testable game rules:** important game mechanics should be
    deterministic enough to test without launching a browser.

------------------------------------------------------------------------

## 2. What players do

### Match loop

A typical match follows this sequence:

1.  **Lobby:** players connect and wait for enough participants.
2.  **Countdown:** the server locks the roster and prepares the match.
3.  **Spawn:** players are assigned valid spawn positions.
4.  **Loot:** players search the map for weapons, ammunition, and
    healing items.
5.  **Combat:** players move, aim, fire, take damage, and get
    eliminated.
6.  **Zone pressure:** the safe area contracts according to the match
    phase.
7.  **Final encounter:** surviving players converge in the remaining
    safe area.
8.  **Results:** the server records the winner and match statistics.

### Initial gameplay controls

  Input               Action
  ------------------- ------------------------
  W / A / S / D       Move
  Mouse               Aim
  Left mouse button   Fire
  E                   Pick up nearby item
  Escape              Open pause/settings UI

Controls may change during implementation. The server must never trust
the browser to decide authoritative position, damage, inventory, or
match outcome.

------------------------------------------------------------------------

## 3. Goals and non-goals

### Initial goals

-   A playable 2D top-down map.
-   2--20 players per match as a configurable target, not a guaranteed
    capacity claim.
-   Server-controlled movement and combat rules.
-   Real-time player updates using Socket.IO.
-   Weapons, ammunition, health, loot, and eliminations.
-   A shrinking safe zone and zone damage.
-   Lobby and matchmaking flow.
-   Account authentication and persistent match history.
-   Automated tests for important game rules and API behavior.
-   Local development instructions that another developer can follow.

### Explicit non-goals for the first MVP

-   3D graphics or a full PUBG/BGMI clone.
-   Mobile-native applications.
-   Voice chat.
-   Vehicles, parachuting, complex ballistics, attachments, or advanced
    animations.
-   Ranked seasons, clans, friends, cosmetics, battle passes, or
    monetization.
-   Anti-cheat guarantees against sophisticated attackers.
-   Global multi-region deployment.
-   Microservices or Kubernetes.

These may be future enhancements. Keeping them out of the MVP prevents
the project from becoming too large to finish.

------------------------------------------------------------------------

## 4. Feature roadmap

The roadmap is ordered by dependency. A later feature should not be
started until its prerequisite behavior is working and tested.

### Milestone 0 --- Repository and development foundation

-   Create the monorepo.
-   Initialize backend and frontend packages.
-   Configure environment variables and scripts.
-   Add linting and formatting conventions.
-   Add documentation and Git ignore rules.
-   Verify that both applications start.

**Exit condition:** a clean clone can install dependencies and start the
development applications.

### Milestone 1 --- Local game world

-   Initialize Phaser.
-   Create a map scene and player entity.
-   Implement keyboard movement and mouse aiming locally.
-   Add camera following and world boundaries.
-   Create a basic HUD.

**Exit condition:** one player can move around a local map in the
browser.

### Milestone 2 --- Real-time connection

-   Start an HTTP server and attach Socket.IO.
-   Connect the browser client.
-   Assign a server-side player/session identity.
-   Broadcast player joins, leaves, and movement state.
-   Handle disconnect and reconnect behavior.

**Exit condition:** two browser windows can see each other moving.

### Milestone 3 --- Authoritative simulation

-   Create a match state model.
-   Add a fixed-timestep simulation loop.
-   Process validated player inputs.
-   Implement movement limits and world boundaries.
-   Broadcast snapshots.
-   Add basic interpolation on the client.

**Exit condition:** clients send input intentions; the server calculates
positions.

### Milestone 4 --- Combat

-   Add weapons and ammunition.
-   Add firing cooldowns and reload rules.
-   Add bullet/projectile or hitscan resolution.
-   Add collision and damage.
-   Add elimination state.

**Exit condition:** two players can fight, take damage, and be
eliminated using server-calculated results.

### Milestone 5 --- Battle royale loop

-   Add loot spawning and pickup validation.
-   Add safe-zone phases.
-   Add zone damage.
-   Add match countdown, active, finished, and cancelled states.
-   Detect the winner.

**Exit condition:** a match can start, progress, and finish.

### Milestone 6 --- Accounts and persistence

-   Add registration and login.
-   Store password hashes, not passwords.
-   Add player profiles.
-   Persist match results and statistics.
-   Add match history endpoints.

**Exit condition:** a player can log in and see their completed match
history.

### Milestone 7 --- Matchmaking and reliability

-   Add a matchmaking queue.
-   Add queue cancellation and timeout handling.
-   Add reconnect grace periods.
-   Add rate limits and structured logs.
-   Add load and integration tests.

**Exit condition:** players can be assigned to matches through the lobby
and recover from expected connection failures.

### Milestone 8 --- Production preparation

-   Add Dockerfiles and Docker Compose.
-   Add CI checks.
-   Add health/readiness endpoints.
-   Add graceful shutdown.
-   Measure server tick time, connected clients, and outbound traffic.
-   Evaluate Redis and multi-process deployment only after measuring a
    real bottleneck.

**Exit condition:** reproducible deployment and documented operational
behavior.

------------------------------------------------------------------------

## 5. Technology stack

  -----------------------------------------------------------------------
  Area                    Technology              Responsibility
  ----------------------- ----------------------- -----------------------
  Runtime                 Node.js LTS             Executes backend
                                                  JavaScript

  HTTP framework          Express 5               REST API, routing,
                                                  middleware

  Real-time transport     Socket.IO               Bidirectional events
                                                  and rooms

  Browser UI              React                   Lobby, account pages,
                                                  profile, HUD shell

  2D game rendering       Phaser 3                Canvas rendering,
                                                  scenes, input, client
                                                  visuals

  Database                PostgreSQL              Accounts, profiles,
                                                  match records

  ORM                     Prisma                  Schema, migrations,
                                                  database queries

  Validation              Zod                     Validate external input
                                                  and configuration

  Cache/coordination      Redis (later milestone) Queue coordination,
                                                  presence, shared
                                                  ephemeral data

  Testing                 Node test runner or     Unit and HTTP
                          Vitest, Supertest       integration tests

  Load testing            k6 (later milestone)    Simulated HTTP and
                                                  WebSocket load

  Containers              Docker Compose          Local infrastructure
                                                  and repeatable setup
  -----------------------------------------------------------------------

### Why React and Phaser?

React is suited to application UI such as login, lobby, settings,
profile, and match history. Phaser owns the actual 2D game canvas and
gameplay rendering.

Avoid rendering every moving game object as a React component. The game
world should be updated through Phaser's scene and entity systems. React
and Phaser communicate through a small, explicit integration boundary.

### Why Socket.IO?

Socket.IO provides event-based communication, acknowledgements, rooms,
and reconnection support. It is not identical to the raw WebSocket
protocol. The server and browser use the Socket.IO client/server
libraries together.

------------------------------------------------------------------------

## 6. System architecture

The application is initially a **modular monolith**: one backend
codebase and one deployable backend process, with clear internal
boundaries.

``` text
                         BROWSER
        ┌─────────────────────────────────────┐
        │ React application                   │
        │ Login / Lobby / Profile / Results   │
        │                                     │
        │ Phaser game client                  │
        │ Map / Camera / Input / HUD          │
        └──────────────────┬──────────────────┘
                           │
               HTTPS REST  │  Socket.IO
                           │
        ┌──────────────────▼──────────────────┐
        │ Node.js process                     │
        │                                     │
        │ Express application                 │
        │ Routes → Middleware → Controllers   │
        │                    → Services       │
        │                                     │
        │ Socket.IO gateway                   │
        │ Events → Validation → Game service │
        │                                     │
        │ Game runtime                        │
        │ Match manager                       │
        │ Simulation loop                     │
        │ Movement / Combat / Zone / Loot     │
        └──────────────┬───────────┬──────────┘
                       │           │
                ┌──────▼────┐  ┌───▼────┐
                │ PostgreSQL│  │ Redis  │
                │ Durable   │  │ Later  │
                │ records   │  │        │
                └───────────┘  └────────┘
```

### Main boundaries

**HTTP API:** handles operations that naturally fit request/response
semantics: authentication, profiles, match history, and queue
management.

**Socket gateway:** authenticates a socket connection, validates event
payloads, associates sockets with players/matches, and delegates actions
to application services.

**Game engine:** owns the simulation rules. It should not import
Express, Socket.IO, Prisma, or browser code.

**Persistence:** stores durable data. The game simulation should not
issue a database query for every movement update or every simulation
tick.

**Frontend:** renders the latest known state, collects user input, and
sends input intentions. It is not authoritative.

### Dependency direction

-   Routes may call controllers.
-   Controllers may call services.
-   Services may call repositories/models.
-   Socket handlers may call application/game services.
-   The game engine should depend on plain game-domain code, not
    transport or database infrastructure.
-   Frontend code must not import backend implementation files.
-   Shared code should contain only safe, transport-neutral contracts
    and constants.

------------------------------------------------------------------------

## 7. Repository structure

The following is the target structure. Create folders when the
corresponding milestone needs them; empty folders are not useful.

``` text
dropzone/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   ├── routes/
│   │   ├── controllers/
│   │   ├── services/
│   │   ├── middlewares/
│   │   ├── models/
│   │   ├── game/
│   │   │   ├── engine/
│   │   │   ├── systems/
│   │   │   ├── entities/
│   │   │   ├── physics/
│   │   │   └── weapons/
│   │   ├── sockets/
│   │   ├── matchmaking/
│   │   ├── jobs/
│   │   ├── utils/
│   │   ├── app.js
│   │   └── server.js
│   ├── prisma/
│   │   └── schema.prisma
│   ├── tests/
│   ├── package.json
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── features/
│   │   ├── game/
│   │   │   ├── scenes/
│   │   │   ├── entities/
│   │   │   ├── systems/
│   │   │   ├── network/
│   │   │   └── ui/
│   │   ├── hooks/
│   │   ├── services/
│   │   └── styles/
│   ├── public/
│   ├── assets/
│   └── package.json
├── shared/
│   ├── events.js
│   ├── game.constants.js
│   └── schemas/
├── docs/
│   ├── ARCHITECTURE.md
│   ├── GAME_DESIGN.md
│   ├── API.md
│   ├── SOCKET_EVENTS.md
│   ├── DATABASE.md
│   └── DEVELOPMENT.md
├── .github/
│   └── workflows/
├── .env.example
├── .gitignore
├── package.json
├── package-lock.json
├── docker-compose.yml
└── README.md
```

### Backend folder responsibilities

  -----------------------------------------------------------------------
  Path                                Responsibility
  ----------------------------------- -----------------------------------
  `backend/src/config/`               Load and validate environment
                                      configuration; create
                                      infrastructure clients

  `routes/`                           Declare HTTP method and URL
                                      mappings

  `controllers/`                      Translate HTTP requests into
                                      service calls and HTTP responses

  `services/`                         Application use cases such as
                                      registration, profile updates, and
                                      match history

  `middlewares/`                      Authentication, request validation,
                                      rate limits, and error handling

  `models/`                           Database access/repositories; keep
                                      query details out of controllers

  `game/engine/`                      Match runtime, tick loop, state
                                      transitions

  `game/systems/`                     Movement, combat, safe zone, loot,
                                      and match rules

  `game/entities/`                    Domain representations of players,
                                      projectiles, and loot

  `game/physics/`                     Collision and spatial calculations

  `game/weapons/`                     Weapon definitions and
                                      firing/reload rules

  `sockets/`                          Socket connection lifecycle and
                                      event handlers

  `matchmaking/`                      Queue, party assignment, and match
                                      allocation

  `jobs/`                             Work that should run outside a
                                      request or simulation tick

  `utils/`                            Small reusable helpers; avoid
                                      turning this into a dumping ground

  `app.js`                            Build and configure the Express
                                      application

  `server.js`                         Create the HTTP server, attach
                                      Socket.IO, and start listening
  -----------------------------------------------------------------------

### Frontend folder responsibilities

  -----------------------------------------------------------------------
  Path                                Responsibility
  ----------------------------------- -----------------------------------
  `app/`                              React application setup, providers,
                                      and routing

  `components/`                       Reusable application UI components

  `pages/`                            Route-level pages such as Login,
                                      Lobby, Profile

  `features/`                         Feature-oriented application
                                      modules

  `game/scenes/`                      Phaser scenes such as Boot,
                                      Preload, and Match

  `game/entities/`                    Client-side visual representations
                                      of players, bullets, and loot

  `game/systems/`                     Client rendering and presentation
                                      systems

  `game/network/`                     Socket connection and game event
                                      client

  `game/ui/`                          In-game HUD and overlays

  `hooks/`                            Reusable React hooks

  `services/`                         HTTP API client and application
                                      service functions

  `styles/`                           Global styles and design tokens

  `public/`                           Static files served directly

  `assets/`                           Game images, maps, sprites, and
                                      audio
  -----------------------------------------------------------------------

### Shared folder responsibilities

`shared/` contains small pieces of code that both client and server can
safely import.

-   `events.js`: event name constants.
-   `game.constants.js`: public game constants such as world dimensions
    or input limits.
-   `schemas/`: transport payload schemas where sharing the same
    validation code is practical.

Never put secrets, database code, server-only rules, or authoritative
game state in `shared/`.

### Root-level files

  -----------------------------------------------------------------------
  File                                Purpose
  ----------------------------------- -----------------------------------
  `package.json`                      Root scripts and npm workspace
                                      configuration

  `package-lock.json`                 Locked dependency tree for
                                      reproducible npm installs

  `.env.example`                      Documented example configuration
                                      without real secrets

  `.gitignore`                        Excludes dependencies, secrets,
                                      build output, logs

  `docker-compose.yml`                Local PostgreSQL and later Redis
                                      services

  `README.md`                         Project introduction and onboarding

  `.github/workflows/`                CI checks such as install, lint,
                                      and test
  -----------------------------------------------------------------------

There is no Python `requirements.txt` in this JavaScript project.
`package.json` declares dependencies and `package-lock.json` locks their
resolved versions.

------------------------------------------------------------------------

## 8. How a match works

### Match lifecycle

A match has explicit states:

``` text
WAITING
   │ enough players / host or queue starts
   ▼
COUNTDOWN
   │ countdown completes
   ▼
ACTIVE
   │ one survivor remains / match ends
   ▼
FINISHED
```

A match may also enter `CANCELLED` if it cannot start or is
administratively stopped.

Only valid transitions should be allowed. For example, a finished match
cannot return to active.

### Server simulation

The server runs a fixed-timestep simulation. The initial target is 20
simulation ticks per second, meaning a nominal step of 50 ms. This is a
starting configuration for experimentation, not a performance guarantee.

A simulation tick may:

1.  Read queued inputs.
2.  Validate input state and rate limits.
3.  Update player movement.
4.  Resolve world boundaries and collisions.
5.  Process firing and projectile movement.
6.  Resolve hits and damage.
7.  Update loot and pickups.
8.  Update safe-zone phase and zone damage.
9.  Detect eliminations and match completion.
10. Produce a network snapshot.

The simulation must account for elapsed time and avoid assuming that
every timer callback runs exactly on schedule. Long-running work must
not block the Node.js event loop.

### Server-authoritative rules

The client may send: - Directional input. - Aim angle or aim
direction. - Fire pressed/released state. - Pickup intent and target
item identifier.

The client must not decide: - Its authoritative position. - Its health
or armor. - Damage dealt. - Whether a bullet hit. - Inventory
contents. - Loot availability. - Whether a player is eliminated. - Who
won the match.

The server validates and calculates these outcomes.

------------------------------------------------------------------------

## 9. Backend request lifecycle

### REST request example

A client requests its match history:

``` http
GET /api/v1/matches/history?page=1&limit=10
Authorization: Bearer <access-token>
```

The intended flow is:

``` text
HTTP request
  → Express router
  → request ID / logging middleware
  → authentication middleware
  → query validation middleware
  → match controller
  → match history service
  → repository / Prisma
  → PostgreSQL
  → JSON response
```

Responsibilities:

-   **Route:** selects the controller.
-   **Middleware:** cross-cutting checks such as authentication and
    validation.
-   **Controller:** understands HTTP and maps results to status codes.
-   **Service:** implements the use case and business rules.
-   **Repository/model:** performs database operations.

Controllers should not contain SQL/Prisma query logic or game simulation
rules.

### Express application vs server startup

`app.js` should configure Express: middleware, routes, not-found
handling, and error handling. It should export the configured app.

`server.js` should create the Node HTTP server, attach Socket.IO,
register socket handlers, and start listening. This separation makes the
Express app easier to test without binding a network port.

------------------------------------------------------------------------

## 10. Game networking model

Socket.IO is used for real-time events. REST remains useful for account
and historical data.

### Input and snapshot model

The client sends small input messages rather than claiming a new
authoritative position.

Example input:

``` json
{
  "sequence": 104,
  "movement": {
    "up": true,
    "down": false,
    "left": false,
    "right": true
  },
  "aimAngle": 1.25,
  "fire": false
}
```

The server validates: - The player belongs to the match. - The match is
active. - The payload has the expected shape. - The sequence is
plausible and not stale. - The input rate is within configured limits. -
The player is allowed to perform the action.

The server then updates its simulation and sends a snapshot.

### Snapshot principles

-   Include only information the recipient is allowed to know.
-   Avoid sending database records directly.
-   Avoid broadcasting unnecessary data.
-   Use compact payloads as the game grows.
-   Add snapshot sequence/tick identifiers.
-   Measure message size and frequency.
-   Consider interest management when maps and player counts grow.

### Reconciliation

The initial client may simply interpolate between received snapshots.
Later, implement client-side prediction for the local player and server
reconciliation using input sequence numbers.

Do not implement prediction before the authoritative server movement
works correctly. Prediction makes a broken authority model harder to
debug.

------------------------------------------------------------------------

## 11. Data and persistence

PostgreSQL stores durable information, not every transient simulation
update.

Likely durable entities:

-   User
-   PlayerProfile
-   Match
-   MatchParticipant
-   PlayerStatistics

The exact schema is documented in `DATABASE.md`.

### What belongs in PostgreSQL?

-   Account credentials (password hashes only).
-   Profile and display name.
-   Completed match result.
-   Participant statistics.
-   Created/updated timestamps.

### What belongs in live game memory?

-   Current player position.
-   Current health during a match.
-   Current weapon and ammunition.
-   Active projectiles.
-   Temporary loot state.
-   Current safe-zone state.
-   Match tick and transient input queues.

At match completion, the backend persists the result and participant
statistics.

### Why not write every tick to the database?

A simulation may update many objects many times per second. Persisting
every movement update creates unnecessary database load and couples
gameplay performance to database latency.

Use memory for live state and persist meaningful durable events/results.
If a process crashes, in-memory matches may be lost in the first
version; recovery and distributed match ownership are later engineering
concerns.

------------------------------------------------------------------------

## 12. Local development setup

### Prerequisites

Install:

-   Git
-   Node.js LTS (use the repository's `.nvmrc` when created)
-   npm
-   PostgreSQL, or Docker for local PostgreSQL
-   A code editor
-   A browser
-   Postman, Insomnia, or curl for API testing

Redis is not required for the first milestones.

### Clone and install

``` bash
git clone <your-repository-url>
cd dropzone

# Install all workspaces after the root npm workspace is configured.
npm install
```

Do not run the workspace command until the root `package.json` has been
created with the correct workspaces. During the earliest setup
milestone, install backend and frontend dependencies from their
respective folders.

### Environment

Copy the example environment file and fill in local values:

``` bash
cp .env.example .env
```

Never commit `.env`.

### Database

Start PostgreSQL locally or with Docker. Once Prisma is configured:

``` bash
npx prisma migrate dev
npx prisma generate
```

Run commands from the backend workspace or use the root workspace
scripts once configured.

------------------------------------------------------------------------

## 13. Environment configuration

The exact variables will evolve. Keep `.env.example` synchronized with
the configuration schema.

Example categories:

``` dotenv
NODE_ENV=development
PORT=4000
CLIENT_ORIGIN=http://localhost:5173

DATABASE_URL=postgresql://dropzone:change-me@localhost:5432/dropzone

JWT_ACCESS_SECRET=replace-with-a-long-random-secret
JWT_ACCESS_EXPIRES_IN=15m

GAME_TICK_RATE=20
GAME_MAX_PLAYERS=20

REDIS_URL=redis://localhost:6379
```

Important:

-   These values are examples, not production secrets.
-   Generate strong random secrets for local and production
    environments.
-   Do not use a real production database password in a committed file.
-   Validate required environment variables at startup.
-   Do not enable Redis-dependent code until Redis is part of the active
    milestone.
-   Restrict CORS to known frontend origins.
-   Keep environment-specific configuration out of source code.

------------------------------------------------------------------------

## 14. Running the project

The exact scripts will be added during repository setup. The intended
developer experience is:

``` bash
# Start backend
npm run dev --workspace=backend

# Start frontend
npm run dev --workspace=frontend

# Run backend tests
npm test --workspace=backend

# Run lint checks
npm run lint
```

The root workspace scripts may provide shorter aliases later.

Expected local services:

  Service           Example address
  ----------------- --------------------------------
  Frontend          `http://localhost:5173`
  Backend API       `http://localhost:4000`
  Health endpoint   `http://localhost:4000/health`
  PostgreSQL        `localhost:5432`
  Redis (later)     `localhost:6379`

These ports are proposed defaults and may be changed in environment
configuration.

------------------------------------------------------------------------

## 15. Testing strategy

Testing is part of implementation, not a final cleanup task.

### Unit tests

Test pure game rules without network or database dependencies:

-   Movement speed and world boundaries.
-   Weapon fire cooldown.
-   Reload rules.
-   Damage calculation.
-   Collision calculations.
-   Safe-zone damage.
-   Match state transitions.
-   Winner detection.

### API integration tests

Test: - Health endpoint. - Registration and login validation. -
Unauthorized requests. - Profile retrieval. - Match history
pagination. - Invalid payloads and error responses.

### Socket integration tests

Test: - Socket authentication. - Player join and leave. - Invalid match
membership. - Input validation. - Rate limiting. - Disconnect
behavior. - Snapshot delivery.

### Load tests

Later, simulate multiple clients and measure: - Connection success
rate. - Event throughput. - Server tick duration. - Event-loop delay. -
Memory usage. - Outbound bandwidth. - Snapshot size.

Do not claim a player capacity until it has been measured under a
documented test setup.

------------------------------------------------------------------------

## 16. Security principles

-   Hash passwords using a suitable password-hashing algorithm.
-   Never store plaintext passwords or secrets in Git.
-   Validate every HTTP and socket payload.
-   Authenticate sockets and authorize each match action.
-   Enforce server-side movement, fire-rate, pickup, and damage rules.
-   Apply rate limits to authentication and sensitive endpoints.
-   Restrict CORS and configure security headers.
-   Avoid exposing internal error stacks to clients in production.
-   Do not trust client-supplied user IDs for authenticated actions.
-   Avoid logging access tokens, passwords, or sensitive personal data.
-   Treat reconnect tokens and session identifiers as credentials.
-   Keep dependencies updated and review security advisories.

A server-authoritative design raises the cost of cheating but does not
guarantee cheat-proof gameplay. Production anti-cheat requires
additional threat modeling, telemetry, and abuse detection.

------------------------------------------------------------------------

## 17. Performance and scaling direction

Start with one Node.js process that owns its active matches. This is the
simplest model to reason about and debug.

Potential future bottlenecks:

-   Too many simulation ticks in one process.
-   Expensive collision checks.
-   Large snapshots.
-   Too many socket messages.
-   Blocking CPU work.
-   Database writes during active simulation.
-   Memory growth from abandoned matches.

Measure before optimizing.

Possible later improvements:

1.  Use spatial partitioning for collision and nearby-entity queries.
2.  Reduce snapshot frequency or payload size where appropriate.
3.  Send updates only to relevant players.
4.  Move CPU-heavy work to worker threads or separate processes when
    justified.
5.  Use Redis for cross-process coordination and Socket.IO adapter
    support.
6.  Assign each match to one authoritative game worker.
7.  Persist match results asynchronously and safely.
8.  Add monitoring and alerts.

**Important distributed-systems rule:** Redis pub/sub does not
automatically make game state safe across multiple servers. A match
needs a clear owner. Do not let two workers independently simulate the
same match.

------------------------------------------------------------------------

## 18. Documentation map

  -----------------------------------------------------------------------
  Document                            Purpose
  ----------------------------------- -----------------------------------
  `ARCHITECTURE.md`                   Components, boundaries, data flow,
                                      runtime model

  `GAME_DESIGN.md`                    Match rules, controls, weapons,
                                      map, safe zone

  `API.md`                            REST routes, request/response
                                      contracts, status codes

  `SOCKET_EVENTS.md`                  Socket event names, payloads,
                                      authorization, delivery

  `DATABASE.md`                       Entities, relationships, indexes,
                                      persistence decisions

  `DEVELOPMENT.md`                    Installation, scripts, environment,
                                      testing, contribution workflow
  -----------------------------------------------------------------------

Update the relevant document when behavior or a contract changes.
Documentation should describe implemented behavior or clearly label
planned behavior.

------------------------------------------------------------------------

## 19. Development workflow

Use small, reviewable tasks.

For each feature:

1.  Read the relevant architecture/design document.
2.  Define the behavior and acceptance criteria.
3.  Identify which layer owns the behavior.
4.  Implement the smallest working version.
5.  Add tests for expected and invalid behavior.
6.  Run lint and tests.
7.  Update documentation.
8.  Commit the change with a descriptive message.

Suggested commit style:

``` text
chore: initialize backend workspace
feat(api): add health endpoint
feat(game): add player movement model
feat(network): connect browser client with socket server
test(game): cover movement boundaries
docs: document socket input contract
```

Do not combine unrelated features into one giant commit.

### Working with AI coding tools

Use AI to explain unfamiliar Node.js behavior, review code, propose test
cases, and help diagnose errors. Do not ask it to generate the entire
project in one pass.

A useful workflow is: ask for one milestone, inspect every file, run it,
test it, intentionally break it, and understand the fix before moving
on.

------------------------------------------------------------------------

## 20. Current status

This repository begins as a planned learning project. The roadmap and
architecture describe intended behavior; they do not imply that features
already exist.

  Area                    Initial status
  ----------------------- -----------------------------
  Project documentation   Planned / being established
  Backend foundation      Not implemented
  Frontend foundation     Not implemented
  Local game world        Not implemented
  Multiplayer             Not implemented
  Combat                  Not implemented
  Matchmaking             Not implemented
  Persistence             Not implemented
  Production deployment   Not implemented

The first implementation milestone is repository initialization and a
working Express health endpoint. Build the project in small steps and
update this table as features become real.

------------------------------------------------------------------------

## License

Choose and add a license before accepting external contributions. MIT is
a reasonable option for an open-source learning project, but the
repository owner should make that decision explicitly.