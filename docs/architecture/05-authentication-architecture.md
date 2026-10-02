# Authentication Architecture

## Overview

This document defines the authentication architecture using Supabase Auth with Next.js App Router, including user registration, login, session management, password reset, and security considerations.

---

## 1. Auth Flow Overview

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Client    │────▶│  Supabase   │────▶│  Database   │────▶│  Next.js    │
│  (Browser)  │     │   Auth      │     │  (users)    │     │  Middleware │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
       ▲                   │                   │                   │
       │                   ▼                   │                   ▼
       │            ┌─────────────┐            │            ┌─────────────┐
       └────────────│  JWT Token  │◀───────────┘            │  Session    │
                    │  (Access +  │                         │  Cookie     │
                    │  Refresh)   │                         │  (HttpOnly) │
                    └─────────────┘                         └─────────────┘
```

---

## 2. Supabase Auth Configuration

### Auth Settings (Dashboard → Authentication → Settings)

| Setting | Value | Rationale |
|---------|-------|-----------|
| **Site URL** | `https://your-domain.com` | Production URL |
| **Redirect URLs** | `https://your-domain.com/auth/callback`, `http://localhost:3000/auth/callback` | OAuth callbacks |
| **Email Confirmations** | Enabled | Verify email ownership |
| **Secure Email Change** | Enabled | Prevent account takeover |
| **Phone Confirmations** | Disabled | Not needed |
| **Password Requirements** | Min 8 chars, 1 uppercase, 1 number, 1 symbol | Security baseline |
| **Session Timeout** | 24 hours | Balance security/UX |
| **Refresh Token Rotation** | Enabled | Security best practice |
| **Refresh Token Reuse Interval** | 10 seconds | Prevent replay attacks |

### Email Templates (Customize in Dashboard)

- **Confirm Signup** - Branding, clear CTA, expiry notice
- **Reset Password** - Security warning, expiry, support link
- **Magic Link** - Alternative to password login
- **Invite User** - Project-specific, role context

---

## 3. User Registration Flow

### Server Action: Sign Up
```typescript
// features/auth/actions/signUp.ts
'use server';

import { createServerClient } from '@/shared/lib/supabase/server';
import { signUpSchema } from '../schemas/signUp';
import { redirect } from 'next/navigation';
import { getSiteUrl } from '@/config/site';

export async function signUpAction(formData: FormData) {
  const rawData = Object.fromEntries(formData.entries());
  const validated = signUpSchema.safeParse(rawData);
  
  if (!validated.success) {
    return { error: validated.error.flatten().fieldErrors };
  }
  
  const { email, password, fullName } = validated.data;
  const supabase = await createServerClient();
  
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName },
      emailRedirectTo: `${getSiteUrl()}/auth/callback`,
    },
  });
  
  if (error) {
    if (error.message.includes('already registered')) {
      return { error: { email: ['Email already registered'] } };
    }
    return { error: { form: ['Registration failed. Please try again.'] } };
  }
  
  if (data.user && !data.session) {
    // Email confirmation required
    return { 
      success: true, 
      message: 'Please check your email to confirm your account.',
      requiresConfirmation: true 
    };
  }
  
  redirect('/dashboard');
}
```

### Client Component: Sign Up Form
```typescript
// features/auth/components/SignUpForm.tsx
'use client';

import { useActionState } from 'react';
import { signUpAction } from '../actions/signUp';
import { Input } from '@/shared/ui/input';
import { Button } from '@/shared/ui/button';
import { useTranslations } from 'next-intl';

export function SignUpForm() {
  const t = useTranslations('auth.signUp');
  const [state, formAction, isPending] = useActionState(signUpAction, {
    error: null,
    success: false,
    message: '',
  });
  
  return (
    <form action={formAction} className="space-y-4" noValidate>
      <div>
        <label htmlFor="fullName" className="label">{t('fullName')}</label>
        <Input id="fullName" name="fullName" required autoComplete="name" />
      </div>
      
      <div>
        <label htmlFor="email" className="label">{t('email')}</label>
        <Input id="email" name="email" type="email" required autoComplete="email" />
        {state.error?.email && (
          <p className="text-sm text-red-500">{state.error.email[0]}</p>
        )}
      </div>
      
      <div>
        <label htmlFor="password" className="label">{t('password')}</label>
        <Input id="password" name="password" type="password" required autoComplete="new-password" />
        {state.error?.password && (
          <p className="text-sm text-red-500">{state.error.password[0]}</p>
        )}
      </div>
      
      <div>
        <label htmlFor="confirmPassword" className="label">{t('confirmPassword')}</label>
        <Input id="confirmPassword" name="confirmPassword" type="password" required autoComplete="new-password" />
      </div>
      
      {state.error?.form && (
        <div className="text-sm text-red-500" role="alert">{state.error.form[0]}</div>
      )}
      
      <Button type="submit" disabled={isPending} className="w-full">
        {isPending ? t('creatingAccount') : t('createAccount')}
      </Button>
      
      {state.success && (
        <div className="text-sm text-green-500" role="status">
          {state.message}
        </div>
      )}
    </form>
  );
}
```

---

## 4. User Login Flow

### Server Action: Sign In
```typescript
// features/auth/actions/signIn.ts
'use server';

import { createServerClient } from '@/shared/lib/supabase/server';
import { signInSchema } from '../schemas/signIn';
import { redirect } from 'next/navigation';
import { getSiteUrl } from '@/config/site';

export async function signInAction(formData: FormData) {
  const rawData = Object.fromEntries(formData.entries());
  const validated = signInSchema.safeParse(rawData);
  
  if (!validated.success) {
    return { error: validated.error.flatten().fieldErrors };
  }
  
  const { email, password } = validated.data;
  const supabase = await createServerClient();
  
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  
  if (error) {
    if (error.message.includes('Email not confirmed')) {
      return { error: { email: ['Please confirm your email first'] } };
    }
    if (error.message.includes('Invalid credentials')) {
      return { error: { form: ['Invalid email or password'] } };
    }
    return { error: { form: ['Login failed. Please try again.'] } };
  }
  
  redirect('/dashboard');
}
```

### Server Action: Magic Link (Passwordless)
```typescript
// features/auth/actions/signInWithMagicLink.ts
'use server';

import { createServerClient } from '@/shared/lib/supabase/server';
import { magicLinkSchema } from '../schemas/magicLink';
import { getSiteUrl } from '@/config/site';

export async function signInWithMagicLinkAction(formData: FormData) {
  const rawData = Object.fromEntries(formData.entries());
  const validated = magicLinkSchema.safeParse(rawData);
  
  if (!validated.success) {
    return { error: validated.error.flatten().fieldErrors };
  }
  
  const { email } = validated.data;
  const supabase = await createServerClient();
  
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${getSiteUrl()}/auth/callback`,
    },
  });
  
  if (error) {
    return { error: { form: ['Failed to send magic link'] } };
  }
  
  return { success: true, message: 'Check your email for the magic link' };
}
```

---

## 5. Session Management

### Middleware: Session Refresh
```typescript
// middleware.ts
import { updateSession } from '@/shared/lib/supabase/middleware';
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

const PROTECTED_ROUTES = ['/dashboard', '/projects', '/admin', '/profile'];
const AUTH_ROUTES = ['/login', '/register', '/reset-password'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Refresh session
  const response = await updateSession(request);
  
  // Get user
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll() {}, // Handled by updateSession
      },
    }
  );
  
  const { data: { user } } = await supabase.auth.getUser();
  
  // Redirect logic
  const isProtected = PROTECTED_ROUTES.some(route => pathname.startsWith(route));
  const isAuthRoute = AUTH_ROUTES.some(route => pathname.startsWith(route));
  
  if (isProtected && !user) {
    const redirectUrl = new URL('/login', request.url);
    redirectUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(redirectUrl);
  }
  
  if (isAuthRoute && user) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }
  
  // Admin routes check
  if (pathname.startsWith('/admin')) {
    const { data: { user: adminUser } } = await supabase.auth.getUser();
    if (adminUser?.user_metadata?.role !== 'ADMIN') {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }
  
  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.png$).*)',
  ],
};
```

### Getting Current User (Server)
```typescript
// features/auth/actions/getCurrentUser.ts
'use server';

import { createServerClient } from '@/shared/lib/supabase/server';
import { cache } from 'react';

// Cache per request to avoid multiple DB calls
export const getCurrentUser = cache(async () => {
  const supabase = await createServerClient();
  
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error || !user) return null;
  
  // Fetch profile from public.users
  const { data: profile } = await supabase
    .from('users')
    .select('id, email, full_name, avatar_url, role, locale, theme')
    .eq('id', user.id)
    .single();
  
  return profile;
});
```

### Getting Current User (Client)
```typescript
// features/auth/hooks/useCurrentUser.ts
'use client';

import { useEffect, useState } from 'react';
import { createBrowserClient } from '@/shared/lib/supabase/client';
import { User } from '@/shared/types/user';

export function useCurrentUser() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const supabase = createBrowserClient();
    
    // Initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });
    
    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          await fetchProfile(session.user.id);
        } else {
          setUser(null);
          setLoading(false);
        }
      }
    );
    
    return () => subscription.unsubscribe();
  }, []);
  
  const fetchProfile = async (userId: string) => {
    try {
      const response = await fetch(`/api/auth/profile/${userId}`);
      if (response.ok) {
        const profile = await response.json();
        setUser(profile);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };
  
  return { user, loading };
}
```

---

## 6. Password Reset Flow

### Request Reset
```typescript
// features/auth/actions/requestPasswordReset.ts
'use server';

import { createServerClient } from '@/shared/lib/supabase/server';
import { resetPasswordRequestSchema } from '../schemas/resetPasswordRequest';
import { getSiteUrl } from '@/config/site';

export async function requestPasswordResetAction(formData: FormData) {
  const rawData = Object.fromEntries(formData.entries());
  const validated = resetPasswordRequestSchema.safeParse(rawData);
  
  if (!validated.success) {
    return { error: validated.error.flatten().fieldErrors };
  }
  
  const { email } = validated.data;
  const supabase = await createServerClient();
  
  // Always return success to prevent email enumeration
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${getSiteUrl()}/auth/reset-password`,
  });
  
  if (error) {
    console.error('Password reset request failed:', error);
  }
  
  return { 
    success: true, 
    message: 'If the email exists, a reset link has been sent.' 
  };
}
```

### Update Password
```typescript
// features/auth/actions/updatePassword.ts
'use server';

import { createServerClient } from '@/shared/lib/supabase/server';
import { updatePasswordSchema } from '../schemas/updatePassword';
import { redirect } from 'next/navigation';

export async function updatePasswordAction(formData: FormData) {
  const rawData = Object.fromEntries(formData.entries());
  const validated = updatePasswordSchema.safeParse(rawData);
  
  if (!validated.success) {
    return { error: validated.error.flatten().fieldErrors };
  }
  
  const { password, confirmPassword } = validated.data;
  
  if (password !== confirmPassword) {
    return { error: { confirmPassword: ['Passwords do not match'] } };
  }
  
  const supabase = await createServerClient();
  
  const { error } = await supabase.auth.updateUser({ password });
  
  if (error) {
    return { error: { form: ['Failed to update password'] } };
  }
  
  redirect('/login?passwordUpdated=true');
}
```

---

## 7. OAuth Providers

### Configuration
```typescript
// config/auth.ts
export const OAUTH_PROVIDERS = {
  github: {
    enabled: true,
    name: 'GitHub',
    icon: 'github',
  },
  google: {
    enabled: true,
    name: 'Google',
    icon: 'google',
  },
  microsoft: {
    enabled: false, // For enterprise SSO
    name: 'Microsoft',
    icon: 'microsoft',
  },
} as const;
```

### OAuth Sign In Action
```typescript
// features/auth/actions/signInWithOAuth.ts
'use server';

import { createServerClient } from '@/shared/lib/supabase/server';
import { redirect } from 'next/navigation';
import { getSiteUrl } from '@/config/site';

export async function signInWithOAuthAction(provider: 'github' | 'google') {
  const supabase = await createServerClient();
  
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: `${getSiteUrl()}/auth/callback`,
      scopes: provider === 'github' ? 'read:user user:email' : 'email profile',
    },
  });
  
  if (error) {
    return { error: 'Failed to initiate OAuth' };
  }
  
  redirect(data.url);
}
```

### Callback Handler
```typescript
// app/auth/callback/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/shared/lib/supabase/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') || '/dashboard';
  
  if (code) {
    const supabase = await createServerClient();
    await supabase.auth.exchangeCodeForSession(code);
  }
  
  return NextResponse.redirect(new URL(next, request.url));
}
```

---

## 8. User Profile Management

### Update Profile
```typescript
// features/auth/actions/updateProfile.ts
'use server';

import { createServerClient } from '@/shared/lib/supabase/server';
import { updateProfileSchema } from '../schemas/updateProfile';
import { getCurrentUser } from './getCurrentUser';
import { revalidatePath } from 'next/cache';

export async function updateProfileAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) return { error: 'Unauthorized' };
  
  const rawData = Object.fromEntries(formData.entries());
  const validated = updateProfileSchema.safeParse(rawData);
  
  if (!validated.success) {
    return { error: validated.error.flatten().fieldErrors };
  }
  
  const { fullName, locale, theme } = validated.data;
  const supabase = await createServerClient();
  
  // Update auth metadata
  await supabase.auth.updateUser({
    data: { full_name: fullName },
  });
  
  // Update public profile
  const { error } = await supabase
    .from('users')
    .update({ full_name: fullName, locale, theme })
    .eq('id', user.id);
  
  if (error) return { error: 'Failed to update profile' };
  
  revalidatePath('/profile');
  revalidatePath('/settings');
  
  return { success: true };
}
```

### Avatar Upload
```typescript
// features/auth/actions/uploadAvatar.ts
'use server';

import { createAdminClient } from '@/shared/lib/supabase/admin';
import { getCurrentUser } from './getCurrentUser';
import { generateSignedUploadUrl } from '@/modules/storage/helpers';
import { revalidatePath } from 'next/cache';

export async function uploadAvatarAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) return { error: 'Unauthorized' };
  
  const file = formData.get('avatar') as File;
  if (!file) return { error: 'No file provided' };
  
  // Validate
  if (!file.type.startsWith('image/')) return { error: 'Must be an image' };
  if (file.size > 2 * 1024 * 1024) return { error: 'Max 2MB' };
  
  // Upload to avatars bucket
  const { signedUrl, path } = await generateSignedUploadUrl({
    bucket: 'AVATARS',
    userId: user.id,
    fileName: file.name,
    contentType: file.type,
  });
  
  // Client uploads directly to signed URL
  const uploadResponse = await fetch(signedUrl, {
    method: 'PUT',
    body: file,
    headers: { 'Content-Type': file.type },
  });
  
  if (!uploadResponse.ok) return { error: 'Upload failed' };
  
  // Update profile with avatar URL
  const supabase = createAdminClient();
  const { data: { publicUrl } } = supabase.storage
    .from('avatars')
    .getPublicUrl(path);
  
  await supabase
    .from('users')
    .update({ avatar_url: publicUrl })
    .eq('id', user.id);
  
  revalidatePath('/profile');
  revalidatePath('/settings');
  
  return { success: true, avatarUrl: publicUrl };
}
```

---

## 9. Security Considerations

### Protection Against

| Threat | Mitigation |
|--------|------------|
| **Brute Force** | Supabase rate limiting (configurable) |
| **Credential Stuffing** | Email confirmation required, magic link option |
| **Session Hijacking** | HttpOnly cookies, Secure flag, SameSite=Lax |
| **CSRF** | SameSite cookies, Supabase built-in CSRF protection |
| **XSS** | No user input in HTML, CSP headers |
| **Token Replay** | Refresh token rotation, short access token expiry |
| **Email Enumeration** | Generic error messages for reset/login |

### Security Headers (next.config.js)
```javascript
const securityHeaders = [
  {
    key: 'X-DNS-Prefetch-Control',
    value: 'on',
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    key: 'X-Frame-Options',
    value: 'DENY',
  },
  {
    key: 'X-XSS-Protection',
    value: '1; mode=block',
  },
  {
    key: 'Referrer-Policy',
    value: 'origin-when-cross-origin',
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=()',
  },
];

module.exports = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },
};
```

### Content Security Policy
```typescript
// middleware.ts (add to response)
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data: https: blob:",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
  "frame-src https://js.stripe.com",
].join('; ');

response.headers.set('Content-Security-Policy', csp);
```

---

## 10. Role-Based Access Control (Auth Level)

### User Roles (in `users` table)
```typescript
// shared/constants/roles.ts
export const USER_ROLES = {
  ADMIN: 'ADMIN',
  PROJECT_MANAGER: 'PROJECT_MANAGER',
  USER: 'USER',
} as const;

export type UserRole = typeof USER_ROLES[keyof typeof USER_ROLES];

export const ROLE_HIERARCHY: Record<UserRole, number> = {
  ADMIN: 3,
  PROJECT_MANAGER: 2,
  USER: 1,
};

export function hasRole(userRole: UserRole, requiredRole: UserRole): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
}
```

### Role in JWT Claims
```sql
-- Trigger to sync role to auth.users.raw_user_meta_data
CREATE OR REPLACE FUNCTION public.sync_user_role()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    UPDATE auth.users
    SET raw_user_meta_data = jsonb_set(
      COALESCE(raw_user_meta_data, '{}'::jsonb),
      '{role}',
      to_jsonb(NEW.role)
    )
    WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER sync_user_role_trigger
AFTER UPDATE OF role ON public.users
FOR EACH ROW EXECUTE FUNCTION public.sync_user_role();
```

---

## Summary

| Feature | Implementation |
|---------|----------------|
| **Registration** | Email/password + confirmation |
| **Login** | Email/password + Magic Link + OAuth |
| **Session** | HttpOnly cookies, auto-refresh via middleware |
| **Password Reset** | Secure token, email-based |
| **Profile** | Synced between auth.users and public.users |
| **Avatar** | Direct upload to Supabase Storage |
| **Roles** | ADMIN, PROJECT_MANAGER, USER (in public.users) |
| **Security** | Rate limiting, CSP, secure cookies, token rotation |

---

*Last Updated: 2026-01-10*
*Version: 1.0.0*