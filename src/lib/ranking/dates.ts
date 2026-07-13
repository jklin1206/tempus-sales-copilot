/**
 * Date display.
 *
 * There is no date arithmetic left in the product. Urgency buckets and days-away math
 * existed only to drive a daily queue, and that queue is gone: the snapshot data has no
 * contacted, completed, or snoozed state, so a queue that claims to change day to day
 * would be theatre.
 */

/** Formats an ISO date for display, e.g. "Fri, Jul 17". UTC so it reads the same everywhere. */
export function formatDate(isoDate: string): string {
  return new Date(`${isoDate}T00:00:00Z`).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}
