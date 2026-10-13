import { Injectable, inject, signal } from '@angular/core';
import type { User } from '@supabase/supabase-js';
import { Profile } from './models';
import { SupabaseService } from './supabase.service';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly supabase = inject(SupabaseService);
  private started = false;

  readonly user = signal<User | null>(null);
  readonly profile = signal<Profile | null>(null);
  readonly isAdmin = signal(false);
  readonly ready = signal(false);

  async init(): Promise<void> {
    if (this.started) return;
    this.started = true;
    const client = this.supabase.client;
    if (!client) {
      this.ready.set(true);
      return;
    }

    const { data } = await client.auth.getSession();
    await this.apply(data.session?.user ?? null);
    client.auth.onAuthStateChange((_event, session) => {
      void this.apply(session?.user ?? null);
    });
    this.ready.set(true);
  }

  async signIn(email: string, password: string): Promise<void> {
    const client = this.requireClient();
    const { error } = await client.auth.signInWithPassword({ email, password });
    if (error) throw error;
    await this.init();
  }

  async signUp(email: string, password: string, displayName: string): Promise<string> {
    const client = this.requireClient();
    const { data, error } = await client.auth.signUp({
      email,
      password,
      options: { data: { display_name: displayName } },
    });
    if (error) throw error;
    if (data.session) await this.init();
    return data.session ? 'signed-in' : 'check-email';
  }

  async signOut(): Promise<void> {
    const client = this.supabase.client;
    if (!client) return;
    const { error } = await client.auth.signOut();
    if (error) throw error;
    this.user.set(null);
    this.profile.set(null);
    this.isAdmin.set(false);
  }

  async sendReset(email: string): Promise<void> {
    const client = this.requireClient();
    const redirectTo = typeof location !== 'undefined' ? `${location.origin}/auth/reset` : undefined;
    const { error } = await client.auth.resetPasswordForEmail(email, { redirectTo });
    if (error) throw error;
  }

  async updatePassword(password: string): Promise<void> {
    const client = this.requireClient();
    const { error } = await client.auth.updateUser({ password });
    if (error) throw error;
  }

  async updateProfile(displayName: string, phone: string): Promise<void> {
    const client = this.requireClient();
    const user = this.user();
    if (!user) throw new Error('Sign in required');
    const { error } = await client.from('profiles').update({
      display_name: displayName,
      phone: phone || null,
    }).eq('id', user.id);
    if (error) throw error;
    await this.apply(user);
  }

  private async apply(user: User | null): Promise<void> {
    this.user.set(user);
    const client = this.supabase.client;
    if (!user || !client) {
      this.profile.set(null);
      this.isAdmin.set(false);
      return;
    }

    const [{ data: profile }, { data: role }] = await Promise.all([
      client.from('profiles').select('id, display_name, phone').eq('id', user.id).maybeSingle(),
      client.from('user_roles').select('role').eq('user_id', user.id).eq('role', 'admin').maybeSingle(),
    ]);
    this.profile.set((profile as Profile | null) ?? null);
    this.isAdmin.set(Boolean(role));
  }

  private requireClient() {
    if (!this.supabase.client) {
      throw new Error('Add your Supabase URL and anon key in src/environments/environment.ts');
    }
    return this.supabase.client;
  }
}
