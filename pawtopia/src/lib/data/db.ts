import "server-only";
import type { PostgrestError } from "@supabase/supabase-js";
import { log } from "@/lib/log";

type Result = { data: unknown; error: PostgrestError | null };
type Row = Record<string, unknown>;

export class DataError extends Error {
  constructor(context: string, readonly code?: string) {
    super(`Data request failed: ${context}`);
    this.name = "DataError";
  }
}

function fail(context: string, error: PostgrestError): never {
  log.error("database request failed", { context, code: error.code });
  throw new DataError(context, error.code);
}

/**
 * Unwraps a list query. Missing rows are an empty list; real errors throw so
 * the page shows the error state instead of a misleading empty state.
 */
export function many<T = Row>(result: Result, context: string): T[] {
  if (result.error) fail(context, result.error);
  return (result.data ?? []) as T[];
}

/** Unwraps a single-row query (maybeSingle): null when not found, throws on errors. */
export function one<T = Row>(result: Result, context: string): T | null {
  if (result.error) fail(context, result.error);
  return (result.data ?? null) as T | null;
}
