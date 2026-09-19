# Support chat: real-time fix, subject capture, and theme redesign

Date: 2026-08-07

## Problem

1. **Not real-time.** New tickets and messages only appear on the superadmin side after a manual page refresh, even though the app already wires up Laravel Reverb, Echo, and private channels for chat.
2. **Tickets have no subject.** The superadmin ticket list/detail always shows "Objet non défini" because nothing in the ticket-creation flow ever sets one, even though the `conversations` table, model, and superadmin UI all support a `subject`.
3. **Inconsistent, generic visuals.** The tenant-side chat widget (ticket creation) uses raw Tailwind blue utility classes unrelated to the app's design system. The superadmin tickets page uses an unrelated beige/olive "Notion" palette, with a large `!important`-laden override block bolted onto the end of its stylesheet from a previous patch. Neither matches the app's actual brand tokens (`src/styles.css`: navy `--primary`, teal `--accent`, success/warning/danger, Manrope font, shared radius/shadow scale).

## Root cause analysis (real-time bug)

- `App\Events\MessageSent` and `App\Events\NewTicketCreated` both implement `ShouldBroadcast` (queued broadcasting, not `ShouldBroadcastNow`).
- `backend/.env`: `BROADCAST_CONNECTION=reverb`, `QUEUE_CONNECTION=database`, `REVERB_PORT=8080`.
- `backend/composer.json`'s `dev` script runs `php artisan serve`, `php artisan queue:listen`, `php artisan pail`, and `npm run dev` concurrently — the queue worker needed to process the broadcast job **is** running.
- However, nothing in local dev starts `php artisan reverb:start`. Confirmed via `netstat`: nothing listens on port 8080 locally, while `php artisan serve` correctly listens on 8000.
- Result: the broadcast job gets processed by the queue worker, but has no Reverb server to hand off to, so the frontend's Echo/Pusher-JS client (`src/app/services/realtime.service.ts`) never receives anything over its WebSocket connection. Data only ever reaches the browser via the plain HTTP `GET` calls that run on page load — i.e., a refresh.
- Production is unaffected: `docker/supervisor/supervisord.reverb.conf` runs `reverb:start --host=0.0.0.0 --port=8080` under supervisor there. The gap is specific to the local dev workflow.
- Channel/auth wiring itself (private channels, `routes/channels.php`, Echo authorizer posting to `/broadcasting/auth` with a bearer token) was reviewed and looks correct — this is not an auth or channel-naming bug.

## Fix: real-time

Add `php artisan reverb:start` as a fifth concurrent process in `backend/composer.json`'s `dev` script (same pattern already used in prod's supervisor config), so `composer run dev` boots API server, queue worker, logs, Reverb, and Vite together. No frontend or channel changes needed.

## Fix: ticket subject capture

- **Backend:** `ChatController::startConversation()` (`backend/app/Domains/Support/Controllers/ChatController.php`) accepts an optional `subject` string and persists it on the new `Conversation`.
- **Frontend:** the chat widget's ticket-creation entry point (`src/app/components/chat-widget/chat-widget.component.ts`) gains a short pre-chat step: a required "What can we help with?" subject input (max 120 characters, matching the column's practical limit) shown before the conversation is created, whose value is sent with the `startConversation()` call. Once a conversation exists, the widget proceeds straight to the chat view as it does today.
- This only affects *new* conversations; existing tickets with no subject keep showing "Objet non défini" as a fallback (already handled in the superadmin template).

## Visual redesign

Scope: `src/app/components/chat-widget/` (ticket creation, tenant side) and `src/app/superadmin/pages/tickets/` (superadmin conversation/inbox). No other pages are in scope.

Direction: brand-consistent, colorful. Reuse the app's real design tokens from `src/styles.css` (`--primary` navy `#0f172a`, `--accent` teal `#0d9488`, `--success`/`--warning`/`--danger`, Manrope, shared radius/shadow scale) as the foundation, and layer in a richer supporting accent palette for color coding (e.g. indigo for agent/staff messages, amber for pending status, rose for unread/urgent) so the result reads as colorful and modern without clashing with the rest of the product.

- **Chat widget (ticket creation):**
  - Branded gradient header (navy → teal) replacing the flat Tailwind blue bar.
  - New subject-capture step (see above) styled to match.
  - Message bubbles restyled onto the shared radius/shadow tokens.
  - Animated launcher button with an unread pulse/badge.
- **Superadmin tickets page:**
  - Same token base, plus color-coded avatars/status pills/toasts using the richer accent set.
  - The existing "OVERRIDES FOR UI UPDATE" block at the bottom of `tickets.component.css` (duplicated selectors, `!important` patches) gets merged into the primary rules it overrides rather than left stacked on top — a cleanup, not a behavior change.
  - Subject is now populated and shown prominently in both the ticket list rows and the chat header.
- No component/service architecture changes — this is templates + CSS + the one new subject field end-to-end.

## Testing / verification

- Run `composer run dev` from `backend/`; confirm Reverb is listening on port 8080 (`netstat`) alongside the API server on 8000.
- Drive two browser sessions side by side — a tenant creating/using a ticket, and the superadmin tickets inbox — and confirm new tickets and messages appear live on the superadmin side with no manual refresh.
- Create a new ticket and confirm the subject entered in the widget shows up correctly in the superadmin list and chat header (not "Objet non défini").
- Visual pass on both surfaces at typical viewport sizes (the superadmin page already has a documented mobile breakpoint at 800px; keep it working).
