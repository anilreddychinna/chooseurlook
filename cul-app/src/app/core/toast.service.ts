import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ToastService {
  readonly text = signal<string | null>(null);
  private timer: ReturnType<typeof setTimeout> | null = null;

  show(text: string): void {
    this.text.set(text);
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => this.text.set(null), 3600);
  }
}
