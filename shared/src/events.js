export const CLIENT_EVENTS = Object.freeze({
  PLAYER_INPUT: 'player:input',
});

export const SERVER_EVENTS = Object.freeze({
  WELCOME: 'match:welcome',
  SNAPSHOT: 'match:snapshot',
  LOOT_STATE: 'match:loot', // full loot list, sent only when it changes
});