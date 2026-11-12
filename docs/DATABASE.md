# DROPZONE --- Database Design

**Database:** PostgreSQL\
**ORM:** Prisma\
**Status:** Initial logical schema proposal. The actual Prisma schema
and migrations are created during the persistence milestone.

## 1. Persistence principles

PostgreSQL stores durable application data. The active game simulation
stores frequently changing match state in memory in the initial
architecture.

Persist: - User accounts. - Player profiles. - Completed match
records. - Participant results/statistics.

Do not persist every player position or simulation tick in the first
version.

## 2. Entity relationship overview

``` text
User 1 ───── 1 PlayerProfile

User 1 ───── * MatchParticipant * ───── 1 Match
```

A user can participate in many matches. A match has many participants. A
profile belongs to one user.

## 3. Tables

### User

Purpose: authentication identity.

  Field            Type concept   Notes
  ---------------- -------------- --------------------
  `id`             UUID           Primary key
  `email`          String         Unique, normalized
  `passwordHash`   String         Password hash only
  `createdAt`      Timestamp      Creation time
  `updatedAt`      Timestamp      Last update

Do not store plaintext passwords. Consider case-insensitive email
uniqueness and appropriate database constraints.

### PlayerProfile

Purpose: public-facing player identity and aggregate statistics.

  Field            Type concept       Notes
  ---------------- ------------------ ----------------------------
  `id`             UUID               Primary key
  `userId`         UUID               Unique foreign key to User
  `username`       String             Unique display handle
  `avatarKey`      String, nullable   Approved avatar identifier
  `totalMatches`   Integer            Server-calculated
  `totalWins`      Integer            Server-calculated
  `totalKills`     Integer            Server-calculated
  `createdAt`      Timestamp          Creation time
  `updatedAt`      Timestamp          Last update

Statistics must be updated by trusted backend logic, not user profile
update requests.

### Match

Purpose: durable summary of a completed match.

  Field            Type concept          Notes
  ---------------- --------------------- -----------------------------------
  `id`             UUID                  Primary key
  `status`         Enum/string           Completed/cancelled
  `mapKey`         String                Map identifier
  `startedAt`      Timestamp, nullable   Match start
  `endedAt`        Timestamp, nullable   Match end
  `winnerUserId`   UUID, nullable        Winner if applicable
  `endReason`      String                Last survivor, timeout, cancelled
  `createdAt`      Timestamp             Record creation

Do not keep a database transaction open for the duration of a live
match.

### MatchParticipant

Purpose: a user's result in a particular match.

  Field               Type concept   Notes
  ------------------- -------------- ----------------------
  `id`                UUID           Primary key
  `matchId`           UUID           Foreign key to Match
  `userId`            UUID           Foreign key to User
  `placement`         Integer        Final position
  `kills`             Integer        Server-calculated
  `damageDealt`       Integer        Optional metric
  `survivalSeconds`   Integer        Duration alive
  `createdAt`         Timestamp      Record creation

Add a unique constraint on `(matchId, userId)` so a user cannot be
recorded twice in one match.

## 4. Relationships and constraints

-   `PlayerProfile.userId` references `User.id` and is unique.
-   `PlayerProfile.username` is unique.
-   `MatchParticipant.matchId` references `Match.id`.
-   `MatchParticipant.userId` references `User.id`.
-   `(MatchParticipant.matchId, MatchParticipant.userId)` is unique.
-   `Match.winnerUserId` references `User.id` when a winner exists.
-   Use foreign keys and appropriate deletion behavior.
-   Prefer restrictive deletion for historical match records; account
    deletion policy must be designed deliberately.

## 5. Indexes

Likely indexes: - Unique index on normalized user email. - Unique index
on username. - Index on `MatchParticipant.userId`. - Index on
`MatchParticipant.matchId`. - Index on `Match.endedAt`. - Composite
index for leaderboard query patterns after those patterns are known.

Do not add every conceivable index. Indexes improve reads but add write
and storage cost. Validate with real query plans.

## 6. Live game state vs durable records

### In-memory match state

-   Player positions and velocities.
-   Current health.
-   Equipped weapon and ammunition.
-   Active projectiles.
-   Loot availability.
-   Current safe-zone phase.
-   Input queues.
-   Current match tick.

### PostgreSQL

-   User identity and password hash.
-   Profile and public statistics.
-   Completed match summary.
-   Per-player match result.

At match completion, write the match and participant results using a
database transaction. Make result persistence idempotent so a retry
cannot create duplicate participant results or increment statistics
twice.

## 7. Result persistence transaction

Conceptual sequence:

1.  Confirm match is in a terminal state.
2.  Build immutable result data from authoritative match state.
3.  Start database transaction.
4.  Insert or upsert the match result using a unique match identifier.
5.  Insert participant results with unique `(matchId, userId)`
    constraint.
6.  Update aggregate player statistics exactly once.
7.  Commit transaction.
8.  Mark persistence complete.

If persistence fails, retry safely. Do not rerun statistic increments
without an idempotency guard.

## 8. Prisma conventions

-   Keep the Prisma schema under `backend/prisma/schema.prisma`.
-   Use migrations for schema changes.
-   Commit migration files.
-   Do not edit production database schema manually.
-   Generate the Prisma client after schema changes.
-   Keep Prisma queries in repositories/models or a clearly defined
    data-access layer.
-   Avoid passing Prisma model objects directly to public API responses;
    map them to explicit response shapes.

## 9. Data privacy and security

-   Never expose password hashes.
-   Avoid storing unnecessary personal data.
-   Validate and normalize user-provided fields.
-   Use parameterized ORM queries.
-   Keep database credentials in environment variables.
-   Restrict database network access in deployment.
-   Define retention/deletion behavior before production launch.

## 10. Future data needs

Possible later tables: - Party - PartyMember - FriendRelationship -
Season - RankedRating - MatchEvent / replay metadata - Ban / moderation
records

Do not create these tables until a real feature requires them.