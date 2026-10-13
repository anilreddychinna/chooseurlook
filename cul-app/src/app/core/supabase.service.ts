import { isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class SupabaseService {
  private readonly platformId = inject(PLATFORM_ID);
  readonly configured: boolean;
  readonly client: SupabaseClient | null;

  constructor() {
    const browser = isPlatformBrowser(this.platformId);
    this.configured = Boolean(environment.supabaseUrl && environment.supabaseAnonKey);
    this.client = this.configured
      ? createClient(environment.supabaseUrl, environment.supabaseAnonKey, {
          auth: {
            persistSession: browser,
            autoRefreshToken: browser,
            detectSessionInUrl: browser,
          },
          realtime: browser ? undefined : { transport: ServerSocket as unknown as typeof WebSocket },
        })
      : null;
  }

  imageUrl(path: string | null | undefined): string | null {
    if (!path) return null;
    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    return this.client?.storage.from('product-images').getPublicUrl(path).data.publicUrl ?? null;
  }
}

class ServerSocket {
  constructor(public url: string) {}
  close(): void {}
  send(): void {}
  addEventListener(): void {}
  removeEventListener(): void {}
}
