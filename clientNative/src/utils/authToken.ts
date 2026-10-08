const TOKEN_KEY = 'moviy.authToken';
const TOKEN_BACKUP_KEY = 'moviy.authTokenBackup';
const PROFILE_KEY = 'moviy.authProfile';

let memoryToken: string | null = null;

export function getAuthTokenKey() {
  return TOKEN_KEY;
}

export function getAuthTokenBackupKey() {
  return TOKEN_BACKUP_KEY;
}

export function getAuthProfileKey() {
  return PROFILE_KEY;
}

export function getAuthTokenSync() {
  return memoryToken;
}

export function setAuthTokenSync(token: string | null) {
  memoryToken = token;
}
