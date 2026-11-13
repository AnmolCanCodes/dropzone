import { MATCH_STATE } from '@dropzone/shared/constants';

const { WAITING, COUNTDOWN, ACTIVE, FINISHED, CANCELLED } = MATCH_STATE;

const ALLOWED_TRANSITIONS = Object.freeze({
  [WAITING]: [COUNTDOWN],
  [COUNTDOWN]: [ACTIVE, WAITING],
  [ACTIVE]: [FINISHED, CANCELLED],
  [FINISHED]: [WAITING],
  [CANCELLED]: [WAITING],
});

export function canTransition(from, to) {
  return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false;
}