import { isPlatformBrowser } from '@angular/common';
import { Component, PLATFORM_ID, afterNextRender, effect, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { AuthService } from '../core/auth.service';
import { CartService } from '../core/cart.service';
import { WishlistService } from '../core/wishlist.service';
import { SupabaseService } from '../core/supabase.service';
import { ToastService } from '../core/toast.service';

@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './shell.component.html',
})
export class ShellComponent {
  readonly auth = inject(AuthService);
  readonly cart = inject(CartService);
  readonly wishlist = inject(WishlistService);
  readonly supabase = inject(SupabaseService);
  readonly toast = inject(ToastService);
  readonly onAccount = signal(false);
  readonly menuOpen = signal(false);
  readonly searchOpen = signal(false);
  year = new Date().getFullYear();
  private readonly motion = signal<typeof import('gsap').default | null>(null);
  private bagReady = false;

  constructor() {
    const platformId = inject(PLATFORM_ID);
    const router = inject(Router);
    const syncAccount = () => this.onAccount.set(router.url.split('?')[0].startsWith('/account'));
    syncAccount();
    router.events.pipe(filter((event) => event instanceof NavigationEnd)).subscribe(() => syncAccount());
    afterNextRender(() => void this.auth.init());
    if (!isPlatformBrowser(platformId)) return;

    afterNextRender(() => {
      void import('gsap').then((mod) => this.motion.set(mod.default));
    });

    effect(() => {
      const open = this.menuOpen();
      const gsap = this.motion();
      if (!open || !gsap || prefersReducedMotion()) return;
      queueMicrotask(() => {
        gsap.fromTo(
          '.primary-nav.open a',
          { y: 10, autoAlpha: 0 },
          { y: 0, autoAlpha: 1, duration: 0.32, stagger: 0.04, ease: 'power2.out', overwrite: true },
        );
      });
    });

    effect(() => {
      this.cart.count();
      const gsap = this.motion();
      if (!this.bagReady) {
        this.bagReady = true;
        return;
      }
      if (!gsap || prefersReducedMotion()) return;
      gsap.fromTo('.bag .glyph', { scale: 0.8 }, { scale: 1, duration: 0.35, ease: 'back.out(2)', overwrite: true });
    });
  }

  closeMenu(): void {
    this.menuOpen.set(false);
  }
}

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
