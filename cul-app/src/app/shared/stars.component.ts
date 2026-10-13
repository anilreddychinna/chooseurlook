import { Component, input } from '@angular/core';

@Component({
  selector: 'app-stars',
  template: `
    <span class="stars" [attr.aria-label]="label()">
      @for (mark of marks; track mark) {
        <svg viewBox="0 0 20 20" [class.on]="mark <= filled()" aria-hidden="true">
          <path d="m10 1.8 2.35 5.02 5.5.48-4.15 3.6 1.25 5.4L10 13.7l-4.95 2.6 1.25-5.4L2.15 7.3l5.5-.48L10 1.8z"></path>
        </svg>
      }
      <span>{{ caption() }}</span>
    </span>
  `,
})
export class StarsComponent {
  readonly average = input(0);
  readonly count = input(0);
  readonly marks = [1, 2, 3, 4, 5];

  filled(): number {
    return Math.round(Number(this.average()) || 0);
  }

  label(): string {
    return this.count() ? `${this.average()} out of 5 from ${this.count()} reviews` : 'No reviews yet';
  }

  caption(): string {
    if (!this.count()) return 'No reviews yet';
    const average = Number(this.average());
    const shown = Number.isInteger(average) ? String(average) : average.toFixed(1);
    return `${shown} (${this.count()})`;
  }
}
