import { isPlatformBrowser } from '@angular/common';
import { Component, ElementRef, OnDestroy, PLATFORM_ID, afterNextRender, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { HomeData } from '../core/models';
import { SeoService } from '../core/seo.service';
import { ProductCardComponent } from '../shared/product-card.component';

@Component({
  selector: 'app-home',
  imports: [RouterLink, ProductCardComponent],
  templateUrl: './home.component.html',
})
export class HomeComponent implements OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly host = inject(ElementRef<HTMLElement>);
  private context?: { revert: () => void };
  readonly data = toSignal(this.route.data.pipe(map((data) => data['home'] as HomeData | undefined)));

  constructor() {
    inject(SeoService).set({
      title: 'ChooseUrLook · Cycling and running sunglasses',
      description: 'Cycling sunglasses, running sunglasses, accessories and ladies looks from ChooseUrLook. Free shipping across India on orders over ₹1,999.',
      path: '/',
    });

    const platformId = inject(PLATFORM_ID);
    if (!isPlatformBrowser(platformId)) return;
    afterNextRender(() => void this.intro());
  }

  ngOnDestroy(): void {
    this.context?.revert();
  }

  private async intro(): Promise<void> {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const [{ default: gsap }, { ScrollTrigger }] = await Promise.all([
      import('gsap'),
      import('gsap/ScrollTrigger'),
    ]);
    gsap.registerPlugin(ScrollTrigger);
    this.context = gsap.context(() => {
      gsap.from('.hero img', { scale: 1.08, duration: 1.35, ease: 'power2.out' });
      gsap.from('.hero-copy > *', { y: 28, autoAlpha: 0, duration: 0.75, stagger: 0.08, ease: 'power3.out', delay: 0.1 });
      gsap.from('.category-card', {
        y: 28,
        autoAlpha: 0,
        duration: 0.7,
        stagger: 0.08,
        ease: 'power2.out',
        scrollTrigger: { trigger: '.category-grid', start: 'top 88%' },
      });
      gsap.from('.product-card', {
        y: 32,
        autoAlpha: 0,
        duration: 0.65,
        stagger: 0.06,
        ease: 'power2.out',
        scrollTrigger: { trigger: '.product-grid', start: 'top 88%' },
      });
    }, this.host.nativeElement);
  }
}
