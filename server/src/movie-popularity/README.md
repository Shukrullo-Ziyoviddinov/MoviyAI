# Most searched movies

Lifetime search counts, with no calendar-month reset. Only successful direct film
identifications count (text, image, video or imported URL), including catalogue
cache hits. Greetings, guesses, metadata-only follow-ups, recommendations, stopped
and failed operations do not count. Statistics start when this feature is deployed;
old conversations are not silently reclassified as search requests.

Identification intent comes from the executed search route, not presentation.
A newly identified film still counts when its answer contains details, cast or
a trailer. Asking only about a previously identified film does not add a search.

Completion and `popularityPending` are committed together. A separate worker
transfers each UI turn / Telegram update to `movie_search_events` using a unique
source-prefixed ID. Publishing a Telegram result to the UI creates no second event.
Cleanup preserves pending events before removing a conversation.
Individual transfer failures back off for a minute without blocking other users
or channels. Deletion still waits until its own pending events are preserved.

Unknown catalogue IDs wait for the existing catalogue workflow to save the film.
Resolution uses existing identity matching and no external AI/search calls. The
event resolution and increment of `movie_search_totals` share one transaction, so
replay, worker restart and multiple instances cannot count the same request twice.
Events and totals have no TTL. Losing an actor lookup or an R2 upload does not
reset counts. A new request by the same user counts again.

`GET /api/movies/top-searched` returns up to ten existing films, sorted by count
descending and numeric movie ID ascending for stable ties. Removed films are
skipped before the limit. Regular categories and stored movie categories are
unchanged. Clients show rank 1–10 and refresh the public ranking every 60 seconds
while active. No user identity or original prompts are stored in search events.
