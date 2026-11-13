export const CLIENT_EVENTS = Object.freeze({
  PLAYER_INPUT: 'player:input',
});

export const SERVER_EVENTS = Object.freeze({
  WELCOME: 'match:welcome',   // to one socket on connect: { selfId }
  SNAPSHOT: 'match:snapshot', // to everyone every tick: { tick, players: [...] }
});