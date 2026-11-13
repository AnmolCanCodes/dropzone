import { GAME_CONFIG } from '@dropzone/shared/constants';

export const WORLD_WIDTH = GAME_CONFIG.WORLD_WIDTH;
export const WORLD_HEIGHT = GAME_CONFIG.WORLD_HEIGHT;
export const PLAYER_RADIUS = GAME_CONFIG.PLAYER_RADIUS;

// Render this far in the past so there are always two snapshots to blend between.
// 100ms = 2 ticks at 20 Hz.
export const INTERPOLATION_DELAY_MS = 100;