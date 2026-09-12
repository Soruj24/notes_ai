/**
 * Edge-safe auth constants. This module must stay dependency-free
 * (no node: imports) so middleware can import it.
 */
export const SESSION_COOKIE = "notoai_session";

/** 30 days in milliseconds. */
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
