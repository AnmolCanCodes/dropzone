# DROPZONE --- Development Guide

This guide explains how to set up, run, test, and contribute to DROPZONE
locally.

**Status:** Setup instructions are a target workflow. Commands may be
adjusted as workspace scripts and infrastructure are implemented.

## 1. Prerequisites

-   Linux, macOS, or Windows with WSL2.
-   Git.
-   Node.js LTS.
-   npm.
-   PostgreSQL (required when persistence is implemented).
-   Docker and Docker Compose (optional for local infrastructure).
-   Browser and editor.
-   API client such as curl or Postman.

Use the Node version pinned in `.nvmrc` once that file is added. On
Linux/macOS with NVM:

``` bash
nvm install
nvm use
node --version
npm --version
```

Do not assume a globally installed Node version matches the project.

## 2. Repository setup

``` bash
git clone <repository-url>
cd dropzone
```

The repository will use npm workspaces for backend and frontend. Once
the root `package.json` defines those workspaces:

``` bash
npm install
```

For the earliest initialization milestone, before workspaces exist,
install dependencies from `backend/` and `frontend/` individually.

## 3. Environment variables

Copy the example file:

``` bash
cp .env.example .env
```

Use local-only secrets. Never commit `.env`.

The backend should validate configuration at startup. Keep
`.env.example` updated whenever a new required variable is introduced.

## 4. Local PostgreSQL

PostgreSQL is needed when authentication/profile persistence is
implemented.

You can install it locally or run it with Docker Compose. Configure
`DATABASE_URL` in the backend environment.

After Prisma is configured:

``` bash
npx prisma migrate dev
npx prisma generate
```

Run Prisma commands from the backend workspace or use the root scripts
defined by the project.

Redis is not required for the initial local game and Express milestones.

## 5. Install and run

Once npm workspaces and scripts are configured:

``` bash
npm install
npm run dev --workspace=backend
npm run dev --workspace=frontend
```

Run each development command in a separate terminal.

The proposed local addresses are: - Frontend: `http://localhost:5173` -
Backend: `http://localhost:4000` - Health:
`http://localhost:4000/health`

The actual ports are controlled by environment configuration.

## 6. Suggested backend scripts

The backend package should eventually expose scripts similar to:

``` json
{
  "scripts": {
    "dev": "nodemon src/server.js",
    "start": "node src/server.js",
    "test": "vitest run",
    "test:watch": "vitest",
    "lint": "eslint ."
  }
}
```

Use the test runner selected by the project. Do not add scripts for
tools that are not installed.

## 7. Coding conventions

### JavaScript modules

Use ES Modules consistently:

``` javascript
import express from "express";

export function createExample() {
  return {};
}
```

Use explicit file extensions in relative ESM imports where required by
Node.js.

### Naming

-   Files: use a consistent convention, such as `room.controller.js`.
-   Variables/functions: `camelCase`.
-   Classes: `PascalCase`.
-   Constants: `UPPER_SNAKE_CASE` for true module-level constants.
-   Socket event names: namespaced strings such as `player:input`.

### Responsibilities

-   Routes declare endpoints.
-   Controllers handle HTTP.
-   Services implement use cases.
-   Repositories handle persistence.
-   Socket handlers validate/translate events.
-   Game systems implement deterministic game rules.
-   Phaser scenes render and collect client input.

Avoid giant files and avoid creating abstractions without a real use
case.

## 8. Testing

Run the relevant tests before committing.

### Unit tests

Test pure functions and game rules: - Movement normalization. - World
boundary constraints. - Weapon cooldown. - Damage calculations. -
Collision helpers. - Zone transitions. - Match lifecycle.

### Integration tests

Test: - HTTP status codes and response schemas. - Authentication. -
Database constraints. - Socket authentication and event behavior. -
Match membership and invalid actions.

Tests should not depend on a developer's production account or external
production services.

## 9. Manual multiplayer testing

For early multiplayer milestones:

1.  Start the backend.
2.  Start the frontend.
3.  Open two separate browser windows or profiles.
4.  Connect both clients.
5.  Confirm each player receives a distinct server identity.
6.  Move one player and verify the other sees the update.
7.  Disconnect one client.
8.  Confirm the server handles the disconnect without corrupting match
    state.
9.  Reconnect and verify the documented reconnect behavior.

Do not rely only on one browser tab for multiplayer testing.

## 10. Git workflow

Use small feature branches where practical:

``` bash
git switch -c feat/player-movement
```

Commit focused changes:

``` bash
git add .
git commit -m "feat(game): add server-side player movement"
```

Suggested prefixes: - `feat`: new behavior. - `fix`: bug fix. - `test`:
tests. - `docs`: documentation. - `refactor`: behavior-preserving code
change. - `chore`: tooling/configuration.

Never commit: - `.env` - `node_modules/` - build output - local database
dumps - logs - access tokens or private keys

## 11. Debugging

Useful first steps: - Read the full error and stack trace. - Identify
whether the failure is in the browser, network, Express, socket handler,
game system, or database. - Reproduce with the smallest input. - Add
temporary structured logs. - Write a regression test after fixing the
issue.

For real-time bugs, log match ID, player ID, event name, input sequence,
and server tick where safe. Never log passwords or access tokens.

## 12. Before opening a pull request

-   [ ] Feature works locally.
-   [ ] Invalid input is handled.
-   [ ] Tests cover important behavior.
-   [ ] Lint passes.
-   [ ] No secrets are committed.
-   [ ] Documentation reflects the behavior.
-   [ ] No unrelated changes are included.
-   [ ] The change does not bypass server authority.

## 13. AI-assisted development rules

AI tools may help explain APIs, suggest tests, review architecture, and
diagnose errors. They should not silently generate the whole
application.

For each task: 1. Ask for one small implementation step. 2. Read every
generated file. 3. Explain the code back in your own words. 4. Run it
locally. 5. Test normal and invalid behavior. 6. Inspect the diff. 7.
Commit only after understanding the change.

The purpose of DROPZONE is both to build a game and to learn how a real
Node.js backend works.