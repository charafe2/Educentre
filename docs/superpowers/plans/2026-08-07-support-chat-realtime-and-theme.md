# Support Chat Real-Time Fix & Theme Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make superadmin ticket/message updates appear live (no manual refresh), fix new tickets always showing "Objet non défini", and give the tenant-side chat widget and superadmin tickets inbox a professional, colorful, brand-consistent redesign.

**Architecture:** No new services or components. Fix a missing local-dev process (Reverb WebSocket server), thread a `subject` field through the existing ticket-creation request/response/broadcast path, and restyle two existing UI surfaces (`chat-widget` and superadmin `tickets`) on top of the app's existing CSS custom-property design system in `src/styles.css`.

**Tech Stack:** Laravel 12 + Reverb (broadcasting), Angular 21 standalone components + signals, PHPUnit (classic `TestCase`, not Pest syntax), Tailwind v4 (utility classes available but this codebase's convention for these two surfaces is hand-written component CSS using `var(--token)` custom properties).

## Global Constraints

- All new/changed user-facing copy must be in French, matching the rest of the app (the superadmin tickets page is already French; the current chat widget is inconsistently in English — fix this as part of the redesign).
- Ticket subject: required, max 120 characters, enforced both client-side (`maxlength`) and server-side (`max:120` validation rule).
- Visual redesign must build on the existing tokens in `src/styles.css` (`--primary`, `--accent`, `--accent-light`, `--accent-glow`, `--success`/`--success-bg`, `--warning`/`--warning-bg`, `--danger`/`--danger-bg`, `--bg-color`, `--surface`, `--text-main`/`--text-muted`/`--text-light`, `--border-color`, `--shadow-sm`/`--shadow-md`/`--shadow-lg`/`--shadow-float`, `--radius-*`, `--font-ui`) — do not invent an unrelated palette.
- No new npm or composer dependencies.
- Follow existing conventions: backend feature tests use classic PHPUnit (`public function test_...(): void`) as seen in `backend/tests/Feature/Finance/PaymentApiTest.php`; this codebase has zero Angular unit tests today, so frontend tasks are verified by running the dev server and exercising the UI in a browser, not by adding a new test framework.

---

### Task 1: Start the Reverb WebSocket server automatically in local dev

**Files:**
- Modify: `backend/composer.json:47-50`

**Interfaces:**
- Consumes: nothing.
- Produces: a running WebSocket server on `127.0.0.1:8080` whenever `composer run dev` is used, which every later task's "verify real-time" steps depend on.

- [ ] **Step 1: Edit the `dev` script**

In `backend/composer.json`, find:

```json
        "dev": [
            "Composer\\Config::disableProcessTimeout",
            "npx concurrently -c \"#93c5fd,#c4b5fd,#fb7185,#fdba74\" \"php artisan serve\" \"php artisan queue:listen --tries=1 --timeout=0\" \"php artisan pail --timeout=0\" \"npm run dev\" --names=server,queue,logs,vite --kill-others"
        ],
```

Replace with:

```json
        "dev": [
            "Composer\\Config::disableProcessTimeout",
            "npx concurrently -c \"#93c5fd,#c4b5fd,#34d399,#fb7185,#fdba74\" \"php artisan serve\" \"php artisan queue:listen --tries=1 --timeout=0\" \"php artisan reverb:start --debug\" \"php artisan pail --timeout=0\" \"npm run dev\" --names=server,queue,reverb,logs,vite --kill-others"
        ],
```

This adds `php artisan reverb:start --debug` as a new concurrent process (matching how `docker/supervisor/supervisord.reverb.conf` already runs it in production), with its own color and name in the `concurrently` output.

- [ ] **Step 2: Verify Reverb starts and listens on port 8080**

Run (from `backend/`): `composer run dev`

Wait ~5 seconds, then in another terminal run:

`netstat -ano | grep LISTENING | grep 8080` (Windows/Git Bash) — expect at least one line showing `127.0.0.1:8080` or `0.0.0.0:8080` LISTENING.

Stop the `composer run dev` process (Ctrl+C) once confirmed.

- [ ] **Step 3: Commit**

```bash
git add backend/composer.json
git commit -m "fix: start Reverb WebSocket server in local dev workflow"
```

---

### Task 2: Backend — require and persist a ticket subject, include it in the real-time payload

**Files:**
- Modify: `backend/app/Domains/Support/Controllers/ChatController.php:71-85`
- Modify: `backend/app/Events/NewTicketCreated.php:31-49`
- Create: `backend/tests/Feature/Support/ChatApiTest.php`

**Interfaces:**
- Consumes: `App\Domains\Support\Models\Conversation` (existing, has fillable `subject`), `App\Events\NewTicketCreated` (existing).
- Produces: `POST /api/v1/conversations` now requires `subject` (string, ≤120 chars) and returns/persists it; the `ticket.created` broadcast payload on the `superadmin.tickets` channel now includes a `subject` key. Task 5 (frontend) depends on this key existing in the broadcast payload.

- [ ] **Step 1: Write the failing tests**

Create `backend/tests/Feature/Support/ChatApiTest.php`:

```php
<?php

namespace Tests\Feature\Support;

use App\Events\NewTicketCreated;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Tests\TestCase;

class ChatApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_starting_a_conversation_requires_a_subject(): void
    {
        $user = $this->chatUser();

        $this->actingAs($user)
            ->postJson('/api/v1/conversations', [])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('subject');
    }

    public function test_starting_a_conversation_persists_and_broadcasts_the_subject(): void
    {
        Event::fake([NewTicketCreated::class]);

        $user = $this->chatUser();

        $response = $this->actingAs($user)
            ->postJson('/api/v1/conversations', ['subject' => 'Problème de facturation'])
            ->assertCreated()
            ->assertJsonPath('data.subject', 'Problème de facturation');

        $conversationId = $response->json('data.id');

        $this->assertDatabaseHas('conversations', [
            'id' => $conversationId,
            'subject' => 'Problème de facturation',
        ]);

        Event::assertDispatched(NewTicketCreated::class, function (NewTicketCreated $event) use ($conversationId) {
            return $event->conversation->id === $conversationId
                && $event->conversation->subject === 'Problème de facturation';
        });
    }

    private function chatUser(): User
    {
        $tenant = Tenant::factory()->create();

        return User::factory()->for($tenant)->create();
    }
}
```

- [ ] **Step 2: Run the tests to verify they fail**

Run (from `backend/`): `php artisan test --filter=ChatApiTest`

Expected: `test_starting_a_conversation_requires_a_subject` fails (currently returns 201, not 422, since there's no validation), and `test_starting_a_conversation_persists_and_broadcasts_the_subject` fails on the `data.subject` assertion (currently null).

- [ ] **Step 3: Update `ChatController::startConversation`**

In `backend/app/Domains/Support/Controllers/ChatController.php`, find:

```php
    public function startConversation(Request $request)
    {
        $conversation = Conversation::create([
            'tenant_id' => $request->user()->tenant_id,
            'user_id' => $request->user()->id,
            'status' => 'pending'
        ]);

        broadcast(new \App\Events\NewTicketCreated($conversation));

        return response()->json([
            'success' => true,
            'data' => $conversation
        ]);
    }
```

Replace with:

```php
    public function startConversation(Request $request)
    {
        $request->validate([
            'subject' => 'required|string|max:120',
        ]);

        $conversation = Conversation::create([
            'tenant_id' => $request->user()->tenant_id,
            'user_id' => $request->user()->id,
            'status' => 'pending',
            'subject' => $request->subject,
        ]);

        broadcast(new \App\Events\NewTicketCreated($conversation));

        return response()->json([
            'success' => true,
            'data' => $conversation
        ]);
    }
```

- [ ] **Step 4: Include `subject` in the `NewTicketCreated` broadcast payload**

In `backend/app/Events/NewTicketCreated.php`, find:

```php
        return [
            'id' => $this->conversation->id,
            'uuid' => $this->conversation->uuid,
            'status' => $this->conversation->status,
            'user' => [
```

Replace with:

```php
        return [
            'id' => $this->conversation->id,
            'uuid' => $this->conversation->uuid,
            'status' => $this->conversation->status,
            'subject' => $this->conversation->subject,
            'user' => [
```

- [ ] **Step 5: Run the tests to verify they pass**

Run (from `backend/`): `php artisan test --filter=ChatApiTest`

Expected: both tests PASS.

- [ ] **Step 6: Commit**

```bash
git add backend/app/Domains/Support/Controllers/ChatController.php backend/app/Events/NewTicketCreated.php backend/tests/Feature/Support/ChatApiTest.php
git commit -m "feat: require and broadcast a ticket subject on creation"
```

---

### Task 3: Frontend — `ChatService`: send the subject, track unread replies

**Files:**
- Modify: `src/app/services/chat.service.ts`

**Interfaces:**
- Consumes: `POST /v1/conversations` now expects `{ subject: string }` (Task 2).
- Produces: `startConversation(subject: string): Observable<any>` (signature change — Task 4's widget component depends on this), `unreadCount: Signal<number>`, `clearUnread(): void` (both consumed by Task 4).

- [ ] **Step 1: Change `startConversation` to accept and send a subject**

In `src/app/services/chat.service.ts`, find:

```ts
  startConversation(): Observable<any> {
    return this.http.post<any>(`${environment.apiUrl}/v1/conversations`, {}).pipe(
      tap(res => {
        if (res.success) {
          this.conversations.update(list => [res.data, ...list]);
          this.setActiveConversation(res.data);
        }
      })
    );
  }
```

Replace with:

```ts
  startConversation(subject: string): Observable<any> {
    return this.http.post<any>(`${environment.apiUrl}/v1/conversations`, { subject }).pipe(
      tap(res => {
        if (res.success) {
          this.conversations.update(list => [res.data, ...list]);
          this.setActiveConversation(res.data);
        }
      })
    );
  }
```

- [ ] **Step 2: Add an `unreadCount` signal**

Find:

```ts
  conversations = signal<Conversation[]>([]);
  activeConversation = signal<Conversation | null>(null);
  messages = signal<Message[]>([]);
```

Replace with:

```ts
  conversations = signal<Conversation[]>([]);
  activeConversation = signal<Conversation | null>(null);
  messages = signal<Message[]>([]);
  unreadCount = signal<number>(0);
```

- [ ] **Step 3: Increment `unreadCount` on incoming real-time messages, add `clearUnread()`**

Find:

```ts
  private listenToConversation(uuid: string) {
    if (this.currentChannel) {
      this.realtime.echo?.leave(this.currentChannel.name);
    }

    if (this.realtime.echo) {
      this.currentChannel = this.realtime.echo.private(`chat.${uuid}`);
      this.currentChannel.listen('.message.sent', (event: any) => {
        // Prevent duplicate messages if the sender is the current user
        // (as sendMessage already updates the list)
        this.messages.update(msgs => {
          const exists = msgs.find(m => m.uuid === event.uuid);
          if (exists) return msgs;
          return [...msgs, event];
        });
      });
    }
  }
}
```

Replace with:

```ts
  private listenToConversation(uuid: string) {
    if (this.currentChannel) {
      this.realtime.echo?.leave(this.currentChannel.name);
    }

    if (this.realtime.echo) {
      this.currentChannel = this.realtime.echo.private(`chat.${uuid}`);
      this.currentChannel.listen('.message.sent', (event: any) => {
        // Prevent duplicate messages if the sender is the current user
        // (as sendMessage already updates the list)
        this.messages.update(msgs => {
          const exists = msgs.find(m => m.uuid === event.uuid);
          if (exists) return msgs;
          return [...msgs, event];
        });
        this.unreadCount.update(n => n + 1);
      });
    }
  }

  clearUnread() {
    this.unreadCount.set(0);
  }
}
```

- [ ] **Step 4: Verify it compiles**

Run (from repo root): `npx tsc --noEmit -p tsconfig.json` (or `npm run build` if that's faster to reason about) — expect no new errors from this file. It will still show an error at any call site still calling `startConversation()` with no argument; that's expected until Task 4 updates the only caller.

- [ ] **Step 5: Commit**

```bash
git add src/app/services/chat.service.ts
git commit -m "feat: send ticket subject and track unread replies in ChatService"
```

---

### Task 4: Frontend — rebuild the chat widget: subject-capture step + colorful brand redesign

**Files:**
- Modify: `src/app/components/chat-widget/chat-widget.component.ts` (drop the inline template/styles, use `templateUrl`/`styleUrl`, add subject-capture state)
- Create: `src/app/components/chat-widget/chat-widget.component.html`
- Create: `src/app/components/chat-widget/chat-widget.component.css`

**Interfaces:**
- Consumes: `ChatService.startConversation(subject: string)`, `ChatService.unreadCount`, `ChatService.clearUnread()` (Task 3), `ChatService.loadConversations()`, `ChatService.setActiveConversation()`, `ChatService.messages`, `ChatService.sendMessage()`, `ChatService.activeConversation` (all pre-existing).
- Produces: same public component (`app-chat-widget` selector, still used by `src/app/layout/admin-layout/admin-layout.component.ts` with no changes needed there).

- [ ] **Step 1: Replace `chat-widget.component.ts`**

Overwrite `src/app/components/chat-widget/chat-widget.component.ts` with:

```ts
import { Component, inject, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChatService } from '../../services/chat.service';
import { AuthStore } from '../../auth/auth.store';

@Component({
  selector: 'app-chat-widget',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chat-widget.component.html',
  styleUrl: './chat-widget.component.css'
})
export class ChatWidgetComponent {
  chatService = inject(ChatService);
  authStore = inject(AuthStore);

  isOpen = signal(false);
  view = signal<'subject' | 'chat'>('chat');
  newMessage = '';
  subjectInput = '';
  startingConversation = false;

  currentUserId = this.authStore.user()?.uuid;

  constructor() {
    effect(() => {
      // Re-evaluate current user id if auth changes
      const user = this.authStore.user();
      if (user) {
        this.currentUserId = user.uuid || (user as any).id;
      }
    });
  }

  toggleChat() {
    const next = !this.isOpen();
    this.isOpen.set(next);
    if (next) {
      this.chatService.clearUnread();
      if (!this.chatService.activeConversation()) {
        this.initConversation();
      }
    }
  }

  isMe(msg: any): boolean {
    return msg.sender_type?.includes('User') && msg.sender_id === this.currentUserId;
  }

  initConversation() {
    this.chatService.loadConversations().subscribe(res => {
      if (res.success && res.data.length > 0) {
        // Load the latest conversation
        this.chatService.setActiveConversation(res.data[0]);
        this.view.set('chat');
      } else {
        // No conversation yet: ask what the tenant needs help with first
        this.view.set('subject');
      }
    });
  }

  submitSubject(event: Event) {
    event.preventDefault();
    if (!this.subjectInput.trim() || this.startingConversation) return;

    this.startingConversation = true;
    this.chatService.startConversation(this.subjectInput.trim()).subscribe({
      next: () => {
        this.startingConversation = false;
        this.view.set('chat');
      },
      error: () => {
        this.startingConversation = false;
      }
    });
  }

  sendMessage(event: Event) {
    event.preventDefault();
    if (!this.newMessage.trim()) return;

    const conv = this.chatService.activeConversation();
    if (conv) {
      this.chatService.sendMessage(conv.uuid, this.newMessage).subscribe(() => {
        this.newMessage = ''; // Clear input on success
      });
    }
  }
}
```

- [ ] **Step 2: Create `chat-widget.component.html`**

```html
<div class="cw-root">
  <button
    *ngIf="!isOpen()"
    (click)="toggleChat()"
    class="cw-launcher"
    aria-label="Ouvrir le support"
  >
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="cw-launcher-icon">
      <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 12.76c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.076-4.076a1.526 1.526 0 011.037-.443 48.282 48.282 0 005.68-.494c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
    </svg>
    <span *ngIf="chatService.unreadCount() > 0" class="cw-launcher-badge">{{ chatService.unreadCount() }}</span>
  </button>

  <div *ngIf="isOpen()" class="cw-window">
    <header class="cw-header">
      <div class="cw-header-text">
        <h3 class="cw-title">Support</h3>
        <p class="cw-subtitle">Nous répondons en quelques minutes.</p>
      </div>
      <button (click)="toggleChat()" class="cw-close" aria-label="Fermer">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="cw-close-icon">
          <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </header>

    <!-- Subject capture step: shown before the first conversation is created -->
    <div *ngIf="view() === 'subject'" class="cw-subject-view">
      <div class="cw-subject-icon">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z"/>
        </svg>
      </div>
      <h4 class="cw-subject-heading">Comment pouvons-nous vous aider ?</h4>
      <p class="cw-subject-hint">Décrivez votre demande en quelques mots, un membre de notre équipe vous répondra rapidement.</p>
      <form (submit)="submitSubject($event)" class="cw-subject-form">
        <input
          type="text"
          [(ngModel)]="subjectInput"
          name="subject"
          maxlength="120"
          placeholder="Ex : Problème de facturation"
          class="cw-subject-input"
          autocomplete="off"
        />
        <button type="submit" class="cw-subject-submit" [disabled]="!subjectInput.trim() || startingConversation">
          {{ startingConversation ? 'Démarrage…' : 'Démarrer la conversation' }}
        </button>
      </form>
    </div>

    <!-- Chat view -->
    <ng-container *ngIf="view() === 'chat'">
      <div class="cw-messages" #scrollMe [scrollTop]="scrollMe.scrollHeight">
        <div *ngIf="chatService.messages().length === 0" class="cw-empty">
          <p>Envoyez un message pour démarrer la conversation avec le support.</p>
        </div>

        <div
          *ngFor="let msg of chatService.messages()"
          class="cw-msg"
          [ngClass]="isMe(msg) ? 'cw-msg-me' : 'cw-msg-them'"
        >
          {{ msg.content }}
          <div class="cw-msg-time">{{ msg.created_at | date:'shortTime' }}</div>
        </div>
      </div>

      <footer class="cw-composer">
        <form (submit)="sendMessage($event)" class="cw-composer-form">
          <input
            type="text"
            [(ngModel)]="newMessage"
            name="message"
            placeholder="Écrivez votre message…"
            class="cw-composer-input"
            autocomplete="off"
          />
          <button type="submit" class="cw-composer-send" [disabled]="!newMessage.trim()">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="cw-send-icon">
              <path d="M3.478 2.404a.75.75 0 00-.926.941l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.404z" />
            </svg>
          </button>
        </form>
      </footer>
    </ng-container>
  </div>
</div>
```

- [ ] **Step 3: Create `chat-widget.component.css`**

```css
:host {
  --cw-gradient-start: var(--primary);
  --cw-gradient-end: var(--accent);
  --cw-surface: #ffffff;
  --cw-canvas: var(--bg-color);
  --cw-line: var(--border-color);
  --cw-text: var(--text-main);
  --cw-muted: var(--text-muted);
  --cw-radius: var(--radius-lg);
  --cw-ease: cubic-bezier(0.16, 1, 0.3, 1);
  font-family: var(--font-ui);
}

.cw-root {
  position: fixed;
  bottom: 24px;
  right: 24px;
  z-index: 50;
}

/* ── Launcher ── */
.cw-launcher {
  position: relative;
  width: 58px;
  height: 58px;
  border-radius: 50%;
  border: none;
  cursor: pointer;
  display: grid;
  place-items: center;
  color: #fff;
  background: linear-gradient(135deg, var(--cw-gradient-start), var(--cw-gradient-end));
  box-shadow: var(--shadow-float);
  transition: transform 180ms var(--cw-ease);
  animation: cw-launcher-breathe 3.4s ease-in-out infinite;
}
.cw-launcher:hover {
  transform: scale(1.06);
}
.cw-launcher:active {
  transform: scale(0.96);
}
.cw-launcher-icon {
  width: 26px;
  height: 26px;
}
.cw-launcher-badge {
  position: absolute;
  top: -4px;
  right: -4px;
  min-width: 20px;
  height: 20px;
  padding: 0 5px;
  border-radius: 999px;
  background: var(--danger);
  color: #fff;
  font-size: 0.68rem;
  font-weight: 800;
  display: grid;
  place-items: center;
  border: 2px solid #fff;
  animation: cw-badge-pop 260ms var(--cw-ease);
}

@keyframes cw-launcher-breathe {
  0%, 100% { box-shadow: var(--shadow-float), 0 0 0 0 var(--accent-glow); }
  50% { box-shadow: var(--shadow-float), 0 0 0 8px transparent; }
}
@keyframes cw-badge-pop {
  from { transform: scale(0.5); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}

/* ── Window ── */
.cw-window {
  width: 380px;
  max-width: calc(100vw - 48px);
  height: 560px;
  max-height: 80vh;
  border-radius: var(--cw-radius);
  overflow: hidden;
  background: var(--cw-surface);
  box-shadow: var(--shadow-lg);
  border: 1px solid var(--cw-line);
  display: flex;
  flex-direction: column;
  animation: cw-window-in 220ms var(--cw-ease);
}
@keyframes cw-window-in {
  from { opacity: 0; transform: translateY(16px) scale(0.98); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

/* ── Header ── */
.cw-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 20px;
  background: linear-gradient(135deg, var(--cw-gradient-start), var(--cw-gradient-end));
  color: #fff;
}
.cw-title {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 750;
  letter-spacing: -0.01em;
}
.cw-subtitle {
  margin: 2px 0 0;
  font-size: 0.76rem;
  font-weight: 550;
  color: rgba(255, 255, 255, 0.82);
}
.cw-close {
  border: none;
  background: rgba(255, 255, 255, 0.14);
  color: #fff;
  width: 30px;
  height: 30px;
  border-radius: 8px;
  display: grid;
  place-items: center;
  cursor: pointer;
  transition: background 140ms var(--cw-ease);
  flex-shrink: 0;
}
.cw-close:hover {
  background: rgba(255, 255, 255, 0.24);
}
.cw-close-icon {
  width: 18px;
  height: 18px;
}

/* ── Subject capture step ── */
.cw-subject-view {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 32px 28px;
  text-align: center;
  background: var(--cw-canvas);
}
.cw-subject-icon {
  width: 52px;
  height: 52px;
  border-radius: 14px;
  background: var(--accent-light);
  color: var(--accent);
  display: grid;
  place-items: center;
  margin-bottom: 16px;
}
.cw-subject-icon svg {
  width: 26px;
  height: 26px;
}
.cw-subject-heading {
  margin: 0 0 6px;
  font-size: 1rem;
  font-weight: 750;
  color: var(--cw-text);
}
.cw-subject-hint {
  margin: 0 0 20px;
  font-size: 0.8rem;
  color: var(--cw-muted);
  line-height: 1.5;
  max-width: 280px;
}
.cw-subject-form {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.cw-subject-input {
  width: 100%;
  padding: 11px 14px;
  border: 1px solid var(--cw-line);
  border-radius: 10px;
  background: #fff;
  font-family: inherit;
  font-size: 0.86rem;
  outline: none;
  transition: border-color 140ms var(--cw-ease), box-shadow 140ms var(--cw-ease);
}
.cw-subject-input:focus {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-glow);
}
.cw-subject-submit {
  padding: 11px 16px;
  border: none;
  border-radius: 10px;
  background: linear-gradient(135deg, var(--cw-gradient-start), var(--cw-gradient-end));
  color: #fff;
  font-family: inherit;
  font-size: 0.86rem;
  font-weight: 700;
  cursor: pointer;
  transition: transform 140ms var(--cw-ease), opacity 140ms var(--cw-ease);
}
.cw-subject-submit:hover:not(:disabled) {
  transform: translateY(-1px);
}
.cw-subject-submit:disabled {
  opacity: 0.5;
  cursor: default;
}

/* ── Messages ── */
.cw-messages {
  flex: 1;
  overflow-y: auto;
  padding: 18px 18px 8px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  background: var(--cw-canvas);
}
.cw-empty {
  margin: auto;
  text-align: center;
  color: var(--cw-muted);
  font-size: 0.82rem;
  max-width: 220px;
}
.cw-msg {
  max-width: 82%;
  padding: 10px 14px;
  border-radius: 14px;
  font-size: 0.85rem;
  line-height: 1.5;
  box-shadow: var(--shadow-sm);
}
.cw-msg-them {
  align-self: flex-start;
  background: #fff;
  border: 1px solid var(--cw-line);
  border-bottom-left-radius: 4px;
  color: var(--cw-text);
}
.cw-msg-me {
  align-self: flex-end;
  background: linear-gradient(135deg, var(--cw-gradient-start), var(--cw-gradient-end));
  border-bottom-right-radius: 4px;
  color: #fff;
}
.cw-msg-time {
  margin-top: 4px;
  font-size: 0.64rem;
  font-weight: 600;
  opacity: 0.6;
  text-align: right;
}

/* ── Composer ── */
.cw-composer {
  padding: 12px 16px;
  border-top: 1px solid var(--cw-line);
  background: #fff;
}
.cw-composer-form {
  display: flex;
  align-items: center;
  gap: 8px;
}
.cw-composer-input {
  flex: 1;
  padding: 11px 14px;
  border: 1px solid var(--cw-line);
  border-radius: 999px;
  background: var(--cw-canvas);
  font-family: inherit;
  font-size: 0.84rem;
  outline: none;
  transition: border-color 140ms var(--cw-ease), box-shadow 140ms var(--cw-ease);
}
.cw-composer-input:focus {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-glow);
}
.cw-composer-send {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: none;
  background: linear-gradient(135deg, var(--cw-gradient-start), var(--cw-gradient-end));
  color: #fff;
  display: grid;
  place-items: center;
  cursor: pointer;
  flex-shrink: 0;
  transition: transform 140ms var(--cw-ease), opacity 140ms var(--cw-ease);
}
.cw-composer-send svg {
  width: 17px;
  height: 17px;
}
.cw-composer-send:hover:not(:disabled) {
  transform: scale(1.05);
}
.cw-composer-send:disabled {
  opacity: 0.4;
  cursor: default;
}

@media (max-width: 480px) {
  .cw-window {
    width: calc(100vw - 32px);
  }
}
```

- [ ] **Step 4: Verify in the browser**

Run `npm start` (or the project's usual `composer run dev` from `backend/` plus `npm start` from the repo root — whichever this repo normally uses to run both sides). Log in as a tenant user, open a page using `AdminLayoutComponent`, and confirm:
- The launcher button shows the new gradient circle bottom-right.
- Clicking it with no prior conversation shows the French subject-capture screen; submitting a subject moves to the chat view.
- Reopening the widget later (conversation already exists) skips straight to the chat view.
- Sending a message works and appears in the new bubble style.

- [ ] **Step 5: Commit**

```bash
git add src/app/components/chat-widget/
git commit -m "feat: redesign chat widget with subject capture and brand-consistent theme"
```

---

### Task 5: Frontend — carry the ticket subject into the superadmin real-time "new ticket" event

**Files:**
- Modify: `src/app/superadmin/services/superadmin-ticket.service.ts:175-187`

**Interfaces:**
- Consumes: the `subject` key now present on the `ticket.created` broadcast payload (Task 2).
- Produces: `Ticket.subject` populated immediately for tickets that arrive via the real-time `.ticket.created` listener (previously only populated after a page refresh/re-fetch).

- [ ] **Step 1: Add `subject` when building the new ticket from the broadcast event**

In `src/app/superadmin/services/superadmin-ticket.service.ts`, find:

```ts
      const newTicket: Ticket = {
        id: event.id,
        uuid: event.uuid,
        tenant_id: 0,
        user_id: 0,
        agent_id: null,
        status: event.status,
        updated_at: event.updated_at,
        created_at: event.created_at,
        unread_count: 0,
        user: event.user,
      };
```

Replace with:

```ts
      const newTicket: Ticket = {
        id: event.id,
        uuid: event.uuid,
        tenant_id: 0,
        user_id: 0,
        agent_id: null,
        status: event.status,
        subject: event.subject,
        updated_at: event.updated_at,
        created_at: event.created_at,
        unread_count: 0,
        user: event.user,
      };
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit -p tsconfig.json` — expect no new errors (the `Ticket` interface already declares `subject?: string`).

- [ ] **Step 3: Commit**

```bash
git add src/app/superadmin/services/superadmin-ticket.service.ts
git commit -m "fix: populate ticket subject from the real-time ticket-created event"
```

---

### Task 6: Superadmin tickets page — brand-consistent, colorful redesign + cleanup

**Files:**
- Modify: `src/app/superadmin/pages/tickets/tickets.component.css`
- Modify: `src/app/superadmin/pages/tickets/tickets.component.html`

**Interfaces:**
- Consumes: nothing new (same `TicketsComponent`/`SuperadminTicketService` API).
- Produces: no interface changes — CSS/template only.

This task retires the `/* OVERRIDES FOR UI UPDATE */` block at the end of `tickets.component.css` (a stack of duplicated, `!important`-laden patches) by folding its intent into the primary rules it was overriding, repointing the file's `--tk-*` design tokens onto the app's real brand tokens, and adding a couple of missing rules the HTML already references but the base CSS never defined.

- [ ] **Step 1: Repoint the `:host` design tokens to the app's brand system**

In `tickets.component.css`, find:

```css
:host {
  --tk-surface: #ffffff;
  --tk-canvas: #f7f6f3;
  --tk-line: #eaeaea;
  --tk-text: #111111;
  --tk-muted: #787774;
  --tk-soft: #a3a19d;
  --tk-green-bg: #edf3ec;
  --tk-green-text: #346538;
  --tk-blue-bg: #e1f3fe;
  --tk-blue-text: #1f6c9f;
  --tk-red-bg: #fdebec;
  --tk-red-text: #9f2f2d;
  --tk-radius: 10px;
  --tk-ease: cubic-bezier(0.16, 1, 0.3, 1);
  display: block;
  height: calc(100dvh - 90px);
  font-family: 'Manrope', 'SF Pro Display', 'Geist Sans', sans-serif;
}
```

Replace with:

```css
:host {
  --tk-surface: var(--surface);
  --tk-canvas: var(--bg-color);
  --tk-line: var(--border-color);
  --tk-text: var(--text-main);
  --tk-muted: var(--text-muted);
  --tk-soft: var(--text-light);
  --tk-green-bg: var(--success-bg);
  --tk-green-text: var(--success);
  --tk-blue-bg: #e0e7ff;
  --tk-blue-text: #4338ca;
  --tk-red-bg: var(--danger-bg);
  --tk-red-text: var(--danger);
  --tk-amber-bg: var(--warning-bg);
  --tk-amber-text: var(--warning);
  --tk-accent: var(--accent);
  --tk-accent-light: var(--accent-light);
  --tk-radius: var(--radius-md);
  --tk-ease: cubic-bezier(0.16, 1, 0.3, 1);
  display: block;
  height: calc(100dvh - 90px);
  font-family: var(--font-ui);
}
```

Because nearly every rule in this file already reads color through these token names, this one change re-themes most of the page immediately (status pills, avatars, toasts, active-row highlight, etc.).

- [ ] **Step 2: Add a subject line style for ticket list rows**

The template renders `<div class="tk-ticket-subject">` but the base CSS never defined `.tk-ticket-subject` (it only existed, inconsistently, in the override block). Find:

```css
.tk-ticket-tenant {
  font-size: 0.72rem;
  color: var(--tk-muted);
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  display: block;
}

.tk-ticket-bottom {
```

Replace with:

```css
.tk-ticket-tenant {
  font-size: 0.72rem;
  color: var(--tk-muted);
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  display: block;
}

.tk-ticket-subject {
  margin-top: 3px;
  font-size: 0.76rem;
  color: var(--tk-text);
  font-weight: 550;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tk-ticket-bottom {
```

- [ ] **Step 3: Give the active ticket row and filter tabs a teal (accent) selection color instead of green**

Find:

```css
.tk-ticket-item.tk-active {
  background: var(--tk-surface);
  box-shadow: inset 3px 0 0 var(--tk-green-text);
}
```

Replace with:

```css
.tk-ticket-item.tk-active {
  background: var(--tk-accent-light);
  box-shadow: inset 3px 0 0 var(--tk-accent);
}
```

Find:

```css
.tk-filter-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 10px;
  border: 1px solid var(--tk-line);
  border-radius: 8px;
  background: var(--tk-surface);
  color: var(--tk-muted);
  font-family: inherit;
  font-size: 0.75rem;
  font-weight: 650;
  cursor: pointer;
  transition: all 160ms var(--tk-ease);
}
.tk-filter-btn:hover {
  border-color: #dededa;
  color: var(--tk-text);
}
.tk-filter-btn.active {
  background: var(--tk-green-bg);
  border-color: rgba(52, 101, 56, 0.14);
  color: var(--tk-green-text);
}
```

Replace with:

```css
.tk-filter-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 10px;
  border: 1px solid transparent;
  border-radius: 8px;
  background: transparent;
  color: var(--tk-muted);
  font-family: inherit;
  font-size: 0.75rem;
  font-weight: 650;
  cursor: pointer;
  transition: all 160ms var(--tk-ease);
}
.tk-filter-btn:hover {
  background: var(--tk-canvas);
  color: var(--tk-text);
}
.tk-filter-btn.active {
  background: var(--tk-accent-light);
  border-color: transparent;
  color: var(--tk-accent);
}
```

- [ ] **Step 4: Add a "pending" status pill and matching avatar accent (amber) for color-coded triage**

Find:

```css
.tk-status-pill.tk-status-open {
  background: var(--tk-green-bg);
  color: var(--tk-green-text);
}
.tk-status-pill.tk-status-closed {
  background: var(--tk-line);
  color: var(--tk-muted);
}
```

Replace with:

```css
.tk-status-pill.tk-status-open {
  background: var(--tk-green-bg);
  color: var(--tk-green-text);
}
.tk-status-pill.tk-status-pending {
  background: var(--tk-amber-bg);
  color: var(--tk-amber-text);
}
.tk-status-pill.tk-status-closed {
  background: var(--tk-line);
  color: var(--tk-muted);
}
```

Find (list row avatar):

```css
.tk-ticket-avatar.tk-avatar-open {
  background: var(--tk-green-bg);
  color: var(--tk-green-text);
}
```

Replace with:

```css
.tk-ticket-avatar.tk-avatar-open {
  background: var(--tk-green-bg);
  color: var(--tk-green-text);
}
.tk-ticket-avatar.tk-avatar-pending {
  background: var(--tk-amber-bg);
  color: var(--tk-amber-text);
}
```

Find (chat header avatar):

```css
.tk-chat-avatar.tk-avatar-open {
  background: var(--tk-green-bg);
  color: var(--tk-green-text);
}
```

Replace with:

```css
.tk-chat-avatar.tk-avatar-open {
  background: var(--tk-green-bg);
  color: var(--tk-green-text);
}
.tk-chat-avatar.tk-avatar-pending {
  background: var(--tk-amber-bg);
  color: var(--tk-amber-text);
}
```

- [ ] **Step 5: Fix the chat header identity block (subject/name classes the template uses but the base CSS never defined)**

Find:

```css
.tk-chat-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 14px 22px;
  border-bottom: 1px solid var(--tk-line);
  min-height: 68px;
}

.tk-chat-header-left {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}
```

Replace with:

```css
.tk-chat-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 16px 24px;
  border-bottom: 1px solid var(--tk-line);
  min-height: 72px;
}

.tk-chat-header-left {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  min-width: 0;
  margin-top: 2px;
}
```

Find:

```css
.tk-chat-identity {
  display: grid;
  min-width: 0;
}

.tk-chat-name {
  font-size: 0.92rem;
  font-weight: 750;
  color: var(--tk-text);
  letter-spacing: -0.01em;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tk-chat-sub {
  font-size: 0.72rem;
  color: var(--tk-muted);
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
```

Replace with (the template renders `.tk-chat-subject` and `.tk-chat-name-small`, not `.tk-chat-name` — this was dead CSS):

```css
.tk-chat-identity {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.tk-chat-subject {
  font-size: 1rem;
  font-weight: 700;
  color: var(--tk-text);
  letter-spacing: -0.01em;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tk-chat-name-small {
  font-weight: 700;
}

.tk-chat-sub {
  font-size: 0.78rem;
  color: var(--tk-muted);
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
```

- [ ] **Step 6: Make the "Accepter" (claim) button a solid accent CTA, and style the status/assign selects (both used in the template but never styled in the base CSS)**

Find:

```css
.tk-action-claim:hover {
  background: var(--tk-blue-bg);
  border-color: transparent;
  color: var(--tk-blue-text);
}

.tk-action-close:hover {
  background: var(--tk-green-bg);
  border-color: transparent;
  color: var(--tk-green-text);
}
```

Replace with:

```css
.tk-action-claim {
  background: var(--tk-accent);
  border-color: transparent;
  color: #ffffff;
}
.tk-action-claim:hover {
  background: color-mix(in srgb, var(--tk-accent) 88%, black);
  color: #ffffff;
}

.tk-action-close:hover {
  background: var(--tk-green-bg);
  border-color: transparent;
  color: var(--tk-green-text);
}

.tk-select-status,
.tk-select-assign {
  padding: 7px 30px 7px 12px;
  border: 1px solid var(--tk-line);
  border-radius: 8px;
  background-color: var(--tk-surface);
  color: var(--tk-text);
  font-family: inherit;
  font-size: 0.78rem;
  font-weight: 650;
  cursor: pointer;
  transition: border-color 140ms var(--tk-ease);
}
.tk-select-status:hover,
.tk-select-assign:hover {
  border-color: var(--tk-accent);
}
```

- [ ] **Step 7: Add the internal-notes box styling (template uses it, base CSS never defined it) and give message bubbles a soft shadow + an indigo gradient for staff replies**

Find:

```css
/* ── Messages area ── */
.tk-messages {
```

Replace with:

```css
.tk-internal-notes {
  margin: 16px 24px 0;
  padding: 12px 16px;
  border-radius: 10px;
  background: var(--tk-amber-bg);
  border: 1px solid color-mix(in srgb, var(--tk-amber-text) 20%, transparent);
}
.tk-internal-notes summary {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--tk-amber-text);
  font-weight: 650;
  font-size: 0.8rem;
  cursor: pointer;
}
.tk-notes-textarea {
  width: 100%;
  margin-top: 10px;
  padding: 10px 12px;
  border: 1px solid var(--tk-line);
  border-radius: 8px;
  font-family: inherit;
  font-size: 0.82rem;
  resize: vertical;
  min-height: 64px;
}

/* ── Messages area ── */
.tk-messages {
```

Find:

```css
.tk-msg-bubble {
  padding: 10px 14px;
  border-radius: 14px;
  line-height: 1.5;
}
```

Replace with:

```css
.tk-msg-bubble {
  padding: 12px 16px;
  border-radius: 14px;
  line-height: 1.5;
  box-shadow: var(--shadow-sm);
}
```

Find:

```css
.tk-msg-me .tk-msg-bubble {
  background: var(--tk-text);
  border-bottom-right-radius: 4px;
  color: #ffffff;
}
```

Replace with:

```css
.tk-msg-me .tk-msg-bubble {
  background: linear-gradient(135deg, var(--tk-blue-text), var(--tk-accent));
  border-bottom-right-radius: 4px;
  color: #ffffff;
}
```

- [ ] **Step 8: Delete the entire trailing override block**

At the end of the file, delete everything from the `/* OVERRIDES FOR UI UPDATE */` comment through the end of the file:

```css

/* OVERRIDES FOR UI UPDATE */

/* List layout */
```

...continuing through the final `.tk-msg-bubble { ... }` rule at the very end of the file. Every rule in that block has now been folded into the primary rules above (Steps 1–7), so nothing is lost.

- [ ] **Step 9: Add the `pending` avatar class hooks in the template**

In `tickets.component.html`, find:

```html
        <div class="tk-ticket-avatar" [class.tk-avatar-open]="ticket.status === 'open'">
```

Replace with:

```html
        <div class="tk-ticket-avatar" [class.tk-avatar-open]="ticket.status === 'open'" [class.tk-avatar-pending]="ticket.status === 'pending'">
```

Find:

```html
          <div class="tk-chat-avatar" [class.tk-avatar-open]="active.status === 'open'">
```

Replace with:

```html
          <div class="tk-chat-avatar" [class.tk-avatar-open]="active.status === 'open'" [class.tk-avatar-pending]="active.status === 'pending'">
```

- [ ] **Step 10: Verify in the browser**

Run the app, log in as superadmin, open the Tickets page, and confirm:
- No visual regressions: list panel, filters, ticket rows, chat header, messages, composer, toasts all render correctly.
- Pending tickets show an amber avatar/pill; open tickets show green; closed show neutral gray.
- The active/selected ticket row has a teal accent bar and light teal background.
- Ticket subjects are visible in both the list rows and the chat header (not "Objet non défini" for freshly created tickets).
- Staff (your own) message bubbles render with the new indigo-to-teal gradient.
- Resize the window below 800px and confirm the existing mobile stacked layout still works.

- [ ] **Step 11: Commit**

```bash
git add src/app/superadmin/pages/tickets/tickets.component.css src/app/superadmin/pages/tickets/tickets.component.html
git commit -m "style: rebuild superadmin tickets theme on brand tokens, remove override patch block"
```

---

### Task 7: End-to-end verification

**Files:** none (manual verification only).

**Interfaces:** none — this task validates the integration of Tasks 1–6.

- [ ] **Step 1: Boot the full stack**

From `backend/`: `composer run dev` (starts API server, queue worker, Reverb, logs, and Vite together per Task 1).

Confirm in the terminal output that all five processes (`server`, `queue`, `reverb`, `logs`, `vite`) started without errors.

- [ ] **Step 2: Confirm Reverb is actually listening**

Run: `netstat -ano | grep LISTENING | grep 8080` — expect a listening entry.

- [ ] **Step 3: Two-session real-time check**

Open two browser windows side by side:
- Window A: log in as a tenant user, open the chat widget, enter a subject (e.g. "Test réel-temps"), and send a message.
- Window B: log in as superadmin, open the Tickets page *before* Window A creates the ticket.

Confirm, without refreshing Window B:
- The new ticket appears at the top of the list within a couple of seconds of being created in Window A, with the correct subject and a toast notification.
- Sending another message from Window A appears in Window B's open conversation (if selected) or increments the unread badge, live.
- Replying from Window B (superadmin) appears in Window A's chat widget live, and increments the widget's unread launcher badge if the widget is closed.

- [ ] **Step 4: Confirm existing tests still pass**

From `backend/`: `php artisan test --filter=ChatApiTest` — expect PASS (already verified in Task 2, re-confirming after all later CSS/template changes touched nothing backend-related).

- [ ] **Step 5: Stop the dev stack**

Ctrl+C the `composer run dev` process.

No commit for this task — it's verification only.
