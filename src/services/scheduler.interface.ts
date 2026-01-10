export interface Scheduler {
  schedule(taskId: string, runAt: number, callback: () => void): void;
  cancel(taskId: string): void;
}
