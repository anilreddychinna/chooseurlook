import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { SeoService } from '../core/seo.service';

interface PageCopy {
  title: string;
  description: string;
  kicker: string;
  paragraphs: string[];
}

const PAGES: Record<string, PageCopy> = {
  about: {
    kicker: 'The house',
    title: 'About ChooseUrLook',
    description: 'ChooseUrLook is an India-based shop for cycling sunglasses, running sunglasses, accessories and ladies looks.',
    paragraphs: [
      'ChooseUrLook concentrates on cycling sunglasses and running sunglasses, with a smaller edit of accessories and ladies looks.',
      'Every order stores the name, SKU and price at the moment you buy it. Later catalogue changes do not rewrite that order.',
      'Payments are confirmed on the server. A browser message alone never marks an order paid.',
    ],
  },
  shipping: {
    kicker: 'Delivery',
    title: 'Shipping',
    description: 'Shipping across India. Free over ₹1,999, otherwise ₹99.',
    paragraphs: [
      'We ship across India. Orders of ₹1,999 and above travel free. Smaller orders carry a ₹99 shipping fee, calculated when the order is created.',
      'A PIN code check confirms the format and shows the same rate. Live courier booking, AWB and tracking are saved by the studio once a shipment exists.',
      'Prepaid orders are packed after payment is verified. Cash on delivery is confirmed when you place the order.',
    ],
  },
  returns: {
    kicker: 'Care',
    title: 'Returns and cancellation',
    description: 'Cancel a confirmed or unpaid order from your account before it ships.',
    paragraphs: [
      'You can cancel an order while it is awaiting payment or confirmed. Cancellation puts the reserved stock back.',
      'Once an order is processing, shipped or delivered, write to the studio from your order page details and we will handle the return case by case.',
      'Refunds follow the original payment method after the payment provider confirms them. Card numbers are never stored here.',
    ],
  },
  privacy: {
    kicker: 'Privacy',
    title: 'Privacy',
    description: 'How ChooseUrLook uses your account, address and order details.',
    paragraphs: [
      'Your account holds your name, phone, email, addresses and orders. You can read your own records. Other customers cannot.',
      'Payment cards are handled by Razorpay. We store the payment reference and status, not the card number or CVV.',
      'Transactional email, when configured, is used for order updates. We do not sell your details.',
    ],
  },
  terms: {
    kicker: 'Terms',
    title: 'Terms',
    description: 'The terms for shopping at ChooseUrLook.',
    paragraphs: [
      'Prices are in Indian rupees and include GST. The amount you pay is the total calculated from current catalogue prices, stock, coupons and shipping.',
      'A product stays in your bag only while stock remains. If it sells out before checkout, the order is refused rather than oversold.',
      'The studio may refuse or cancel an order that fails payment verification, stock checks or fraud review.',
    ],
  },
};

@Component({
  selector: 'app-static-page',
  imports: [RouterLink],
  template: `
    <article class="page-intro prose">
      <p class="eyebrow">{{ copy.kicker }}</p>
      <h1>{{ copy.title }}</h1>
      @for (paragraph of copy.paragraphs; track paragraph) {
        <p>{{ paragraph }}</p>
      }
      <a class="btn" routerLink="/shop">Shop the edit</a>
    </article>
  `,
})
export class StaticPageComponent {
  readonly copy: PageCopy;

  constructor() {
    const page = inject(ActivatedRoute).snapshot.data['page'] as string;
    this.copy = PAGES[page] ?? PAGES['about'];
    inject(SeoService).set({
      title: `${this.copy.title} · ChooseUrLook`,
      description: this.copy.description,
      path: `/${page}`,
    });
  }
}

@Component({
  selector: 'app-not-found',
  imports: [RouterLink],
  template: `
    <section class="page-intro">
      <p class="eyebrow">404</p>
      <h1>That page has left the edit.</h1>
      <a class="btn" routerLink="/">Back home</a>
    </section>
  `,
})
export class NotFoundComponent {
  constructor() {
    inject(SeoService).set({
      title: 'Page not found · ChooseUrLook',
      description: 'This ChooseUrLook page is not available.',
      path: '/404',
    });
  }
}
