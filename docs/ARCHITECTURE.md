# DROPZONE --- Architecture

This document defines the intended software architecture for DROPZONE, a
browser-based 2D top-down multiplayer battle royale.

**Status:** Initial architecture proposal. Update this document when
implementation decisions change.

## 1. Architectural goals

-   Keep the game simulation independent of Express, Socket.IO, and the
    database.
-   Make server authority explicit: clients submit input intentions; the
    server calculates outcomes.
-   Separate HTTP request/response workflows from real-time game events.
-   Keep durable persistence outside the high-frequency simulation loop.
-   Begin as a modular monolith and scale only after measuring
    bottlenecks.
-   Make game rules testable without a browser or running server.

## 2. High-level system

``` text
Browser
├── React application
│   ├── Authentication
│   ├── Lobby and matchmaking UI
│   ├── Profile and match history
│   └── Application navigation
└── Phaser game client
    ├── Scenes and camera
    ├── Keyboard/mouse input
    ├── Visual entities
    ├── Snapshot interpolation
    └── Socket.IO client
             │
             ├── REST / HTTPS
             └── Socket.IO connection
                       │
Node.js backend
├── Express application
│   ├── Routes
│   ├── Middleware
│   ├── Controllers
│   └── Application services
├── Socket.IO gateway
│   ├── Authentication
│   ├── Event validation
│   └── Match room membership
├── Matchmaking
└── Game runtime
    ├── Match manager
    ├── Simulation loop
    ├── Movement system
    ├── Combat system
    ├── Loot system
    ├── Safe-zone system
    └── Match lifecycle
         │
         ├── PostgreSQL: durable records
         └── Redis: later coordination/cache
```

## 3. Architectural style

The first version is a modular monolith. Modules are separated by
responsibility, but run in one backend process.

Do not begin with microservices. A single process makes it easier to
reason about match ownership, state transitions, and debugging. The
internal boundaries should still allow future extraction if there is a
demonstrated need.

## 4. Backend layers

### 4.1 Configuration

`src/config/` loads environment variables, validates configuration, and
constructs infrastructure clients.

Configuration is validated once at startup. A missing required secret or
invalid database URL should cause a clear startup failure rather than a
later runtime surprise.

### 4.2 Routes

`src/routes/` declares HTTP methods and paths and attaches
middleware/controllers.

Routes should not contain database queries or business rules.

### 4.3 Controllers

`src/controllers/` handles HTTP-specific concerns:

-   Read path, query, body, and authenticated user data.
-   Call an application service.
-   Map the result to an HTTP status and JSON response.
-   Pass unexpected errors to centralized error handling.

Controllers should remain thin.

### 4.4 Services

`src/services/` implements application use cases such as registration,
login, profile updates, queue requests, and match-history retrieval.

A service coordinates domain logic and persistence. It should not depend
on Express request/response objects.

### 4.5 Models / repositories

`src/models/` contains database access or repository modules. Prisma
queries should not be duplicated across controllers.

### 4.6 Game domain

`src/game/` contains the authoritative simulation.

Suggested boundaries:

-   `engine/`: match runtime, tick scheduling, state transitions.
-   `systems/`: movement, combat, loot, zone, match lifecycle.
-   `entities/`: player, projectile, loot item domain state.
-   `physics/`: collision and spatial calculations.
-   `weapons/`: weapon configuration and firing rules.

The game domain should use plain JavaScript objects and functions where
practical. It should not import Express, Socket.IO, Prisma, or browser
packages.

### 4.7 Socket gateway

`src/sockets/` translates network events into validated application/game
commands.

It is responsible for:

-   Socket authentication.
-   Connection/disconnection lifecycle.
-   Payload validation.
-   Checking match membership.
-   Rate limiting and basic abuse protection.
-   Delegating actions to game services.
-   Sending snapshots/events to authorized recipients.

It should not implement damage formulas or movement physics itself.

### 4.8 Matchmaking

`src/matchmaking/` owns queue operations and match assignment. In the
first version, a process-local queue may be enough. Redis-backed
coordination is a later step if multiple backend processes must share
queue state.

### 4.9 Jobs

`src/jobs/` contains non-tick work that should not block an HTTP request
or simulation tick, such as post-match persistence or cleanup. A durable
job queue is introduced only when required.

## 5. Express application and HTTP server

Keep `app.js` separate from `server.js`.

`app.js`: - Creates the Express app. - Registers security and parsing
middleware. - Registers API routes. - Registers not-found and error
handlers. - Exports the app for testing.

`server.js`: - Creates the Node HTTP server using the Express app. -
Attaches Socket.IO to that HTTP server. - Registers socket handlers. -
Starts listening. - Handles graceful shutdown.

This separation allows HTTP tests to import the app without opening a
listening port.

## 6. Game simulation model

The server owns one authoritative state for each active match.

A match runtime may contain:

``` text
MatchRuntime
├── matchId
├── status
├── tick
├── players: Map<PlayerId, PlayerState>
├── projectiles: Map<ProjectileId, ProjectileState>
├── loot: Map<ItemId, LootState>
├── safeZone
├── inputQueues
└── timestamps
```

This is a conceptual model, not a required exact implementation.

### Fixed timestep

The initial target is 20 simulation ticks per second (nominal 50 ms
step). The loop should use elapsed time and a fixed simulation step
rather than assuming timers fire perfectly.

A tick processes queued input, updates movement, resolves
combat/collisions, updates world systems, checks match completion, and
produces a snapshot.

Avoid: - Blocking CPU-heavy loops. - Database queries on every tick. -
Unbounded input queues. - Sending a full snapshot for every individual
input. - Assuming `setInterval` guarantees exact timing.

Measure tick duration and event-loop delay.

## 7. Server authority

Clients send intentions, not outcomes.

Allowed examples: - Directional movement input. - Aim direction. - Fire
pressed/released. - Pickup intent for an item ID.

Server-owned outcomes: - Player position and velocity. - Fire cooldown
and ammunition. - Projectile position and hit result. - Health and
damage. - Inventory ownership. - Loot availability. - Elimination and
winner.

The server validates every external action. A client event is a request,
not proof that the action is legal.

## 8. Networking and state delivery

Socket.IO carries real-time inputs and snapshots. REST handles account
and historical operations.

The server should: - Authenticate the connection. - Bind the connection
to a server-known player identity. - Verify match membership for match
events. - Validate payload schemas. - Apply per-event rate limits. -
Broadcast only to relevant match members. - Include match/tick or
sequence identifiers where useful.

The client should: - Send input state at a controlled frequency. - Track
input sequence numbers. - Render snapshots. - Interpolate remote
entities. - Later predict local movement and reconcile against server
state.

Prediction is a client presentation technique. It must never change
server authority.

## 9. Persistence boundaries

PostgreSQL stores durable records: users, profiles, completed matches,
participant results, and statistics.

Live state remains in the game runtime's memory in the initial version.
Persist match outcomes at meaningful boundaries rather than writing
every movement tick.

This means an unexpected process crash may terminate active matches in
the first version. Match recovery and durable event sourcing are
explicitly outside the first MVP.

## 10. Failure handling

Expected failure cases include:

-   Socket disconnect during a match.
-   Client reconnects with a valid session.
-   Player abandons a match.
-   Match cannot reach minimum player count.
-   Database unavailable during startup.
-   Database unavailable during result persistence.
-   Malformed or excessive client input.
-   Server receives shutdown signal.

Define a reconnect grace period and a clear policy for disconnected
players. Do not silently create duplicate player entities on reconnect.

## 11. Scaling path

Initial deployment: one backend process owns all active matches.

Later: 1. Measure CPU, memory, event-loop delay, tick duration, and
network traffic. 2. Optimize simulation and snapshot payloads. 3. Add
spatial partitioning and interest management if needed. 4. Introduce
Redis for shared matchmaking/presence where required. 5. Use a Socket.IO
Redis adapter for cross-process message routing where appropriate. 6.
Assign each match to exactly one authoritative game worker. 7. Add
explicit ownership/lease and failure behavior before running multiple
game workers.

Redis pub/sub alone does not make a multi-process game state consistent.
A match must have one authoritative owner at a time.

## 12. Testing boundaries

-   Game systems: pure unit tests.
-   Services: unit tests with repository dependencies controlled/mocked.
-   Express: HTTP integration tests.
-   Socket gateway: socket integration tests.
-   Full match: deterministic simulation tests and multi-client tests.
-   Performance: load tests with documented hardware and client
    behavior.

## 13. Architecture decision records

For significant changes, add a short record under `docs/decisions/`
with: - Context. - Decision. - Alternatives considered. -
Consequences. - Date/status.

Examples: choosing Socket.IO, choosing a fixed timestep, choosing
process-local match ownership for the MVP.