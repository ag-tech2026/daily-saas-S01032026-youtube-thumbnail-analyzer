# Testing Patterns

**Analysis Date:** 2026-02-13

## Test Framework

**Current State:** No test framework configured

This codebase does not currently have automated testing infrastructure. There are:
- No Jest or Vitest configuration files
- No test files in the `src/` directory
- No test dependencies in `package.json`
- No test npm scripts

**Recommendation for Adding Tests:**
To add testing, the following would need to be configured:
- Install testing framework: `vitest` (recommended for Next.js) or `jest`
- Install assertion library: `vitest` includes assertions, or use `@testing-library/react`
- Install mocking libraries: `@testing-library/jest-dom`, `vi` (vitest), or `jest`

## Testing Approach (Current Best Practices in Codebase)

While formal automated tests are not present, the codebase demonstrates testability through:

1. **Separation of Concerns:**
   - Logic separated into utility functions and hooks
   - Components focused on UI rendering
   - Business logic in dedicated modules (`src/lib/`)

2. **Type Safety:**
   - TypeScript strict mode catches type errors before runtime
   - Zod validation schemas for runtime validation
   - Well-defined interfaces prevent bugs

3. **Error Handling:**
   - Comprehensive error handling in API routes
   - Try-catch blocks with user-friendly messages
   - Validation with descriptive error responses

## Key Testing Areas (If Tests Were Added)

### 1. API Routes

**Files to Test:**
- `src/app/api/chat/route.ts` - Chat endpoint with authentication and streaming
- `src/app/api/diagnostics/route.ts` - System diagnostics endpoint
- `src/app/api/auth/[...all]/route.ts` - BetterAuth integration

**Testable Aspects:**
- Authentication check (returns 401 if not authenticated)
- Request validation (returns 400 for invalid JSON or schema violations)
- Environment variable handling (API key checks)
- Response format and status codes

**Example Test Structure (if implemented):**
```typescript
describe("POST /api/chat", () => {
  it("should return 401 when user is not authenticated", async () => {
    const res = await fetch("/api/chat", {
      method: "POST",
      body: JSON.stringify({ messages: [] }),
    });
    expect(res.status).toBe(401);
  });

  it("should return 400 for invalid JSON", async () => {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { Authorization: "Bearer valid-token" },
      body: "invalid json",
    });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("Invalid JSON");
  });

  it("should validate messages schema", async () => {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { Authorization: "Bearer valid-token" },
      body: JSON.stringify({ messages: [{ role: "invalid" }] }),
    });
    expect(res.status).toBe(400);
  });
});
```

### 2. React Hooks

**Hooks to Test:**
- `src/hooks/use-diagnostics.ts` - Diagnostics fetching and state management

**Testable Aspects:**
- Initial loading state
- Successful data fetching
- Error handling
- Refetch functionality
- Computed properties (`isAuthReady`, `isAiReady`)

**Example Test Structure (if implemented):**
```typescript
describe("useDiagnostics", () => {
  it("should initialize with loading state", () => {
    const { result } = renderHook(() => useDiagnostics());
    expect(result.current.loading).toBe(true);
  });

  it("should fetch diagnostics on mount", async () => {
    const { result } = renderHook(() => useDiagnostics());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toBeDefined();
  });

  it("should compute isAuthReady correctly", async () => {
    const { result } = renderHook(() => useDiagnostics());
    await waitFor(() => {
      expect(result.current.isAuthReady).toBe(
        result.current.data?.auth.configured &&
        result.current.data?.database.connected &&
        result.current.data?.database.schemaApplied
      );
    });
  });
});
```

### 3. Form Components

**Components to Test:**
- `src/components/auth/sign-in-button.tsx`
- `src/components/auth/sign-up-form.tsx`
- `src/components/auth/forgot-password-form.tsx`
- `src/components/auth/reset-password-form.tsx`

**Testable Aspects:**
- Form rendering
- Input value changes
- Form submission handling
- Error message display
- Loading states during submission
- Validation (password confirmation, password length)
- Navigation after successful submission

**Example Test Structure (if implemented):**
```typescript
describe("SignInButton", () => {
  it("should render form fields", () => {
    render(<SignInButton />);
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
  });

  it("should update input values on change", () => {
    render(<SignInButton />);
    const emailInput = screen.getByLabelText("Email") as HTMLInputElement;
    fireEvent.change(emailInput, { target: { value: "test@example.com" } });
    expect(emailInput.value).toBe("test@example.com");
  });

  it("should display error message on failed sign in", async () => {
    vi.mocked(signIn.email).mockResolvedValue({
      error: { message: "Invalid credentials" },
    });
    render(<SignInButton />);
    // ... fill form and submit ...
    await waitFor(() => {
      expect(screen.getByText("Invalid credentials")).toBeInTheDocument();
    });
  });

  it("should require email and password", () => {
    render(<SignInButton />);
    const submit = screen.getByRole("button", { name: /sign in/i });
    expect(submit).toBeInTheDocument();
    // Browser validation should prevent submission with empty fields
  });
});
```

### 4. Utility Functions

**Functions to Test:**
- `src/lib/utils.ts` - Utility functions like `cn()`

**Testable Aspects:**
- Class merging behavior
- Tailwind class conflicts handled correctly

**Example Test Structure (if implemented):**
```typescript
describe("cn utility", () => {
  it("should merge class names", () => {
    const result = cn("px-4 py-2", "text-lg");
    expect(result).toContain("px-4");
    expect(result).toContain("py-2");
    expect(result).toContain("text-lg");
  });

  it("should handle tailwind conflicts", () => {
    const result = cn("px-4", "px-6");
    expect(result).toContain("px-6"); // Later value wins
  });
});
```

### 5. Integration Tests

**Scenarios to Test:**
- Complete authentication flow: signup → login → dashboard
- Chat functionality: sending message → receiving response
- Error recovery: handling network failures gracefully

**Example Test Structure (if implemented):**
```typescript
describe("Authentication Flow", () => {
  it("should complete signup and login flow", async () => {
    // Navigate to signup
    const { container } = render(<App />);

    // Fill signup form
    fireEvent.click(screen.getByText("Sign up"));
    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "newuser@example.com" }
    });
    // ... fill rest of form ...

    // Submit and verify navigation
    fireEvent.click(screen.getByRole("button", { name: /sign up/i }));
    await waitFor(() => {
      expect(window.location.pathname).toBe("/dashboard");
    });
  });
});
```

## Mocking Patterns (If Tests Were Added)

**API/Network Mocking:**
- Use `vi.mock()` or Jest `jest.mock()`
- Mock fetch API using `fetch-mock` or `msw` (Mock Service Worker)
- Mock BetterAuth client: `vitest.mock("@/lib/auth-client")`

**Example:**
```typescript
import { vi } from "vitest";
import { signIn } from "@/lib/auth-client";

vi.mock("@/lib/auth-client", () => ({
  signIn: {
    email: vi.fn(),
  },
  useSession: vi.fn(),
}));

// In test:
vi.mocked(signIn.email).mockResolvedValue({ error: null });
```

**Component Mocking:**
- Mock child components: `vi.mock("@/components/Button")`
- Use shallow rendering for isolated component tests

**Database Mocking:**
- Mock database queries for API route tests
- Do not test database directly; test through API layer

## What NOT to Mock

1. **Router and Navigation:**
   - Use Next.js test utilities or accept navigation behavior
   - Don't mock `useRouter` unless testing routing logic specifically

2. **Styling and CSS:**
   - Tailwind classes are implementation details
   - Test behavior and structure, not class names

3. **Third-party UI Library (shadcn/ui):**
   - Trust the library works correctly
   - Mock if testing integration with your components

## Test Organization

**Recommended Structure:**
```
src/
├── __tests__/
│   ├── api/
│   │   ├── chat.test.ts
│   │   └── diagnostics.test.ts
│   ├── components/
│   │   ├── auth/
│   │   │   ├── sign-in-button.test.tsx
│   │   │   └── sign-up-form.test.tsx
│   │   └── ui/
│   └── hooks/
│       └── use-diagnostics.test.ts
│   └── lib/
│       └── utils.test.ts
├── app/
├── components/
└── lib/
```

**Naming:**
- Test files colocated in `__tests__` directories or `.test.ts/.spec.ts` suffix
- Test file names match source file names with `.test` or `.spec` suffix
- Descriptive test names using `describe` and `it` blocks

## Coverage Goals (If Tests Were Added)

**Recommended Targets:**
- Critical paths: 100% (authentication, API routes)
- Components: 80%+ (user interactions, state changes)
- Utilities: 90%+
- Overall: 70%+

**High Priority for Testing:**
1. Authentication flows (`src/app/api/auth/`)
2. API endpoints (`src/app/api/chat/`, `/diagnostics`)
3. Form validation
4. Error handling paths
5. Environment variable checks

**Lower Priority (if time-limited):**
1. Pure UI components
2. Styling variations
3. Error boundary behavior
4. Loading states

## Manual Testing Approach (Current)

Since automated tests are not configured, the codebase relies on:
1. **TypeScript type checking:** `npm run typecheck`
2. **ESLint validation:** `npm run lint`
3. **Manual testing:** Running `npm run dev` and interacting with the application
4. **Diagnostic endpoint:** `GET /api/diagnostics` provides system health checks

## Next Steps for Adding Testing

1. **Choose a testing framework:**
   - Recommendation: Vitest (better Next.js support)
   - Alternative: Jest with Next.js configuration

2. **Set up testing environment:**
   ```bash
   npm install -D vitest @testing-library/react @testing-library/jest-dom
   ```

3. **Create config file:**
   ```typescript
   // vitest.config.ts
   import { defineConfig } from "vitest/config";
   import react from "@vitejs/plugin-react";
   import path from "path";

   export default defineConfig({
     plugins: [react()],
     test: {
       globals: true,
       environment: "jsdom",
     },
     resolve: {
       alias: { "@": path.resolve(__dirname, "./src") },
     },
   });
   ```

4. **Add test scripts to package.json:**
   ```json
   {
     "test": "vitest",
     "test:ui": "vitest --ui",
     "test:coverage": "vitest --coverage"
   }
   ```

5. **Start with critical path tests:**
   - Authentication API routes
   - Form components
   - Hook logic

---

*Testing analysis: 2026-02-13*
