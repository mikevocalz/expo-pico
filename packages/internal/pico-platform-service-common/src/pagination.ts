/**
 * Standard pagination shape for all paginated methods in the expo-pico family.
 *
 * Rules (applied across leaderboards, social, rooms):
 * - `items` is always T[] — never null or undefined
 * - `nextPageToken` is null when there are no further pages
 * - `totalCount` is the server-side total, not items.length
 * - Pass `nextPageToken` as `pageToken` argument in the next call to get the next page
 */
export interface PicoPage<T> {
  items: T[];
  nextPageToken: string | null;
  totalCount: number;
}

/**
 * Standard arguments for paginated calls. All paginated methods in the family
 * must accept (pageSize?: number, pageToken?: string | null).
 */
export interface PicoPageArgs {
  pageSize?: number;
  pageToken?: string | null;
}

/** Default page size used when caller does not specify. */
export const DEFAULT_PAGE_SIZE = 20;
