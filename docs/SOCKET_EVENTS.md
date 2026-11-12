# DROPZONE --- Socket.IO Event Contract

**Status:** Proposed event contract. Event names and payloads must be
kept synchronized with the implementation.

Socket.IO carries real-time game input, match lifecycle notifications,
and state updates. It is not the same thing as a raw WebSocket API; use
Socket.IO client and server libraries.

## 1. Connection

The browser connects to the backend Socket.IO endpoint over HTTPS/WSS in
production.

Authentication should be supplied using the Socket.IO authentication
handshake, for example:

``` javascript
const socket = io(API_URL, {
  auth: {
    token: accessToken
  }
});
```

The server verifies the token during connection and associates a trusted
user/player identity with the socket. Do not accept a user ID from an
arbitrary event payload as identity.

## 2. Naming conventions

-   Client-to-server events express an intention or command.
-   Server-to-client events report accepted outcomes or state.
-   Prefix events by domain, such as `player:`, `match:`, and `game:`.
-   Use acknowledgements for commands where the client needs an
    immediate accepted/rejected result.
-   Include schema validation for every external payload.

## 3. Connection lifecycle

  -----------------------------------------------------------------------
  Direction               Event                   Purpose
  ----------------------- ----------------------- -----------------------
  Client → Server         Socket connection       Authenticate connection
                          handshake               

  Server → Client         `connection:ready`      Confirm
                                                  identity/session

  Server → Client         `connection:error`      Report safe
                                                  connection-level
                                                  failure

  Server → Client         `player:presence`       Notify relevant clients
                                                  of presence changes

  Server → Client         `player:disconnected`   Notify match
                                                  participants

  Server → Client         `player:reconnected`    Notify match
                                                  participants
  -----------------------------------------------------------------------

Socket.IO's built-in `connect` and `disconnect` events are also used by
the client/server libraries.

## 4. Matchmaking and lobby events

  -------------------------------------------------------------------------
  Direction               Event                     Purpose
  ----------------------- ------------------------- -----------------------
  Client → Server         `matchmaking:join`        Optional socket-based
                                                    queue request if this
                                                    path is chosen

  Client → Server         `matchmaking:cancel`      Cancel pending queue

  Server → Client         `matchmaking:queued`      Confirm queue entry

  Server → Client         `matchmaking:cancelled`   Confirm cancellation

  Server → Client         `matchmaking:found`       Notify client of match
                                                    assignment

  Server → Client         `match:countdown`         Countdown has started

  Server → Client         `match:started`           Match is active
  -------------------------------------------------------------------------

**Contract decision:** The project may use REST for queue join/cancel
and Socket.IO only for queue notifications. Avoid implementing two
competing queue command paths. Pick one approach during the matchmaking
milestone and update this document.

## 5. Player input

### Client → Server: `player:input`

Example:

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

The sequence number is monotonically increasing for a client
session/input stream. The server validates shape, rate, membership, and
match state.

The server must not accept client-supplied authoritative position,
velocity, health, damage, weapon ownership, or kill count.

### Server → Client: `game:snapshot`

Example conceptual payload:

``` json
{
  "matchId": "match-id",
  "tick": 1204,
  "serverTime": 1794480000000,
  "players": [
    {
      "id": "player-id",
      "x": 240,
      "y": 180,
      "angle": 1.25,
      "health": 80,
      "alive": true
    }
  ]
}
```

The real schema should be compact and should expose only information the
recipient is allowed to know. Do not send private inventory or hidden
state to all clients unless game design intentionally makes it public.

## 6. Combat events

  -----------------------------------------------------------------------
  Direction               Event                   Payload intent
  ----------------------- ----------------------- -----------------------
  Client → Server         `combat:fire` or fire   Request to fire
                          state in `player:input` 

  Client → Server         `combat:reload`         Request reload

  Server → Client         `combat:shot`           Accepted shot
                                                  visual/event

  Server → Client         `combat:hit`            Authoritative hit
                                                  result where visible

  Server → Client         `player:damaged`        Visible health/damage
                                                  update

  Server → Client         `player:eliminated`     Elimination
                                                  notification
  -----------------------------------------------------------------------

Avoid sending both a fire command and a fire flag in the input message
unless their responsibilities are clearly distinct. Prefer one canonical
input contract.

## 7. Loot events

  -----------------------------------------------------------------------
  Direction               Event                   Purpose
  ----------------------- ----------------------- -----------------------
  Client → Server         `loot:pickup`           Request pickup of item
                                                  ID

  Server → Client         `loot:spawned`          New visible loot

  Server → Client         `loot:removed`          Item no longer
                                                  available

  Server → Client         `loot:pickup-result`    Accepted/rejected
                                                  pickup

  Server → Client         `inventory:updated`     Authoritative inventory
                                                  update
  -----------------------------------------------------------------------

Example pickup request:

``` json
{
  "itemId": "loot-item-id"
}
```

The server checks that the item exists, is available, is within pickup
distance, and the player is eligible to collect it.

## 8. Safe-zone events

  Direction         Event            Purpose
  ----------------- ---------------- ------------------------------
  Server → Client   `zone:updated`   Current center/radius/phase
  Server → Client   `zone:warning`   Upcoming zone transition
  Server → Client   `zone:damage`    Player is taking zone damage

The client displays the zone but does not calculate authoritative
damage.

## 9. Match result events

  -----------------------------------------------------------------------
  Direction               Event                   Purpose
  ----------------------- ----------------------- -----------------------
  Server → Client         `match:finished`        Match ended and result
                                                  summary is available

  Server → Client         `match:cancelled`       Match was cancelled

  Client → Server         `match:leave`           Request to leave/return
                                                  to lobby, subject to
                                                  policy
  -----------------------------------------------------------------------

The server decides the winner and placement. A client cannot submit a
winner result.

## 10. Acknowledgements and errors

Commands may use Socket.IO acknowledgements:

``` javascript
socket.emit("loot:pickup", { itemId }, (response) => {
  if (!response?.ok) {
    // Display a safe rejection message.
  }
});
```

Suggested acknowledgement shape:

``` json
{
  "ok": true,
  "data": {
    "itemId": "loot-item-id"
  }
}
```

Error:

``` json
{
  "ok": false,
  "error": {
    "code": "OUT_OF_RANGE",
    "message": "The item is too far away"
  }
}
```

Use stable error codes. Avoid exposing stack traces or internal
implementation details.

## 11. Rooms and delivery

Use one Socket.IO room per match, such as `match:<matchId>`, for
match-scoped broadcasts.

Only join a socket to a match room after the server confirms that the
authenticated player is a participant.

Do not broadcast private or match-specific data to all connected
sockets.

## 12. Disconnect and reconnect

On disconnect: - Mark the connection as disconnected, not automatically
eliminated. - Preserve match state for a configured grace period. -
Decide whether the player becomes idle/AI-controlled or remains
vulnerable. - Avoid duplicate player entities.

On reconnect: - Re-authenticate. - Verify the player still belongs to
the active match. - Re-associate the new socket. - Send an authoritative
state snapshot. - Resume input only after synchronization.

## 13. Rate limits and validation

-   Limit input event frequency.
-   Bound payload size.
-   Reject malformed values and non-finite numbers.
-   Reject events from players outside the match.
-   Reject gameplay actions after elimination or match completion.
-   Enforce fire cooldown and movement rules server-side.
-   Track invalid-event rates for abuse diagnostics.

## 14. Event versioning

The initial project may use a single event contract version. If breaking
changes are introduced later, version the protocol deliberately rather
than silently changing payload meanings. Keep shared event constants and
schemas synchronized between client and server.