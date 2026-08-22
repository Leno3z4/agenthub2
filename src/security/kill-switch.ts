export interface PositionCloser {
  closeAll(owner: string): Promise<void>;
}

export interface KillSwitchState {
  active: boolean;
  activatedAt?: string;
  activatedBy?: string;
}

export class KillSwitch {
  private state: KillSwitchState = { active: false };
  constructor(private readonly closer: PositionCloser) {}

  isActive(): boolean { return this.state.active; }

  async activate(owner: string): Promise<KillSwitchState> {
    if (this.state.active) return this.state;
    this.state = { active: true, activatedAt: new Date().toISOString(), activatedBy: owner };
    await this.closer.closeAll(owner);
    return this.state;
  }

  reset(): void {
    this.state = { active: false };
  }
}
