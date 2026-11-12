# DROPZONE --- REST API Contract

**Base path:** `/api/v1`\
**Status:** Proposed contract. Endpoints are not implemented merely
because they are documented.

REST is for account, profile, queue-management, and historical
operations. High-frequency movement and combat input use Socket.IO; do
not send every game tick through REST.

## 1. Conventions

### Request format

-   JSON request bodies use `Content-Type: application/json`.
-   Query parameters are used for filtering and pagination.
-   Authenticated endpoints use a bearer access token.
-   All external input must be validated.

### Response format

Successful response example:

``` json
{
  "data": {
    "id": "resource-id"
  }
}
```

Error response example:

``` json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "The request payload is invalid",
    "details": []
  }
}
```

Do not expose stack traces, SQL details, secrets, or internal exception
messages in production responses.

### Status codes

  Status   Meaning
  -------- -----------------------------------------------------
  200      Request succeeded
  201      Resource created
  202      Request accepted for asynchronous processing
  204      Request succeeded with no response body
  400      Malformed or invalid request
  401      Missing or invalid authentication
  403      Authenticated but not permitted
  404      Resource not found
  409      Conflict with current resource state
  422      Semantically invalid input, if adopted consistently
  429      Rate limit exceeded
  500      Unexpected server error
  503      Required dependency unavailable

Choose one validation status convention (400 or 422) and use it
consistently.

## 2. Health

### `GET /health`

Liveness endpoint. It should indicate whether the process is alive.

Example:

``` json
{
  "status": "ok"
}
```

A separate readiness endpoint may check whether required dependencies
are available.

## 3. Authentication

### `POST /api/v1/auth/register`

Creates an account.

Request:

``` json
{
  "username": "player_one",
  "email": "player@example.com",
  "password": "a-strong-password"
}
```

Success: `201 Created`.

Rules: - Validate username/email format and uniqueness. - Enforce
password policy. - Hash the password using a suitable password hashing
algorithm. - Never return the password hash.

### `POST /api/v1/auth/login`

Request:

``` json
{
  "email": "player@example.com",
  "password": "a-strong-password"
}
```

Success:

``` json
{
  "data": {
    "accessToken": "<token>",
    "tokenType": "Bearer",
    "expiresIn": 900,
    "user": {
      "id": "user-id",
      "username": "player_one"
    }
  }
}
```

Token lifetime and refresh-token strategy must be configured and
documented. If refresh tokens are added, store/revoke them safely and
consider secure cookie handling for browser clients.

### `POST /api/v1/auth/logout`

If token revocation or refresh sessions are implemented, invalidate the
relevant session. A purely stateless short-lived access token cannot be
instantly revoked without additional server-side state.

## 4. Player profile

### `GET /api/v1/players/me`

Returns the authenticated player's profile and public statistics.

### `PATCH /api/v1/players/me`

Updates allowed profile fields, such as display name or avatar
selection.

Never allow the client to patch wins, kills, rank, or other
server-calculated statistics.

## 5. Matchmaking

### `POST /api/v1/matchmaking/queue`

Requests entry into the solo queue.

Success may return `202 Accepted`:

``` json
{
  "data": {
    "queueStatus": "queued",
    "ticketId": "queue-ticket-id"
  }
}
```

The actual match assignment is delivered through a real-time event.

### `DELETE /api/v1/matchmaking/queue`

Cancels the authenticated player's pending queue request.

Possible errors: - `409` if the player is already assigned to a match. -
`404` if no active queue ticket exists.

### `GET /api/v1/matchmaking/status`

Returns the current queue state for the authenticated player.

## 6. Match history

### `GET /api/v1/matches/history?page=1&limit=10`

Returns the authenticated player's completed match history.

Example:

``` json
{
  "data": {
    "items": [
      {
        "matchId": "match-id",
        "placement": 2,
        "kills": 3,
        "survivalSeconds": 285,
        "endedAt": "2026-11-12T12:00:00.000Z"
      }
    ],
    "page": 1,
    "limit": 10,
    "total": 1
  }
}
```

Validate pagination limits. Do not allow unbounded result sizes.

### `GET /api/v1/matches/:matchId`

Returns a match summary only if the authenticated player is allowed to
view it. Define public/private visibility rules before implementation.

## 7. Leaderboard

### `GET /api/v1/leaderboard?period=all-time&page=1&limit=20`

Returns public aggregate statistics.

The initial leaderboard may sort by wins. Define tie-breaking rules and
ensure the result is based on server-persisted data.

## 8. Authentication and authorization

-   Authentication middleware verifies the access token.
-   The authenticated user ID is attached to the request by trusted
    server code.
-   Never trust a user ID supplied in a request body to identify the
    caller.
-   Match-specific authorization checks membership and allowed match
    state.
-   Apply rate limits to registration, login, queue, and other
    abuse-prone routes.

## 9. Validation

Use Zod or an equivalent schema validator for: - Path parameters. -
Query parameters. - Request bodies. - Environment configuration. -
Socket payloads.

Reject unknown or malformed fields where appropriate. Set maximum string
lengths, numeric ranges, and payload sizes.

## 10. API implementation order

1.  `GET /health`
2.  Registration and login
3.  `GET /players/me`
4.  Matchmaking queue/cancel/status
5.  Match history
6.  Match summary
7.  Leaderboard

Keep `API.md` synchronized with the actual routes and response schemas.