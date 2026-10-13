import { Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { CatalogService } from '../core/catalog.service';
import { Review, errorMessage } from '../core/models';
import { SupabaseService } from '../core/supabase.service';
import { StarsComponent } from './stars.component';

@Component({
  selector: 'app-reviews',
  imports: [RouterLink, StarsComponent],
  template: `
    <section class="section reviews">
      <div class="section-head">
        <h2>Reviews</h2>
        <app-stars [average]="average()" [count]="shown().length" />
      </div>
      @if (unavailable()) {
        <p class="fine">Reviews will show here after the reviews SQL is applied in Supabase.</p>
      } @else if (!shown().length) {
        <p class="fine">No reviews yet. Be the first to rate this piece.</p>
      } @else {
        <ul class="review-list">
          @for (review of shown(); track review.id) {
            <li>
              <div>
                <app-stars [average]="review.rating" [count]="1" />
                <strong>{{ review.authorName }}</strong>
              </div>
              <p>{{ review.body }}</p>
              <p class="fine">{{ when(review.createdAt) }}</p>
            </li>
          }
        </ul>
      }

      @if (auth.user()) {
        <form class="review-form" (submit)="save($event)">
          <fieldset class="star-pick">
            <legend>Your rating</legend>
            @for (mark of marks; track mark) {
              <button type="button" [class.on]="mark <= rating()" (click)="rating.set(mark)" [attr.aria-label]="mark + ' stars'">
                <svg viewBox="0 0 20 20" aria-hidden="true"><path d="m10 1.8 2.35 5.02 5.5.48-4.15 3.6 1.25 5.4L10 13.7l-4.95 2.6 1.25-5.4L2.15 7.3l5.5-.48L10 1.8z"></path></svg>
              </button>
            }
          </fieldset>
          <label>Review
            <textarea rows="4" maxlength="1000" [value]="body()" (input)="body.set($any($event.target).value)" placeholder="How did it wear?"></textarea>
          </label>
          @if (error()) { <p class="form-error">{{ error() }}</p> }
          <button class="btn" type="submit" [disabled]="busy()">{{ mine() ? 'Update review' : 'Publish review' }}</button>
        </form>
      } @else if (!unavailable()) {
        <a class="btn" [routerLink]="['/auth/login']" [queryParams]="{ returnUrl: '/p/' + slug() }">Sign in to review</a>
      }
    </section>
  `,
})
export class ReviewsComponent {
  private readonly catalog = inject(CatalogService);
  private readonly supabase = inject(SupabaseService);
  readonly auth = inject(AuthService);
  readonly productId = input.required<string>();
  readonly slug = input.required<string>();
  readonly initial = input<Review[] | null>(null);
  readonly summary = output<{ average: number; count: number }>();

  readonly rows = signal<Review[] | null>(null);
  readonly rating = signal(0);
  readonly body = signal('');
  readonly error = signal('');
  readonly busy = signal(false);
  readonly marks = [1, 2, 3, 4, 5];
  private seeded = false;

  readonly unavailable = computed(() => this.rows() === null && this.initial() === null);
  readonly shown = computed(() => this.rows() ?? this.initial() ?? []);
  readonly mine = computed(() => this.shown().find((review) => review.userId === this.auth.user()?.id) ?? null);
  readonly average = computed(() => {
    const rows = this.shown();
    if (!rows.length) return 0;
    return Math.round((rows.reduce((sum, review) => sum + review.rating, 0) / rows.length) * 10) / 10;
  });

  constructor() {
    effect(() => {
      const mine = this.mine();
      if (this.seeded || !mine) return;
      this.seeded = true;
      this.rating.set(mine.rating);
      this.body.set(mine.body);
    });
  }

  when(value: string): string {
    return new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(value));
  }

  async save(event: Event): Promise<void> {
    event.preventDefault();
    this.error.set('');
    const text = this.body().trim();
    if (this.rating() < 1) {
      this.error.set('Choose a star rating.');
      return;
    }
    if (text.length < 8) {
      this.error.set('Write at least 8 characters.');
      return;
    }
    const client = this.supabase.client;
    if (!client) return;
    this.busy.set(true);
    try {
      const mine = this.mine();
      const result = mine
        ? await client.from('reviews').update({ rating: this.rating(), body: text }).eq('id', mine.id)
        : await client.from('reviews').insert({ product_id: this.productId(), rating: this.rating(), body: text });
      if (result.error) throw result.error;
      const next = await this.catalog.fetchReviews(this.productId());
      if (next) {
        this.rows.set(next);
        const count = next.length;
        const average = count
          ? Math.round((next.reduce((sum, review) => sum + review.rating, 0) / count) * 10) / 10
          : 0;
        this.summary.emit({ average, count });
      }
    } catch (error) {
      this.error.set(errorMessage(error));
    } finally {
      this.busy.set(false);
    }
  }
}
