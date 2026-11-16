export const TOKEN_KEY = 'dropzone_token';

export function getStoredSessionToken() {
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setStoredSessionToken(token) {
  if (!token) {
    window.localStorage.removeItem(TOKEN_KEY);
    return;
  }

  window.localStorage.setItem(TOKEN_KEY, token);
}

export function clearStoredSession() {
  window.localStorage.removeItem(TOKEN_KEY);
}
