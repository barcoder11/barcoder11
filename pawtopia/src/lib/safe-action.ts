import { unstable_rethrow } from "next/navigation";

export const OFFLINE_MESSAGE = "We couldn't reach Pawtopia. Check your connection and try again.";

/**
 * Wraps a server action used with useActionState so that a network failure
 * becomes a friendly error state instead of crashing to the error page.
 * Redirects/not-found raised by the action are re-thrown so Next.js can
 * navigate as usual.
 */
export function guardAction<S, P>(action: (prev: S, payload: P) => Promise<S>, offline: (prev: S) => S) {
  return async (prev: S, payload: P): Promise<S> => {
    try {
      return await action(prev, payload);
    } catch (error) {
      unstable_rethrow(error);
      return offline(prev);
    }
  };
}

/** Calls a server action directly; resolves to `null` on network failure (navigation errors re-thrown). */
export async function tryAction<T>(call: () => Promise<T>): Promise<T | null> {
  try {
    return await call();
  } catch (error) {
    unstable_rethrow(error);
    return null;
  }
}
