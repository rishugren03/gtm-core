import { Scheduler } from './scheduler.interface';

export class InMemoryScheduler implements Scheduler {
  private timeouts = new Map<string, NodeJS.Timeout>();

  schedule(taskId: string, runAt: number, callback: () => void): void {
    const delay = Math.max(0, runAt - Date.now());
    
    // Clear existing if any (safety)
    if (this.timeouts.has(taskId)) {
      clearTimeout(this.timeouts.get(taskId)!);
    }

    const timeout = setTimeout(() => {
      this.timeouts.delete(taskId);
      callback();
    }, delay);

    this.timeouts.set(taskId, timeout);
  }

  cancel(taskId: string): void {
    const timeout = this.timeouts.get(taskId);
    if (timeout) {
      clearTimeout(timeout);
      this.timeouts.delete(taskId);
    }
  }
}

export const scheduler = new InMemoryScheduler();
