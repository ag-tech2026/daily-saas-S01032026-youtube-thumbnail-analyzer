# Coding Conventions

**Analysis Date:** 2026-02-13

## Naming Patterns

**Files:**
- Components: `PascalCase.tsx` (e.g., `sign-in-button.tsx` for exported functions, components are PascalCase on export)
- API routes: `route.ts` (in `[route]` folders)
- Pages: `page.tsx`
- Hooks: `use-*.ts` prefix (e.g., `use-diagnostics.ts`)
- Layout files: `layout.tsx`
- Configuration: lowercase with dashes (e.g., `drizzle.config.ts`, `next.config.ts`)
- Database schema: `schema.ts`
- Library/utility files: `camelCase.ts` (e.g., `auth.ts`, `db.ts`, `utils.ts`)

**Functions:**
- camelCase throughout: `handleSubmit`, `fetchDiagnostics`, `getMessageText`, `renderMessageContent`
- Async functions: same camelCase convention
- React component functions: PascalCase (e.g., `export default function ChatPage()`)
- Helper functions within components: camelCase (e.g., `formatTimestamp`, `CopyButton`)

**Variables:**
- camelCase: `isStreaming`, `isPending`, `isCopied`, `sessionPending`
- Boolean flags: `is*` or `has*` prefix (e.g., `isPending`, `isStreaming`, `isAiReady`, `hasError`)
- Constants/configuration: UPPER_SNAKE_CASE (e.g., `STORAGE_KEY`, `statusLevel`)
- Private values in state: lowercase (e.g., `email`, `password`, `input`)

**Types:**
- Type definitions: PascalCase (e.g., `DiagnosticsResponse`, `StatusLevel`, `TextPart`)
- Exported interfaces: PascalCase
- Type aliases: PascalCase
- Generic type parameters: Single uppercase letter (T, K, V, etc.)

## Code Style

**Formatting:**
- Tool: Prettier 3.8.1
- Tab Width: 2 spaces
- Line Length: 100 characters (printWidth)
- Quotes: Double quotes (singleQuote: false)
- Trailing Commas: ES5 style
- Arrow Functions: Always include parentheses (arrowParens: "always")
- Semicolons: Required (semi: true)
- Line Endings: LF

**Linting:**
- Tool: ESLint 9.39.2
- Config: `eslint.config.mjs` with Next.js core rules
- Key Rules:
  - `react/jsx-no-target-blank`: error
  - `react-hooks/rules-of-hooks`: error
  - `react-hooks/exhaustive-deps`: warn
  - `import/order`: warn (alphabetical with groups)
  - `no-console`: warn (allow console.warn and console.error)
  - `prefer-const`: error
  - `no-var`: error
  - `eqeqeq`: error (always, except null comparisons)

## Import Organization

**Order:**
1. React and Next.js modules: `react`, `next/*`
2. External dependencies: third-party libraries
3. Internal modules: `@/*` path aliases
4. Types: `type` imports (grouped together)

**Path Aliases:**
- `@/*` maps to `./src/*`
- All internal imports use aliases: `@/components`, `@/lib`, `@/hooks`, `@/app`

**Example from codebase:**
```typescript
import { useState, useEffect, type ReactNode } from "react";
import { useChat } from "@ai-sdk/react";
import { Copy, Check, Loader2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";
import { UserProfile } from "@/components/auth/user-profile";
import { Button } from "@/components/ui/button";
import { useSession } from "@/lib/auth-client";
import type { Components } from "react-markdown";
```

## Error Handling

**Patterns:**
- Try-catch blocks for async operations: Used in form submissions and API calls
- Error state in React: `useState("")` for error messages, displayed in UI
- API errors: Return JSON error responses with status codes (400, 401, 500)
- Validation errors: Zod schema parsing with `safeParse()`, return formatted field errors
- Error logging: Console errors via `console.error()` in error boundaries
- User-friendly messages: Always provide descriptive error messages to users via toast or UI

**Examples:**
- `src/app/api/chat/route.ts`: Validates request body with Zod, returns detailed error response
- `src/app/chat/page.tsx`: Uses try-catch in async form handler, catches and displays errors
- `src/app/error.tsx`: Error boundary component logs errors and shows recovery UI
- `src/app/api/diagnostics/route.ts`: Comprehensive error handling with user-friendly messages

## Logging

**Framework:** Native `console` object

**Patterns:**
- Use `console.log()` for general information
- Use `console.warn()` for warnings (allowed by linting rules)
- Use `console.error()` for errors (allowed by linting rules)
- Suppress console in production via ESLint rule (allows warn/error only)
- Authentication logs: Log URLs to terminal for development (email verification, password reset)
- Database errors: Include helpful recovery messages

**Example from `src/lib/auth.ts`:**
```typescript
console.log(`\n${"=".repeat(60)}\nEMAIL VERIFICATION\nUser: ${user.email}\nVerification URL: ${url}\n${"=".repeat(60)}\n`)
```

## Comments

**When to Comment:**
- Intentional design decisions (e.g., why auth is public vs protected)
- Non-obvious logic (e.g., database timeout handling)
- Important configuration notes (e.g., IMPORTANT! comment in schema.ts)
- Debugging hints (e.g., "Invalid JSON, ignore" in catch blocks)

**JSDoc/TSDoc:**
- Not heavily used in this codebase
- Type information is conveyed through TypeScript types
- Component props documented via TypeScript interfaces

**Example from `src/app/api/diagnostics/route.ts`:**
```typescript
// This endpoint is intentionally public (no auth required) because it's used
// by the setup checklist on the homepage before users are logged in.
// It only returns boolean flags about configuration status, not sensitive data.
```

## Function Design

**Size:** Functions are kept relatively small and focused
- Single responsibility principle
- Average function size: 20-50 lines for components, smaller for utilities
- Large components extracted into separate components or hooks

**Parameters:**
- Prefer object parameters for functions with multiple arguments
- Use destructuring in function signatures: `({ data, loading, error })`
- TypeScript types always specified

**Return Values:**
- Functions return appropriate types (void, React.ReactNode, Promise, etc.)
- Async functions return Promises
- Components return JSX.Element or ReactNode

**Example from `src/hooks/use-diagnostics.ts`:**
```typescript
export function useDiagnostics() {
  // ... implementation ...
  return {
    data,
    loading,
    error,
    refetch: fetchDiagnostics,
    isAuthReady: Boolean(isAuthReady),
    isAiReady: Boolean(isAiReady),
  };
}
```

## Module Design

**Exports:**
- Named exports preferred over default exports (except for page components)
- Components exported as named exports in most cases
- Functions and utilities exported as named exports

**Barrel Files:**
- Not extensively used in this codebase
- Component directories import directly from specific files

**Example pattern:**
```typescript
export function SignInButton() { ... }
export function SignUpForm() { ... }
// Import with: import { SignInButton } from "@/components/auth/sign-in-button"
```

## TypeScript Usage

**Strict Mode:** Enabled with comprehensive strict options
- `strict: true` enables all strict type checking
- `noUncheckedIndexedAccess: true` requires checks on indexed access
- `noUnusedLocals: true` prevents unused variables
- `noUnusedParameters: true` prevents unused parameters
- `noImplicitReturns: true` requires explicit returns on all paths

**Type Declarations:**
- Interfaces preferred for object types
- Type aliases used for unions and primitives
- Generic types used appropriately (e.g., React.FC<Props>)

**Example from `src/app/api/diagnostics/route.ts`:**
```typescript
type StatusLevel = "ok" | "warn" | "error";

interface DiagnosticsResponse {
  timestamp: string;
  env: { POSTGRES_URL: boolean; ... };
  // ... other fields
}
```

## React & Next.js Conventions

**Components:**
- Use Client Components (`"use client"`) for interactivity and state
- Server Components default for pages and layouts
- Separate files for components vs pages

**Hooks:**
- Standard React hooks: `useState`, `useEffect`
- Custom hooks for reusable logic (e.g., `useDiagnostics`)
- BetterAuth client hooks: `useSession` from `@/lib/auth-client`

**Styling:**
- Tailwind CSS utility classes exclusively
- shadcn/ui components with built-in Tailwind styles
- `cn()` utility function for conditional class merging
- Dark mode support built-in via `next-themes`

**Form Handling:**
- Standard HTML forms with `onSubmit` handlers
- Controlled components for inputs
- Validation before submission or with Zod schemas
- Error state management in component state

**Example from `src/app/chat/page.tsx`:**
```typescript
const [copied, setCopied] = useState(false);

const handleCopy = async () => {
  try {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  } catch {
    toast.error("Failed to copy");
  }
};
```

---

*Convention analysis: 2026-02-13*
