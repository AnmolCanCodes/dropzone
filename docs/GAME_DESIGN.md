# DROPZONE --- Game Design

**Status:** Initial gameplay specification. Values are starting
balance/configuration proposals and should be tuned through playtesting.

## 1. Game concept

DROPZONE is a 2D top-down solo battle royale for browser play. Players
spawn on a compact island, collect equipment, fight opponents, and move
toward a shrinking safe zone. The final living player wins.

The initial project prioritizes a complete match loop over a large
amount of content.

## 2. Initial match configuration

  Setting                             Initial target
  ----------------- --------------------------------
  Mode                                          Solo
  Players                        10--20 configurable
  Match length           Approximately 5--10 minutes
  View                                   2D top-down
  Map                             One compact island
  Simulation rate     20 ticks/second initial target
  Win condition                 One survivor remains
  Respawn               Disabled during active match

These are development targets, not measured capacity or final balance
guarantees.

## 3. Match phases

### Lobby

Players join a queue or lobby. The server tracks readiness and
availability. The match starts only when the configured minimum player
count and other start conditions are satisfied.

### Countdown

The server locks the participant roster, allocates a match ID, creates
match state, assigns spawn locations, and sends a countdown event.

### Active

Players move, loot, fight, take zone damage, and may be eliminated. The
server simulates all authoritative state.

### Finished

The server determines the winner, freezes the match, records results,
and notifies participants.

### Cancelled

A match may be cancelled if it cannot start or an administrative/system
condition prevents a valid match.

## 4. Map and world

The first map should be deliberately small and readable.

World elements: - Walkable ground. - Static obstacles such as walls,
rocks, and buildings. - Loot spawn locations. - Safe-zone center and
radius. - World boundary.

Represent the initial map using a simple tilemap or data-driven layout.
Keep collision geometry separate from decorative art where practical.

Map design goals: - Several routes between areas. - Cover that creates
tactical choices. - Open areas where the shrinking zone creates
pressure. - Loot locations distributed so players do not all spawn on
one item. - No inaccessible spawn points.

## 5. Player model

A player has at least: - Stable player ID. - Match ID. - Position and
velocity. - Facing/aim direction. - Health. - Alive/eliminated status. -
Current weapon. - Ammunition state. - Inventory. - Last processed input
sequence.

The server owns these values. The client holds a presentation copy for
rendering.

### Movement

Initial controls: - W: up. - A: left. - S: down. - D: right. - Mouse:
aim. - Left click: fire. - E: pickup.

Movement should be normalized diagonally so diagonal movement is not
faster than straight movement. The server enforces movement speed, world
boundaries, and obstacle collisions.

## 6. Weapons

Start with a small set of distinct weapons.

  Weapon    Intended role     Design variables
  --------- ----------------- --------------------------------------
  Pistol    Basic fallback    Damage, cooldown, range, magazine
  Rifle     General-purpose   Damage, fire rate, spread, range
  Shotgun   Close range       Pellet count, spread, damage, reload

Exact values belong in configuration and should be adjusted through
testing.

Weapon rules: - Server validates the equipped weapon. - Server controls
ammunition and cooldown. - Client cannot report its own damage. - Firing
while eliminated or outside an active match is rejected. - Reloading
follows server-side timing and ammunition rules.

For the first implementation, choose either simple server-calculated
hitscan or server-simulated projectiles. Do not implement both until the
first one works. Projectile simulation is more visually expressive;
hitscan is simpler.

## 7. Health and damage

A player begins with configured health. Damage may come from weapon hits
and safe-zone exposure.

The server calculates: - Whether the target is valid. - Whether the
attack is allowed. - Whether the hit is valid. - Damage amount. -
Remaining health. - Elimination state.

A player is eliminated when health reaches zero. Elimination is a
one-way state transition during a match.

## 8. Loot and inventory

Initial loot: - Pistol. - Rifle. - Shotgun. - Ammunition. - Health item.

Loot rules: - Loot has a server-owned ID and position. - Pickup requests
identify an item, not a claimed inventory result. - The server checks
distance, availability, player status, and inventory capacity. - An item
can be picked up only once. - The server broadcasts the result to match
participants.

## 9. Safe zone

The safe zone is a circle defined by center and radius.

A match has configured zone phases. Each phase may define: - Delay
before shrinking. - Target center. - Target radius. - Shrink duration. -
Damage outside the zone.

The server calculates whether a player is outside the current safe area
and applies damage on the configured schedule.

The client displays the zone, warning state, and countdown, but the
server owns the actual zone values and damage.

## 10. Combat and collision

Initial collision needs: - Player versus map obstacles. - Player versus
world boundary. - Projectile versus obstacle. - Projectile versus
player. - Player versus loot pickup radius.

Keep collision calculations in the backend game domain. Start with
simple shapes such as circles and axis-aligned rectangles. More advanced
collision algorithms are unnecessary until profiling or gameplay
requires them.

## 11. Match result

A match finishes when: - One active player remains; or - A defined
timeout/tie policy is reached.

The initial tie policy should be explicit. For example, if a match timer
expires, compare remaining health, then another deterministic
tie-breaker. Do not leave this undefined in implementation.

The result should include: - Match ID. - Winner player ID, if any. -
Participant placement. - Eliminations. - Survival duration. - Match end
reason. - Completion timestamp.

## 12. User interface

### Application UI (React)

-   Landing/login/register.
-   Main menu.
-   Matchmaking/lobby.
-   Profile.
-   Match history.
-   Settings.

### Game UI (Phaser or game overlay)

-   Health.
-   Current weapon and ammunition.
-   Safe-zone status.
-   Remaining players.
-   Kill count.
-   Loot interaction prompt.
-   Match countdown/results.

Keep the Phaser canvas responsible for the game world. React should not
rerender the entire game world on every network snapshot.

## 13. Fairness and abuse prevention

-   Server owns player position and health.
-   Validate input frequency and payload size.
-   Enforce weapon cooldowns and ammunition.
-   Validate pickup range.
-   Prevent actions after elimination.
-   Reject actions from players not in the match.
-   Do not accept client-reported kills or winner status.

This is a baseline, not a complete anti-cheat system.

## 14. Future features (not MVP)

-   Duo and squad modes.
-   More maps and weapons.
-   Spectator mode.
-   Friends and parties.
-   Ranked seasons.
-   Replays.
-   Mobile controls.
-   Audio and visual polish.
-   3D version.

Only add these after the solo match loop is reliable.