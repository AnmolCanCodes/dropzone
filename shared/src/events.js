export const CLIENT_EVENTS = Object.freeze({
  PLAYER_MOVE: 'player:move',
});

export const SERVER_EVENTS = Object.freeze({
  WORLD_STATE: 'world:state',     // sent to one socket on connect: self id + everyone
  PLAYER_JOINED: 'player:joined',
  PLAYER_LEFT: 'player:left',
  PLAYER_MOVED: 'player:moved',
});