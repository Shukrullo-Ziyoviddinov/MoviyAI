const TOKEN_KEY = 'moviy.authToken';

let memoryToken: string | null = null;

export function getAuthTokenKey() {
  return TOKEN_KEY;
}

export function getAuthTokenSync() {
  return memoryToken;
}

export function setAuthTokenSync(token: string | null) {
  memoryToken = token;
}
