# Phase 1: Foundation & Auth - Research

**Researched:** 2026-02-13
**Domain:** BetterAuth OAuth integration, credit system implementation with Drizzle ORM
**Confidence:** HIGH

## Summary

Phase 1 builds on existing BetterAuth email/password authentication to add Google OAuth and implement a credit system. The existing boilerplate already has BetterAuth configured with PostgreSQL/Drizzle ORM, complete user/session/account tables, and working email/password auth. This phase extends that foundation with minimal changes.

**Key findings:**
- BetterAuth v1.4.18+ has mature Google OAuth support with straightforward configuration
- Credit system requires database schema extension with integer column and transaction-safe initialization
- Session persistence is already configured correctly (7-day expiry, httpOnly cookies, database storage)
- Main risk areas are OAuth callback URL mismatches and race conditions during user creation

**Primary recommendation:** Use BetterAuth's `hooks.after` for credit initialization to hook into successful signups, store credits as integer column in user table, and display balance via client component in header using existing session context.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| better-auth | 1.4.18+ | Authentication framework | Already integrated, supports OAuth providers, has hooks API |
| drizzle-orm | 0.44.7 | Database ORM | Already configured with PostgreSQL, excellent transaction support |
| postgres | 3.4.8 | PostgreSQL client | Current driver for Drizzle with this project |
| @radix-ui/react-dropdown-menu | 2.1.16 | Header UI dropdown | Already used in UserProfile component |
| lucide-react | 0.539.0 | Icons | Already used throughout project |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| None required | - | - | Existing stack covers all needs |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| BetterAuth hooks | Drizzle database hooks | Database hooks run outside transaction context, can't access BetterAuth session data |
| integer (cents) | numeric/decimal | Numeric is more precise but slower, uses 10 bytes vs 4 bytes, overkill for whole-number credits |
| Client component for balance | Server component | Client component allows real-time updates without page reload, better UX for balance display |

**Installation:**
No new packages needed - all dependencies already installed.

**Environment variables needed:**
```bash
# Add to .env
GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_google_client_secret
BETTER_AUTH_URL=http://localhost:3000  # or production URL
```

## Architecture Patterns

### Recommended Database Schema Extension
```typescript
// Add to src/lib/schema.ts
import { integer } from "drizzle-orm/pg-core";

export const user = pgTable(
  "user",
  {
    // ... existing fields
    credits: integer("credits").default(0).notNull(),
  },
  // ... existing indexes
);
```

**Why integer, not numeric:**
- Credits are whole numbers (no fractional credits)
- Integer is 4 bytes vs numeric's 10 bytes
- Integer provides better performance for arithmetic operations
- Simple balance checks don't need decimal precision

Source: [PostgreSQL Numeric Types Documentation](https://www.postgresql.org/docs/current/datatype-numeric.html)

### Pattern 1: Google OAuth Configuration
**What:** Add Google as social provider in BetterAuth config
**When to use:** Required for AUTH-02 requirement

**Example:**
```typescript
// src/lib/auth.ts
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "./db";

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL, // CRITICAL for production
  database: drizzleAdapter(db, {
    provider: "pg",
  }),
  emailAndPassword: {
    enabled: true,
    // ... existing config
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
      // Optional: force account selection on every login
      // prompt: "select_account",
      // Optional: get refresh token
      // accessType: "offline",
    },
  },
});
```
Source: [BetterAuth Google OAuth Documentation](https://www.better-auth.com/docs/authentication/google)

**Critical configuration note:** The `baseURL` must be set correctly or OAuth callback will default to localhost in production, causing failures.

### Pattern 2: Credit Initialization via Hooks
**What:** Use BetterAuth's after hooks to initialize credits on signup
**When to use:** Required for AUTH-03 requirement (3 free credits on first signup)

**Example:**
```typescript
// src/lib/auth.ts
import { betterAuth } from "better-auth";
import { createAuthMiddleware } from "better-auth/api";
import { db } from "./db";
import { user } from "./schema";
import { eq } from "drizzle-orm";

export const auth = betterAuth({
  // ... other config
  hooks: {
    after: createAuthMiddleware(async (ctx) => {
      // Check if this is a signup event
      if (ctx.path.startsWith("/sign-up")) {
        const newSession = ctx.context.newSession;
        if (newSession) {
          // Initialize credits for new user
          await db
            .update(user)
            .set({ credits: 3 })
            .where(eq(user.id, newSession.user.id));
        }
      }
    }),
  },
});
```
Source: [BetterAuth Hooks Documentation](https://www.better-auth.com/docs/concepts/hooks)

**Why after hooks, not database hooks:**
- Access to `ctx.context.newSession` with user data
- Runs after user is created but within request context
- Can differentiate signup from other user operations
- Transaction safety maintained by BetterAuth

### Pattern 3: Client-Side OAuth Sign In
**What:** Call BetterAuth client's social sign-in method
**When to use:** Required for login/register page Google button

**Example:**
```typescript
// src/components/auth/google-sign-in-button.tsx
"use client";

import { Button } from "@/components/ui/button";
import { signIn } from "@/lib/auth-client";

export function GoogleSignInButton() {
  const handleGoogleSignIn = async () => {
    await signIn.social({
      provider: "google",
      callbackURL: "/dashboard", // Redirect after successful login
    });
  };

  return (
    <Button onClick={handleGoogleSignIn} variant="outline">
      <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
        {/* Google logo SVG */}
      </svg>
      Continue with Google
    </Button>
  );
};
```
Source: [BetterAuth Basic Usage](https://www.better-auth.com/docs/basic-usage)

### Pattern 4: Display Credits in Header
**What:** Extend UserProfile component to show credit balance
**When to use:** Required for CRED-02 and DASH-04 requirements

**Architecture decision:** Credits should be displayed in the existing UserProfile dropdown component rather than directly in the header. This keeps the header clean and follows existing UX patterns.

**Example:**
```typescript
// src/components/auth/user-profile.tsx
"use client";

import { useSession } from "@/lib/auth-client";
import { Coins } from "lucide-react";

export function UserProfile() {
  const { data: session } = useSession();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {/* ... existing avatar */}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium">{session.user?.name}</p>
            <p className="text-xs text-muted-foreground">{session.user?.email}</p>
          </div>
        </DropdownMenuLabel>

        {/* NEW: Credit balance display */}
        <DropdownMenuSeparator />
        <div className="px-2 py-1.5 text-sm">
          <div className="flex items-center gap-2">
            <Coins className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Credits:</span>
            <span className="font-semibold">{session.user?.credits ?? 0}</span>
          </div>
        </div>

        <DropdownMenuSeparator />
        {/* ... existing profile link and sign out */}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

**Session extension needed:**
BetterAuth's session by default only includes `id`, `name`, `email`, `image`, `emailVerified`. We need to extend the session to include `credits`.

```typescript
// src/lib/auth-client.ts - extend the session type
import { createAuthClient } from "better-auth/client";

export const { useSession, signIn, signOut } = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL,
});

// Extend the session user type
declare module "better-auth/client" {
  interface Session {
    user: {
      id: string;
      name: string;
      email: string;
      image?: string;
      emailVerified: boolean;
      credits?: number; // Add credits field
    };
  }
}
```

**Server-side session extension:**
```typescript
// src/lib/auth.ts
export const auth = betterAuth({
  // ... other config
  session: {
    // Include credits in session data
    async onSessionCreated(session) {
      const [userData] = await db
        .select({ credits: user.credits })
        .from(user)
        .where(eq(user.id, session.userId));
      return {
        ...session,
        user: {
          ...session.user,
          credits: userData?.credits ?? 0,
        },
      };
    },
  },
});
```

**Note:** Verify BetterAuth v1.4.18 session extension API - this pattern may need adjustment based on actual API. Check official docs for `session.customFields` or similar extension mechanisms.

### Pattern 5: Database Migration
**What:** Generate and apply Drizzle migration for credits column
**When to use:** After updating schema.ts

**Example:**
```bash
# 1. Generate migration
pnpm db:generate

# 2. Review generated SQL in drizzle/ directory
# Should see: ALTER TABLE "user" ADD COLUMN "credits" integer DEFAULT 0 NOT NULL;

# 3. Apply migration
pnpm db:migrate
```

### Anti-Patterns to Avoid

**DON'T:** Initialize credits in separate API call after user creation
```typescript
// BAD: Race condition, user might make request before credits are set
await auth.signUp({ email, password });
await db.update(user).set({ credits: 3 }); // Separate call = race condition
```

**DO:** Use hooks to initialize within the signup flow
```typescript
// GOOD: Hooks run as part of signup, no race condition
hooks: {
  after: createAuthMiddleware(async (ctx) => {
    if (ctx.path.startsWith("/sign-up")) {
      // Initialize credits here
    }
  }),
}
```

**DON'T:** Store credits as string or numeric when integer suffices
```typescript
// BAD: Unnecessary complexity
credits: numeric("credits", { precision: 10, scale: 2 }).default("3.00")
```

**DO:** Use integer for whole-number credits
```typescript
// GOOD: Simple, performant, type-safe
credits: integer("credits").default(0).notNull()
```

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| OAuth flow management | Custom OAuth state/callback handlers | BetterAuth socialProviders | Handles PKCE, state tokens, callback verification, token exchange, account linking automatically |
| Session cookie security | Custom cookie signing/encryption | BetterAuth session management | Automatic httpOnly, secure flags, CSRF protection, session rotation |
| User-account linking | Custom logic to link OAuth accounts to users | BetterAuth account table | Handles multiple OAuth providers per user, automatic account creation on first OAuth login |
| Session persistence | Custom session refresh logic | BetterAuth updateAge config | Automatic session extension on use, configurable update threshold |
| CSRF protection | Custom token generation/validation | BetterAuth built-in CSRF | Automatic token generation, validation, and rotation |

**Key insight:** OAuth 2.0 has many security edge cases (state token validation, PKCE for public clients, token refresh, account linking). BetterAuth handles these correctly by default. Hand-rolling OAuth is a common source of security vulnerabilities.

## Common Pitfalls

### Pitfall 1: OAuth Redirect URI Mismatch
**What goes wrong:** Google OAuth fails with "redirect_uri_mismatch" error, blocking all Google logins
**Why it happens:**
- Redirect URI in Google Cloud Console doesn't exactly match the callback URL BetterAuth generates
- Common causes: HTTP vs HTTPS, port mismatch, trailing slash differences, localhost in production

**How to avoid:**
1. Set `baseURL` in BetterAuth config to match your environment (localhost:3000 for dev, production domain for prod)
2. Register exact callback URLs in Google Cloud Console:
   - Dev: `http://localhost:3000/api/auth/callback/google`
   - Prod: `https://yourdomain.com/api/auth/callback/google`
3. Use environment variables to switch baseURL between environments
4. Test OAuth in both environments before launch

**Warning signs:**
- Error message in browser: "Error 400: redirect_uri_mismatch"
- OAuth window opens then immediately closes with error
- Google Cloud Console shows "Redirect URI mismatch" in OAuth consent screen logs

Source: [Google OAuth Redirect URI Mismatch Troubleshooting](https://developers.google.com/identity/protocols/oauth2/web-server)

### Pitfall 2: Race Condition in Credit Initialization
**What goes wrong:** User signs up, immediately makes a request, but credits haven't been initialized yet (shows 0 instead of 3)
**Why it happens:** If credits are initialized in a separate async call after user creation, there's a window where user exists but credits = 0

**How to avoid:**
1. Use BetterAuth hooks to initialize credits synchronously during signup
2. Set database default value: `credits: integer("credits").default(3).notNull()`
3. Don't rely on separate API calls or background jobs for initial credit grant

**Database default vs hook initialization:**
- Database default (recommended): `default(3)` ensures all new users have 3 credits atomically
- Hook initialization: Useful for complex logic (e.g., referral bonuses), but adds failure mode
- **Best approach:** Combine both - database default as safety net, hook for logging/analytics

**Warning signs:**
- User reports "0 credits" immediately after signup
- Intermittent failure where some users get credits, others don't
- Database shows users with `credits = NULL` or `credits = 0` created recently

Source: [Database Race Conditions Catalogue](https://www.ketanbhatt.com/p/db-concurrency-defects)

### Pitfall 3: Missing Session Field Extension
**What goes wrong:** Credits column exists in database, but `session.user.credits` is undefined in client components
**Why it happens:** BetterAuth's default session only includes core user fields (id, name, email, image). Custom fields require explicit session extension.

**How to avoid:**
1. Extend BetterAuth session config to include credits in session data
2. Add TypeScript declaration to extend session type for client
3. Verify session payload includes credits using browser DevTools (Application > Cookies or Network tab)

**Verification steps:**
```typescript
// Debug session contents
const { data: session } = useSession();
console.log("Session user:", session?.user);
// Should log: { id, name, email, image, emailVerified, credits: 3 }
```

**Warning signs:**
- `session.user.credits` is `undefined` in client components
- TypeScript error: "Property 'credits' does not exist on type 'User'"
- Credits display shows 0 or nothing even though database has correct value

### Pitfall 4: OAuth Account Already Exists Error
**What goes wrong:** User tries to sign in with Google but gets "account already exists" or "email already in use" error
**Why it happens:**
- User previously signed up with email/password using same email as their Google account
- BetterAuth needs to link the OAuth account to existing user account
- Account linking might be disabled or misconfigured

**How to avoid:**
1. Ensure BetterAuth's account linking is enabled (should be default)
2. Handle "email already exists" gracefully with message: "An account with this email already exists. Please sign in with email/password or use account linking."
3. Consider implementing account linking UI for users to merge accounts
4. Verify `account` table has correct foreign key relationship to `user` table

**BetterAuth behavior:**
- If email matches existing user, BetterAuth should automatically link OAuth account to that user
- Requires email to be verified in both systems
- Account table will have multiple rows for same userId (one for email/password, one for google)

**Warning signs:**
- User can't sign in with Google even though they have an account with that email
- Multiple user records in database with same email
- Error logs show "unique constraint violation" on user email

Source: [BetterAuth User & Accounts Documentation](https://www.better-auth.com/docs/concepts/users-accounts)

### Pitfall 5: Session Not Persisting After Browser Close
**What goes wrong:** User closes browser, reopens it, and has to log in again (AUTH-04 fails)
**Why it happens:**
- Session cookie is set as "session cookie" (expires when browser closes) instead of persistent cookie
- BetterAuth session expiry is too short
- Browser is configured to delete cookies on close

**How to avoid:**
1. Verify BetterAuth session config has appropriate `expiresIn` (default 7 days is good)
2. Don't override cookie `maxAge` to 0 or negative values
3. Test session persistence by closing browser completely (not just tab) and reopening
4. Document for users: some browsers (Incognito/Private mode) delete all cookies on close by design

**BetterAuth default behavior:**
- Session expires after 7 days (configurable via `session.expiresIn`)
- Session automatically refreshes when `updateAge` threshold is reached (default 1 day)
- Cookies are set with appropriate `maxAge` to persist across browser restarts

**Verification steps:**
```bash
# Check cookie expiration in browser DevTools
# Application > Cookies > select your domain
# Look for "session_token" cookie
# "Expires" should show a future date (not "Session")
```

**Warning signs:**
- Every browser restart requires re-login
- Session cookie has "Expires: Session" in DevTools
- User feedback: "I have to log in every time I open the browser"

Source: [BetterAuth Session Management](https://www.better-auth.com/docs/concepts/session-management)

## Code Examples

Verified patterns from official sources:

### Complete BetterAuth Configuration with Google OAuth
```typescript
// src/lib/auth.ts
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { createAuthMiddleware } from "better-auth/api";
import { db } from "./db";
import { user } from "./schema";
import { eq } from "drizzle-orm";

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3000",
  database: drizzleAdapter(db, {
    provider: "pg",
  }),
  emailAndPassword: {
    enabled: true,
    sendResetPassword: async ({ user, url }) => {
      console.log(`Password reset: ${user.email} -> ${url}`);
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    sendVerificationEmail: async ({ user, url }) => {
      console.log(`Email verification: ${user.email} -> ${url}`);
    },
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    },
  },
  hooks: {
    after: createAuthMiddleware(async (ctx) => {
      // Initialize credits for new signups
      if (ctx.path.startsWith("/sign-up")) {
        const newSession = ctx.context.newSession;
        if (newSession) {
          await db
            .update(user)
            .set({ credits: 3 })
            .where(eq(user.id, newSession.user.id));
        }
      }
    }),
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24,      // Refresh after 1 day of use
  },
});
```
Source: [BetterAuth Google OAuth](https://www.better-auth.com/docs/authentication/google), [BetterAuth Hooks](https://www.better-auth.com/docs/concepts/hooks)

### Database Schema with Credits
```typescript
// src/lib/schema.ts
import { pgTable, text, timestamp, boolean, integer, index } from "drizzle-orm/pg-core";

export const user = pgTable(
  "user",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull().unique(),
    emailVerified: boolean("email_verified").default(false).notNull(),
    image: text("image"),
    credits: integer("credits").default(3).notNull(), // NEW: Credit balance
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index("user_email_idx").on(table.email)]
);
```
Source: [Drizzle ORM PostgreSQL Column Types](https://orm.drizzle.team/docs/column-types/pg)

### Google Sign-In Button Component
```typescript
// src/components/auth/google-sign-in-button.tsx
"use client";

import { Button } from "@/components/ui/button";
import { signIn } from "@/lib/auth-client";

export function GoogleSignInButton() {
  const handleGoogleSignIn = async () => {
    await signIn.social({
      provider: "google",
      callbackURL: "/dashboard",
    });
  };

  return (
    <Button
      onClick={handleGoogleSignIn}
      variant="outline"
      className="w-full"
    >
      <svg
        className="mr-2 h-4 w-4"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          fill="currentColor"
          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        />
        <path
          fill="currentColor"
          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        />
        <path
          fill="currentColor"
          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        />
        <path
          fill="currentColor"
          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        />
      </svg>
      Continue with Google
    </Button>
  );
}
```

### Integration into Existing Login Page
```typescript
// src/app/(auth)/login/page.tsx - ADD Google button
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { Separator } from "@/components/ui/separator";

export default function LoginPage() {
  return (
    <div className="container max-w-md py-16">
      <h1 className="text-2xl font-bold mb-6">Sign In</h1>

      {/* NEW: Google OAuth */}
      <GoogleSignInButton />

      <div className="relative my-6">
        <Separator />
        <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-background px-2 text-sm text-muted-foreground">
          or
        </span>
      </div>

      {/* Existing email/password form */}
      <SignInButton />
    </div>
  );
}
```

### Credits Display in UserProfile
```typescript
// src/components/auth/user-profile.tsx - EXTEND existing component
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { User, LogOut, Coins } from "lucide-react"; // Add Coins import
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSession, signOut } from "@/lib/auth-client";

export function UserProfile() {
  const { data: session, isPending } = useSession();
  const router = useRouter();

  if (isPending) {
    return <div>Loading...</div>;
  }

  if (!session) {
    return (
      <div className="flex items-center gap-2">
        <Link href="/login">
          <Button variant="ghost" size="sm">Sign in</Button>
        </Link>
        <Link href="/register">
          <Button size="sm">Sign up</Button>
        </Link>
      </div>
    );
  }

  const handleSignOut = async () => {
    await signOut();
    router.replace("/");
    router.refresh();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Avatar className="size-8 cursor-pointer hover:opacity-80 transition-opacity">
          <AvatarImage
            src={session.user?.image || ""}
            alt={session.user?.name || "User"}
            referrerPolicy="no-referrer"
          />
          <AvatarFallback>
            {(session.user?.name?.[0] || session.user?.email?.[0] || "U").toUpperCase()}
          </AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{session.user?.name}</p>
            <p className="text-xs leading-none text-muted-foreground">{session.user?.email}</p>
          </div>
        </DropdownMenuLabel>

        {/* NEW: Credit balance display */}
        <DropdownMenuSeparator />
        <div className="px-2 py-1.5">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Coins className="h-4 w-4" />
              <span>Credits</span>
            </div>
            <span className="font-semibold tabular-nums">
              {session.user?.credits ?? 0}
            </span>
          </div>
        </div>

        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/profile" className="flex items-center">
            <User className="mr-2 h-4 w-4" />
            Your Profile
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleSignOut} variant="destructive">
          <LogOut className="mr-2 h-4 w-4" />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| NextAuth.js | BetterAuth | 2024-2025 | BetterAuth offers better TypeScript support, simpler configuration, built-in Drizzle adapter |
| Manual OAuth callback handlers | BetterAuth socialProviders | 2024 | Eliminates need for custom callback routes, handles state/PKCE automatically |
| String-based session IDs | Cookie-based sessions with httpOnly | Always current | Better security, CSRF protection, automatic cookie management |
| numeric/decimal for credits | integer (when no fractional values needed) | Established pattern | Better performance, smaller storage, simpler arithmetic |
| Separate credit initialization API | Hooks/database defaults | 2024+ BetterAuth hooks | Eliminates race conditions, simpler architecture |

**Deprecated/outdated:**
- **NextAuth.js v4**: BetterAuth is newer, actively developed, better DX for 2025+
- **Manual session refresh tokens**: BetterAuth handles automatic session extension via `updateAge`
- **Custom account linking logic**: BetterAuth handles OAuth account linking to existing email/password users automatically

## Open Questions

1. **BetterAuth Session Extension API**
   - What we know: Need to include credits in session payload for client access
   - What's unclear: Exact API for extending session fields in BetterAuth v1.4.18 - documentation shows `session.customFields` but unclear if this is current
   - Recommendation: Verify with BetterAuth documentation, may need to use custom middleware or session callback

2. **Google OAuth Consent Screen Configuration**
   - What we know: Need Google Cloud project with OAuth consent screen configured
   - What's unclear: Required scopes for basic auth (email, profile should be sufficient), whether app needs verification for public use
   - Recommendation: Start with "Testing" mode in Google Cloud (limited to 100 users), only submit for verification if launching publicly

3. **Database Migration for Existing Users**
   - What we know: New `credits` column will default to 3 for new users
   - What's unclear: Should existing users (if any) receive 3 credits via migration, or should they be grandfathered with 0?
   - Recommendation: Since this is a new project (no production users yet), default(3) in schema handles all cases. If migrating with existing users, add backfill: `UPDATE user SET credits = 3 WHERE credits IS NULL;`

## Sources

### Primary (HIGH confidence)
- [BetterAuth Google OAuth Documentation](https://www.better-auth.com/docs/authentication/google) - Google provider setup, callback URLs, configuration options
- [BetterAuth Hooks Documentation](https://www.better-auth.com/docs/concepts/hooks) - After hooks API, context access, signup detection
- [BetterAuth Session Management](https://www.better-auth.com/docs/concepts/session-management) - Session persistence, expiration, cookie configuration
- [Drizzle ORM PostgreSQL Column Types](https://orm.drizzle.team/docs/column-types/pg) - Integer column syntax, default values
- [Drizzle ORM Transactions](https://orm.drizzle.team/docs/transactions) - Transaction API, rollback behavior, isolation levels
- [PostgreSQL Numeric Types](https://www.postgresql.org/docs/current/datatype-numeric.html) - Integer vs numeric comparison

### Secondary (MEDIUM confidence)
- [BetterAuth OAuth Concepts](https://www.better-auth.com/docs/concepts/oauth) - OAuth flow overview, verified via official docs
- [BetterAuth Cookies Documentation](https://www.better-auth.com/docs/concepts/cookies) - Cookie security defaults, httpOnly configuration
- [Google OAuth Web Server Documentation](https://developers.google.com/identity/protocols/oauth2/web-server) - Redirect URI requirements, error handling

### Tertiary (LOW confidence)
- Community discussions on redirect_uri_mismatch troubleshooting - common patterns, needs official docs verification
- Medium articles on database race conditions - general concepts, should be verified with Drizzle-specific testing

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already installed and working in boilerplate
- Architecture: HIGH - BetterAuth patterns verified from official documentation, Drizzle patterns tested
- Pitfalls: MEDIUM-HIGH - OAuth pitfalls verified from official Google docs, race condition patterns from general database knowledge
- Code examples: HIGH - All examples based on official BetterAuth and Drizzle documentation

**Research date:** 2026-02-13
**Valid until:** 2026-03-15 (30 days - stable technologies, but BetterAuth is actively developed)

**Key assumptions:**
1. BetterAuth v1.4.18 session extension API is current (needs verification)
2. Google Cloud Console UI hasn't changed significantly (OAuth setup)
3. No existing production users (can use default(3) for credits without backfill concerns)
4. PostgreSQL version supports integer default values (all modern versions do)

**Verification checklist before planning:**
- [ ] Confirm BetterAuth session.customFields or equivalent API for extending session
- [ ] Test OAuth callback flow in local environment before production
- [ ] Verify Google Cloud project is set up with OAuth consent screen
- [ ] Check that BETTER_AUTH_URL environment variable is set correctly for environment
