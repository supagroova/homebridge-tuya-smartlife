import type { DiscoverDevicesResult } from '../discovery/types';
import type { UpdateHub } from './updateHub';

type PollRepository = {
  discoverDevices(): Promise<DiscoverDevicesResult>;
};

type PollLogger = {
  warn(message: string, ...parameters: unknown[]): void;
};

type PollUpdateHub = Pick<UpdateHub, 'replaceAll'>;

export type DeviceStatusPollerOptions = {
  repository: PollRepository;
  updateHub: PollUpdateHub;
  log: PollLogger;
  intervalMs: number;
  jitterRatio: number;
  backoffMultiplier: number;
  maxBackoffMs: number;
  random?: () => number;
};

export class DeviceStatusPoller {
  private timer: ReturnType<typeof setTimeout> | undefined;
  private running = false;
  private polling = false;
  private nextDelayMs: number;
  private readonly random: () => number;

  constructor(private readonly options: DeviceStatusPollerOptions) {
    this.nextDelayMs = options.intervalMs;
    this.random = options.random ?? Math.random;
  }

  start(): void {
    if (this.running) {
      return;
    }

    this.running = true;
    this.schedule(0);
  }

  stop(): void {
    this.running = false;

    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = undefined;
    }
  }

  private schedule(delayMs: number): void {
    if (!this.running) {
      return;
    }

    this.timer = setTimeout(() => {
      void this.poll();
    }, delayMs);
  }

  private async poll(): Promise<void> {
    if (!this.running || this.polling) {
      return;
    }

    this.polling = true;

    try {
      const discovery = await this.options.repository.discoverDevices();
      this.options.updateHub.replaceAll(discovery.devices);
      this.nextDelayMs = this.options.intervalMs;
    } catch (error) {
      this.options.log.warn('Tuya status poll failed: %s', errorMessage(error));
      this.nextDelayMs = Math.min(
        Math.max(this.options.intervalMs, this.nextDelayMs * this.options.backoffMultiplier),
        this.options.maxBackoffMs,
      );
    } finally {
      this.polling = false;
      this.schedule(jitteredDelay(this.nextDelayMs, this.options.jitterRatio, this.random));
    }
  }
}

function jitteredDelay(intervalMs: number, jitterRatio: number, random: () => number): number {
  if (jitterRatio <= 0) {
    return intervalMs;
  }

  const jitterRange = intervalMs * jitterRatio;
  const offset = (random() * 2 - 1) * jitterRange;

  return Math.max(0, Math.round(intervalMs + offset));
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
