import { Event, UserState, Task, UserLifecycle } from '../types/events';

class StorageService {
  private events: Event[] = [];
  private userStates: Map<string, UserState> = new Map();
  private processedEvents: Set<string> = new Set();

  /**
   * Attempts to process an event against the user's lifecycle state.
   * Returns true if the event is valid and state was updated (or state remains valid).
   * Returns false if the event represents an invalid transition.
   */
  processEventWithLifecycle(event: Event): boolean {
      const state = this.getUserState(event.user_id);
      
      // If we are tracking duplicates here, we could check event_id too. 
      // But let's assume duplication is handled before calling this logic or strict rules apply.

      // Transition Logic
      if (event.event === 'signup_completed') {
          if (state.status === UserLifecycle.ANONYMOUS) {
              state.status = UserLifecycle.SIGNED_UP;
              state.hasSignedUp = true;
              return true;
          }
           // If already signed up or activated, redundant signup is maybe ignored or just ok?
           // "Ensure invalid transitions are ignored"
           // If I am activated, sending signup again is weird. Ignored.
           return false; 
      }

      if (event.event === 'activated') {
          if (state.status === UserLifecycle.SIGNED_UP) {
              state.status = UserLifecycle.ACTIVATED;
              state.hasActivated = true;
              return true;
          }
          // Can't activate if anonymous or already activated (idempotency handles already activated if event id is same, but if different event id?)
          // If already activated, maybe it's fine? But "Ensure invalid transitions are ignored".
          // Trying to activate from anonymous is definitely invalid.
          return false;
      }

      // Other events don't change lifecycle state, so they are always valid?
      // Or strict: can only do key events? 
      // Requirement: "Implement lifecycle state transitions... Ensure invalid transitions are ignored"
      // Implies non-lifecycle events are just pass-through.
      return true;
  }

  async addEvent(event: Event): Promise<void> {
    
    if (event.event_id) {
        if (this.processedEvents.has(event.event_id)) {
            return; 
        }
        this.processedEvents.add(event.event_id);
    }

    this.events.push(event);
    // this.updateUserState(event); // Replaced by processEventWithLifecycle call in route
  }

  // Deprecated/Internal helper if needed, but we are moving logic to processEventWithLifecycle
  // private updateUserState(event: Event): void { ... }

  hasProcessed(eventId: string): boolean {
      return this.processedEvents.has(eventId);
  }

  getUserState(userId: string): UserState {
    if (!this.userStates.has(userId)) {
      this.userStates.set(userId, {
        userId,
        status: UserLifecycle.ANONYMOUS,
        hasSignedUp: false,
        hasActivated: false,
        tasks: [],
      });
    }
    return this.userStates.get(userId)!;
  }

  addTask(userId: string, task: Task): void {
      const state = this.getUserState(userId);
      state.tasks.push(task);
  }

  // State update handled in processEventWithLifecycle
  // private updateUserState(event: Event): void { ... }

  getEvents(): Event[] {
      return this.events;
  }
}

export const storage = new StorageService();
