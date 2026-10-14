import { InjectionToken } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { SecureStorage } from '@aparajita/capacitor-secure-storage';

export const REFRESH_TOKEN_KEY = 'pokecrud.refresh';

/** Dónde vive el refresh token. El access token NO se guarda nunca: vive solo en memoria (D-006). */
export interface TokenStore {
  get(): Promise<string | null>;
  set(token: string): Promise<void>;
  clear(): Promise<void>;
}

/** App nativa: Keystore de Android vía @aparajita/capacitor-secure-storage. */
export class NativeTokenStore implements TokenStore {
  get(): Promise<string | null> {
    return SecureStorage.getItem(REFRESH_TOKEN_KEY);
  }
  set(token: string): Promise<void> {
    return SecureStorage.setItem(REFRESH_TOKEN_KEY, token);
  }
  clear(): Promise<void> {
    return SecureStorage.removeItem(REFRESH_TOKEN_KEY);
  }
}

/**
 * Navegador: sessionStorage (se borra al cerrar la pestaña). Nunca localStorage: sobrevive para siempre
 * y cualquier XSS lo leería. Si el almacenamiento está bloqueado, se comporta como vacío.
 */
export class WebTokenStore implements TokenStore {
  async get(): Promise<string | null> {
    try {
      return sessionStorage.getItem(REFRESH_TOKEN_KEY);
    } catch (err) {
      console.warn('[auth] sessionStorage no disponible', err);
      return null;
    }
  }
  async set(token: string): Promise<void> {
    try {
      sessionStorage.setItem(REFRESH_TOKEN_KEY, token);
    } catch (err) {
      console.warn('[auth] no se pudo guardar la sesión', err);
    }
  }
  async clear(): Promise<void> {
    try {
      sessionStorage.removeItem(REFRESH_TOKEN_KEY);
    } catch {
      /* nada que borrar */
    }
  }
}

export const TOKEN_STORE = new InjectionToken<TokenStore>('TOKEN_STORE', {
  providedIn: 'root',
  factory: () => (Capacitor.isNativePlatform() ? new NativeTokenStore() : new WebTokenStore()),
});
