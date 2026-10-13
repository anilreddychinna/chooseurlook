import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { errorMessage } from '../core/models';

@Component({
  selector: 'app-auth',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './auth.component.html',
})
export class AuthComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  readonly mode = signal<'login' | 'register' | 'forgot' | 'reset'>('login');
  readonly message = signal('');
  readonly error = signal('');
  readonly busy = signal(false);

  readonly form = inject(FormBuilder).nonNullable.group({
    displayName: [''],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  constructor() {
    this.route.data.subscribe((data) => {
      const mode = (data['mode'] as 'login' | 'register' | 'forgot' | 'reset') ?? 'login';
      this.mode.set(mode);
      this.message.set('');
      this.error.set('');
      if (mode === 'forgot') this.form.controls.password.clearValidators();
      else this.form.controls.password.setValidators([Validators.required, Validators.minLength(6)]);
      this.form.controls.password.updateValueAndValidity();
    });
  }

  async submit(): Promise<void> {
    this.error.set('');
    this.message.set('');
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.busy.set(true);
    const { email, password, displayName } = this.form.getRawValue();
    try {
      if (this.mode() === 'login') {
        await this.auth.signIn(email, password);
        const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') || '/account';
        await this.router.navigateByUrl(returnUrl);
      } else if (this.mode() === 'register') {
        const result = await this.auth.signUp(email, password, displayName);
        if (result === 'check-email') this.message.set('Check your email to confirm the account, then sign in.');
        else await this.router.navigateByUrl('/account');
      } else if (this.mode() === 'forgot') {
        await this.auth.sendReset(email);
        this.message.set('If an account exists, a reset link is on its way.');
      } else {
        await this.auth.updatePassword(password);
        this.message.set('Password updated.');
        await this.router.navigateByUrl('/account');
      }
    } catch (error) {
      this.error.set(errorMessage(error));
    } finally {
      this.busy.set(false);
    }
  }
}
