# Movie listing

- `GET /api/movie-listing/home`: nonempty ordinary sections in Home order, each with `categoryName`, `movies` (at most 7), and `hasMore`.
- `GET /api/movie-listing/:categoryName?limit=12&cursor=...`: `{ items, nextCursor, hasMore }`. Limit defaults to 12, accepts integers 1–12. Invalid parameters return 400.
- Responses use the existing `{ ok: true, data: ... }` envelope. Existing `/api/movies` and popularity services remain unchanged. Web, Telegram Web App and native Home use section previews; `/recommendations/:categoryName` loads cursor pages from the beginning.
- Cards include only ID, category, localized title, poster, both ratings, and original title fallback. No actor arrays, descriptions, watch links, or internal research.
- Ascending unique numeric `id` preserves existing Home ordering; keyset pagination uses `id > lastId`. Cursor v1 is bound to its section, not page size. Fetching one extra row determines `hasMore` without a separate count.
- Eight named sections match current clients. `otherMovies` contains all remaining category values, including null, matching the existing fallback group. Top 10 keys are not valid sections.
- Named sections use the `{ categoryName: 1, id: 1 }` compound index declared on Movie. The mixed fallback can use the existing `id` index for ordering; its category exclusion may scan more rows than named sections. Index creation follows existing Mongoose deployment settings; no index is dropped.
- Pagination is not a frozen snapshot: category changes can move films between sections; new IDs can appear on later pages. Clients must deduplicate by ID and stop when `hasMore` is false.
- Loaded pages and scroll position are kept in client memory for detail-page return navigation. Scrolling into unloaded pages sends a fresh server request; returning to already loaded cards reuses them. Cached pages are not live database subscriptions.
- Web listing requests have a 15-second deadline and navigation cancellation; native uses the existing Axios 15-second timeout and cancellation signal. Errors retain loaded cards and allow explicit retry.
