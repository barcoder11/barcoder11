import "server-only";
import type { PostgrestError } from "@supabase/supabase-js";
import { log } from "@/lib/log";

// Generic over the whole response (not just `data`) so TypeScript infers the
// row type correctly even when the query is awaited inline in the call.
type ListResponse = { data: unknown[] | null; error: PostgrestError | null };
type RowResponse = { data: unknown; error: PostgrestError | null };

class DataError extends Error {
  constructor(
    context: string,
    readonly code?: string,
  ) {
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
export function many<R extends ListResponse>(result: R, context: string): NonNullable<R["data"]> {
  if (result.error) fail(context, result.error);
  return (result.data ?? []) as NonNullable<R["data"]>;
}

/** Unwraps a single-row query (maybeSingle): null when not found, throws on errors. */
export function one<R extends RowResponse>(result: R, context: string): NonNullable<R["data"]> | null {
  if (result.error) fail(context, result.error);
  return (result.data ?? null) as NonNullable<R["data"]> | null;
}
