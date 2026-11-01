// The session token of this tab and the 401 signal. Everything that must know "is this still the
// session I started with?" goes through here, so a late callback of a previous identity is ignored.
const TOKEN_KEY = "obraflow.accessToken";
const UNAUTHORIZED_EVENT = "obraflow:unauthorized";

export const getToken = () => sessionStorage.getItem(TOKEN_KEY);
export const setToken = (token: string) => sessionStorage.setItem(TOKEN_KEY, token);
export const clearToken = () => sessionStorage.removeItem(TOKEN_KEY);
/** True while `token` (captured earlier) is still the token of this tab. */
export const isCurrentToken = (token: string | null) => token === getToken();

/** Request layer: the server rejected `token`. Only AuthContext reacts and ends the session. */
export function reportUnauthorized(token: string | null) {
  window.dispatchEvent(new CustomEvent(UNAUTHORIZED_EVENT, { detail: token }));
}
export function onUnauthorized(handler: () => void) {
  window.addEventListener(UNAUTHORIZED_EVENT, handler);
  return () => window.removeEventListener(UNAUTHORIZED_EVENT, handler);
}
