# Durable battle implementation

The chapter-scoped match GET and vote POST use Firestore when durable mode is
enabled. Match documents live under the event's private `battles` collection and
contain chapter identity, the creator UID captured when the draft is first saved,
an explicit panel and a `BattleMatch` record. Ballots
live beneath the match and are keyed by the authenticated judge UID.

Every read requires current chapter membership and event authority. Ordinary
judges must also belong to the match panel. Voting requires a judge or head
judge role, current event assignment and explicit panel membership. A director
can inspect a match but cannot cast a ballot through director authority.

A ballot transaction reads current authority, the match and any existing ballot.
An identical retry returns its original response; a different corner conflicts.
This check occurs before the closed-voting gate so a lost acknowledgement can be
recovered after another judge closes the match. New ballots require active/live
state and no recorded winner. The transaction writes the updated match, ballot
receipt and redacted audit together. The existing synthetic 3/5-person majority
behavior is retained; it is not a newly approved competition policy.
When a panel ballot reaches the currently configured closure condition, the same
transaction notifies the saved draft creator with the stored match outcome. The
notice is idempotent per match and does not authorize or imply bracket progression.
The transaction sends it only while the saved creator has an active, unexpired
chapter membership. Legacy records without a saved creator, or creators whose
membership has been revoked or expired, continue to close without a notice.

This is private state. It does not publish votes or results to arena viewers.
Unscoped legacy battle routes remain outside the durable migration. Bracket
progression, byes, withdrawals, corrections and a separate public projection
remain unfinished. Current API fixtures create synthetic matches directly.

The browser battle desk, judge vote page and director draft workspace use the
chapter API with current workspace identity. In particular, a closed match
does not prove that the current judge cast the winning vote; the UI must keep
personal ballot acknowledgement separate from the match outcome.

The chapter list now reads durable match records, validates their scope/panels,
filters ordinary judges to assigned panels and sorts by match reference. Cursor
pagination supports larger events, with at most 100 records per request. Current
event authority is rechecked for reads.
Browser battle desk and vote pages now call chapter-scoped paths derived from
the current workspace session. A closed match does not set a personal ballot
acknowledgement or replace the judge's selected corner with the match winner.


## Match draft configuration

An event chapter director can POST to the chapter-scoped match resource to save
a draft with expected revision, category, round, corner names and a unique panel
of three or five current active chapter judges assigned to that event. Each panel
member's membership and assignment are read during the transaction. A new draft
starts at revision one with zero votes. Edits use optimistic revision checks and
are rejected once voting has started or any vote is recorded. Exact operation
retries recover the prior match response; changed inputs conflict. Writes, receipts
and audit are atomic. Draft records are not visible to ordinary judges; head
judges/directors can inspect them. Draft activation is supported as described
below. Starting a round, advancing a winner, seeding a bracket and handling a
bye/withdrawal remain unavailable until their rules are approved.


The chapter director workspace at /admin/{chapter}/events/{event}/battles
creates a draft by match reference and lists existing matches. It collects the
category, round, two corner names and 3/5 judge references; current role and event
assignment are enforced by the API. The list is cursor-paginated. A director can
read configuration to recover the panel and revision, edit a draft with an
expected revision, and activate it. Activation does not create a bracket or
advance a winner.


A chapter director can activate a draft through POST /battles/{id}/activate
with operation_id and expected_revision. The transaction verifies the current
draft revision/state and rechecks every panel judge's active chapter membership
and active event assignment before marking the match active. The state, receipt
and audit commit atomically; retries with the same command recover the original
response. Stale revisions and already-started matches conflict. Match activation
only opens the configured ballot; it does not seed or advance a bracket.


The director screen fetches configuration after save and when a saved draft is
loaded. It only offers activation after it has the current revision. A stale
revision conflicts and must be reloaded before a new edit or activation.


Battle summaries now use the shared cursor-based Firestore page reader, capped at
100 records per request. The endpoint rechecks event authority and validates each
returned document before exposing a match; judge pages remain restricted to panel
members. Empty pages still return their cursor so callers can continue through
non-panel records without skipping the rest of the event. The chapter battle desk
loads additional pages and retains records already shown.



The judge vote screen validates match identity, status and tally shape before
displaying a ballot acknowledgement. If a response is uncertain, it retains the
selected corner in the mounted form for an exact retry; a definitive denial
requires a match refresh. After reload, a judge-scoped ballot read checks current event and panel authority
and returns only that judge’s saved corner. The screen waits for it before
offering voting; a closed match alone does not prove the judge voted.


The judge battle desk now loads continuation pages, including after a filtered
empty page. Counts and round filters cover loaded matches only; refresh is manual.
The page validates each match and binds requests and rendered state to the
current account, chapter and event. No bracket progression is implied.
