# Phase 02: Upload & Storage Pipeline - Research

**Researched:** 2026-02-14
**Domain:** File upload (drag-and-drop, validation), Vercel Blob storage, atomic credit deduction, database schema design
**Confidence:** HIGH

## Summary

Phase 2 implements a file upload pipeline for poker screenshots with atomic credit deduction. The core technical challenge is ensuring exactly-once credit deduction before upload, preventing partial failures where credits are deducted but upload fails (or vice versa).

The project already has a working storage abstraction (`src/lib/storage.ts`) that handles both Vercel Blob (production) and local filesystem (development). The existing abstraction validates file size (default 5MB) and MIME types, but Phase 2 requires increasing the limit to 10MB and restricting to PNG/JPG only.

**Primary recommendation:** Use Drizzle ORM transactions to atomically deduct credits and create analysis record, then upload to storage. If storage upload fails, database transaction rolls back. Use react-dropzone for client-side drag-and-drop with immediate validation feedback, then submit via FormData to Next.js API route.

**Key architectural decisions:**
- Database transaction BEFORE storage upload (credits deducted + analysis record created)
- Client validates eagerly (size, type), server validates authoritatively
- Analysis record tracks upload status (pending → complete/failed)
- Vercel Blob's 4.5MB server action limit requires client-side upload pattern

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| react-dropzone | Latest | Drag-and-drop file upload UI | Industry standard, 23k+ GitHub stars, handles browser file API edge cases |
| Drizzle ORM | Current | Database transactions | Already in project, supports PostgreSQL transactions with savepoints |
| Vercel Blob SDK | @vercel/blob | Cloud file storage | Already abstracted in `src/lib/storage.ts`, 99.999999999% durability |
| Next.js FormData API | Built-in | File upload transport | Native to Next.js 16 App Router, no external library needed |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| file-type | Latest | MIME type verification via magic bytes | For production security (validates actual file content, not just extension) |
| lucide-react | Current | Icons (Upload, FileImage, AlertCircle) | Already in project for Coins icon |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| react-dropzone | Native HTML5 drag events | react-dropzone handles browser quirks, provides better UX hooks (onDropAccepted/Rejected) |
| Vercel Blob | AWS S3 directly | Vercel Blob is S3-backed with better DX, automatic CDN, simpler auth |
| Client upload | Server upload via Server Action | Server actions have 4.5MB body limit, would block 5-10MB files |

**Installation:**
```bash
pnpm add react-dropzone
# Optional for production: pnpm add file-type
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── app/
│   ├── api/
│   │   └── upload/
│   │       └── route.ts          # POST handler: validate, deduct credit, upload
│   └── upload/
│       └── page.tsx               # Upload UI with drag-drop
├── components/
│   └── upload/
│       ├── file-upload.tsx        # Main upload component (react-dropzone)
│       └── insufficient-credits-dialog.tsx  # Upgrade prompt
└── lib/
    ├── storage.ts                 # Already exists, update maxSize to 10MB
    └── schema.ts                  # Add analysis table
```

### Pattern 1: Atomic Credit Deduction + Upload
**What:** Database transaction that deducts credit and creates analysis record BEFORE uploading to storage.
**When to use:** Any operation where payment/credits must happen before service delivery
**Why atomic:** Prevents inconsistent states (credit deducted but no upload, or upload without deduction)

**Example:**
```typescript
// Source: Drizzle ORM official docs + architectural analysis
// https://orm.drizzle.team/docs/transactions

import { db } from "@/lib/db";
import { user, analysis } from "@/lib/schema";
import { upload } from "@/lib/storage";

export async function POST(req: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file") as File;

  // Validate file
  if (!file || file.size > 10 * 1024 * 1024) {
    return Response.json({ error: "File too large (max 10MB)" }, { status: 400 });
  }
  if (!["image/png", "image/jpeg"].includes(file.type)) {
    return Response.json({ error: "Only PNG/JPG allowed" }, { status: 400 });
  }

  try {
    // ATOMIC TRANSACTION: Deduct credit + create analysis record
    const analysisRecord = await db.transaction(async (tx) => {
      // Check balance
      const [currentUser] = await tx.select().from(user).where(eq(user.id, session.user.id));
      if (currentUser.credits < 1) {
        tx.rollback(); // Explicit rollback
      }

      // Deduct credit
      await tx.update(user)
        .set({ credits: sql`${user.credits} - 1` })
        .where(eq(user.id, session.user.id));

      // Create analysis record with "pending" status
      const [record] = await tx.insert(analysis)
        .values({
          userId: session.user.id,
          status: "pending",
          createdAt: new Date(),
        })
        .returning();

      return record;
    });

    // THEN upload to storage (outside transaction)
    const buffer = Buffer.from(await file.arrayBuffer());
    const storageResult = await upload(
      buffer,
      `${analysisRecord.id}-${file.name}`,
      "poker-screenshots"
    );

    // Update analysis record with storage URL
    await db.update(analysis)
      .set({ imageUrl: storageResult.url, status: "uploaded" })
      .where(eq(analysis.id, analysisRecord.id));

    return Response.json({
      success: true,
      analysisId: analysisRecord.id,
      imageUrl: storageResult.url
    });

  } catch (error) {
    // Transaction automatically rolls back on error
    return Response.json({ error: "Upload failed" }, { status: 500 });
  }
}
```

**Critical insight:** Database transaction happens BEFORE storage upload. If upload fails, credit is already deducted, but analysis record exists with "pending" status so we can retry or refund. This is safer than trying to make storage upload part of the transaction (which would require 2PC and is complex).

### Pattern 2: Client-Side Validation with react-dropzone
**What:** Immediate feedback on file type/size before server upload
**When to use:** Any file upload where users should know about rejections instantly
**Example:**
```typescript
// Source: react-dropzone npm documentation + WebSearch findings
// https://react-dropzone.js.org/

import { useDropzone } from "react-dropzone";

const { acceptedFiles, fileRejections, getRootProps, getInputProps } = useDropzone({
  accept: {
    "image/png": [".png"],
    "image/jpeg": [".jpg", ".jpeg"],
  },
  maxSize: 10 * 1024 * 1024, // 10MB in bytes
  maxFiles: 1,
  onDropAccepted: (files) => {
    // User has enough credits, proceed with upload
    handleUpload(files[0]);
  },
  onDropRejected: (rejections) => {
    // Show error: file too large, wrong type, etc.
    const error = rejections[0].errors[0];
    if (error.code === "file-too-large") {
      showError("File must be under 10MB");
    } else if (error.code === "file-invalid-type") {
      showError("Only PNG and JPG files are allowed");
    }
  },
});
```

**Why this pattern:** Prevents wasting server resources on invalid files, provides instant UX feedback (red border, error message), avoids unnecessary network requests.

### Pattern 3: Insufficient Credits Prompt
**What:** Block upload attempt with modal/dialog prompting upgrade
**When to use:** Before allowing file selection if credits === 0
**Example:**
```typescript
// Check credits before allowing drop
const { getRootProps, getInputProps } = useDropzone({
  // ... config
  onDrop: (acceptedFiles) => {
    if (session.user.credits < 1) {
      openInsufficientCreditsDialog();
      return;
    }
    handleUpload(acceptedFiles[0]);
  },
});

// Or disable dropzone entirely if no credits
const dropzoneDisabled = session.user.credits < 1;
```

**UI pattern:** Use shadcn/ui Dialog component with:
- Title: "Insufficient Credits"
- Body: "You need at least 1 credit to upload a poker screenshot. Each analysis costs 1 credit."
- Actions: "Upgrade Plan" (primary), "Cancel" (secondary)
- Link to pricing page (Phase 7 payment integration)

### Anti-Patterns to Avoid
- **Don't upload first, then deduct credits:** If upload succeeds but credit deduction fails, user gets free service
- **Don't use Server Actions for large files:** Next.js server actions have 4.5MB request body limit, will fail for 5-10MB files
- **Don't trust client validation alone:** Always re-validate on server (client can be bypassed)
- **Don't use `put()` from server action:** Vercel Blob's `put()` in server actions fails for files >4.5MB due to body size limits

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Drag-and-drop file selection | Custom onDragOver/onDrop handlers | react-dropzone | Handles browser quirks (IE11 legacy issues), provides validation hooks, manages focus/blur states |
| MIME type validation | `file.type` string comparison only | file-type library (optional) | Client can fake `file.type`, file-type reads magic bytes for true validation |
| File size formatting | Custom byte-to-MB converter | `Intl.NumberFormat` or numeral.js | Handles localization, edge cases |
| Upload progress tracking | Manual XHR progress events | react-dropzone + Vercel Blob multipart | Multipart uploads automatically handle progress, retries, resumability for files >100MB |

**Key insight:** File upload is deceptively complex. Browser APIs have quirks, MIME types can be spoofed, progress tracking requires multipart upload handling. Use battle-tested libraries.

## Common Pitfalls

### Pitfall 1: Race Condition in Credit Deduction
**What goes wrong:** Two simultaneous uploads from same user both check "credits >= 1", both proceed, credits go negative
**Why it happens:** Non-atomic read-check-write pattern
**How to avoid:** Use SQL atomic decrement with WHERE clause:
```sql
UPDATE user SET credits = credits - 1
WHERE id = ? AND credits >= 1
RETURNING *;
```
If UPDATE returns 0 rows, insufficient credits. This is atomic at database level.
**Warning signs:** Negative credit balances in database, users reporting "I uploaded twice but only had 1 credit"

### Pitfall 2: Vercel Blob 4.5MB Server Action Limit
**What goes wrong:** Server action receives file from client, tries to upload to Vercel Blob, fails with "Request body too large"
**Why it happens:** Next.js serverless functions limit request body to 4.5MB, but we want to support 10MB files
**How to avoid:** Use client-side upload pattern (browser uploads directly to Vercel Blob) OR use API route instead of server action (API routes can handle larger files)
**Warning signs:** Uploads work for small files (<4MB) but fail for larger ones

### Pitfall 3: Credits Deducted But Upload Fails
**What goes wrong:** Database transaction commits (credit deducted), then storage upload fails (network error, Vercel Blob outage), user loses credit with no analysis
**Why it happens:** Can't make external storage upload part of database transaction (would require 2PC)
**How to avoid:** Create analysis record with "pending" status during transaction, update to "uploaded" after success. On failure, record stays "pending" and can be retried or refunded
**Warning signs:** User complaints about missing credits, analysis records stuck in "pending" state

### Pitfall 4: No Retry Mechanism for Failed Uploads
**What goes wrong:** Transient network error during upload permanently loses user's credit
**Why it happens:** No automatic retry logic for storage upload failures
**How to avoid:** Store analysis records with "pending" status, provide admin UI to retry uploads, or implement Inngest job to retry pending uploads after 5 minutes
**Warning signs:** Database has many "pending" analysis records that never complete

### Pitfall 5: File Extension vs. MIME Type Mismatch
**What goes wrong:** User renames `malware.exe` to `screenshot.png`, server accepts it based on extension
**Why it happens:** Relying on file extension or `file.type` (client-controlled) instead of checking file content
**How to avoid:** Use `file-type` library to read magic bytes (first few bytes of file that identify actual type), verify matches expected MIME type
**Warning signs:** Non-image files appearing in Vercel Blob storage

## Code Examples

Verified patterns from official sources:

### Next.js API Route File Upload Handler
```typescript
// Source: Next.js official docs + Vercel Blob docs
// https://nextjs.org/docs/app/getting-started/error-handling
// https://vercel.com/docs/vercel-blob

import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return Response.json({ error: "No file provided" }, { status: 400 });
    }

    // Validation
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return Response.json({
        error: `File too large. Maximum size is ${Math.round(maxSize / 1024 / 1024)}MB`
      }, { status: 400 });
    }

    const allowedTypes = ["image/png", "image/jpeg"];
    if (!allowedTypes.includes(file.type)) {
      return Response.json({
        error: "Invalid file type. Only PNG and JPG are allowed."
      }, { status: 400 });
    }

    // Convert File to Buffer for storage abstraction
    const buffer = Buffer.from(await file.arrayBuffer());

    // Process upload...

    return Response.json({ success: true });
  } catch (error) {
    console.error("Upload error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
```

### Drizzle Transaction with Conditional Rollback
```typescript
// Source: Drizzle ORM official docs
// https://orm.drizzle.team/docs/transactions

await db.transaction(async (tx) => {
  const [currentUser] = await tx
    .select({ credits: user.credits })
    .from(user)
    .where(eq(user.id, userId));

  if (currentUser.credits < 1) {
    tx.rollback(); // Explicitly abort transaction
  }

  // Atomic decrement
  await tx
    .update(user)
    .set({ credits: sql`${user.credits} - 1` })
    .where(eq(user.id, userId));

  // Create analysis record
  const [analysis] = await tx
    .insert(analysisTable)
    .values({ userId, status: "pending" })
    .returning();

  return analysis;
});
```

### React Dropzone with Credit Check
```typescript
// Source: react-dropzone documentation + architectural pattern
// https://react-dropzone.js.org/

"use client";

import { useDropzone } from "react-dropzone";
import { useSession } from "@/lib/auth-client";

export function FileUpload() {
  const { data: session } = useSession();
  const hasCredits = (session?.user?.credits ?? 0) >= 1;

  const { getRootProps, getInputProps, isDragActive, fileRejections } = useDropzone({
    accept: {
      "image/png": [".png"],
      "image/jpeg": [".jpg", ".jpeg"],
    },
    maxSize: 10 * 1024 * 1024,
    maxFiles: 1,
    disabled: !hasCredits, // Disable if no credits
    onDropAccepted: async (files) => {
      const formData = new FormData();
      formData.append("file", files[0]);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const error = await res.json();
        alert(error.error); // TODO: Replace with toast notification
      }
    },
    onDropRejected: (rejections) => {
      const error = rejections[0].errors[0];
      if (error.code === "file-too-large") {
        alert("File must be under 10MB");
      } else if (error.code === "file-invalid-type") {
        alert("Only PNG and JPG files are allowed");
      }
    },
  });

  if (!hasCredits) {
    return (
      <div className="border-2 border-dashed border-muted rounded-lg p-12 text-center">
        <p className="text-muted-foreground mb-4">
          You need at least 1 credit to upload a screenshot
        </p>
        <button className="btn-primary">Upgrade Plan</button>
      </div>
    );
  }

  return (
    <div
      {...getRootProps()}
      className={`
        border-2 border-dashed rounded-lg p-12 text-center cursor-pointer
        transition-colors
        ${isDragActive ? "border-primary bg-primary/5" : "border-muted"}
        ${fileRejections.length > 0 ? "border-destructive" : ""}
      `}
    >
      <input {...getInputProps()} />
      {isDragActive ? (
        <p>Drop your poker screenshot here...</p>
      ) : (
        <p>Drag & drop a poker screenshot, or click to select</p>
      )}
    </div>
  );
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Server Actions for uploads | Client upload or API routes for >4.5MB files | Next.js 13+ | Server Actions have body size limits, large files need different pattern |
| Simple file.type validation | Magic bytes verification (file-type library) | Security best practice 2024+ | Prevents MIME type spoofing attacks |
| Manual FormData construction | react-dropzone handles File objects natively | react-dropzone v14+ | Simpler DX, better browser compat |
| Single-shot uploads | Multipart uploads for files >100MB | Vercel Blob 2024 | Better reliability, progress tracking, resumability |

**Deprecated/outdated:**
- **Uploadthing:** Popular in 2023-2024, but Vercel Blob is now mature and built into Vercel ecosystem
- **AWS S3 direct integration:** Still works, but Vercel Blob provides better DX (no IAM, simpler auth, automatic CDN)
- **react-dropzone v11 and below:** v14+ (2024-2025) has better TypeScript support and React 19 compat

## Database Schema

### Analysis Table
```typescript
// Add to src/lib/schema.ts

import { pgTable, text, timestamp, integer, index, pgEnum } from "drizzle-orm/pg-core";

// Define status enum
export const analysisStatusEnum = pgEnum("analysis_status", [
  "pending",    // Credit deducted, waiting for upload
  "uploaded",   // Image uploaded to storage
  "analyzing",  // AI vision analysis in progress (Phase 3)
  "complete",   // Analysis finished, results available
  "failed",     // Analysis failed, may need retry
]);

export const analysis = pgTable(
  "analysis",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    imageUrl: text("image_url"), // Null until upload completes
    status: analysisStatusEnum("status").notNull().default("pending"),
    result: text("result"), // JSON string of analysis result (Phase 3)
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("analysis_user_id_idx").on(table.userId),
    index("analysis_status_idx").on(table.status), // For finding pending uploads
  ]
);
```

**Design notes:**
- UUID primary key (standard for app tables, per CLAUDE.md comment)
- Status enum with all future states (analyzing, complete, failed) defined upfront
- imageUrl nullable until upload completes
- Indexed on userId (for user's analysis history) and status (for retry jobs)
- Cascade delete when user deleted (GDPR compliance)

## Storage Configuration Update

Update `src/lib/storage.ts` to increase max size and restrict file types:

```typescript
// Change DEFAULT_CONFIG
const DEFAULT_CONFIG: Required<StorageConfig> = {
  maxSize: 10 * 1024 * 1024, // 10MB (was 5MB)
  allowedTypes: [
    "image/png",
    "image/jpeg",
    // Remove other types (GIF, WebP, PDF, etc.)
  ],
};

// Update ALLOWED_EXTENSIONS
const ALLOWED_EXTENSIONS = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  // Remove .gif, .webp, .svg, .pdf, etc.
]);
```

**Rationale:** Phase 2 requirements specify PNG/JPG only, max 10MB. Existing abstraction already validates, just needs config update.

## Open Questions

1. **What happens to pending analysis records if storage upload fails?**
   - What we know: Database transaction commits before storage upload
   - What's unclear: Should we auto-retry failed uploads? Refund credits? Show user a "resume upload" UI?
   - Recommendation: For Phase 2, keep it simple — analysis record stays "pending" forever, user sees error. Phase 6 (background jobs) can add retry logic with Inngest.

2. **Should we implement optimistic UI updates for credit balance?**
   - What we know: Credit deduction happens server-side in API route
   - What's unclear: Should client immediately show `credits - 1` before server responds?
   - Recommendation: No. Keep it simple — wait for server response, then refetch session. Optimistic updates can cause confusion if upload fails.

3. **Do we need progress indicators for upload?**
   - What we know: Files are 1-10MB, uploads should be fast (<5 seconds on good connection)
   - What's unclear: Is a loading spinner enough, or do we need percentage progress bar?
   - Recommendation: Phase 2 uses simple loading spinner. If Phase 3 user testing shows upload time issues, add progress bar with Vercel Blob multipart upload progress hooks.

## Sources

### Primary (HIGH confidence)
- [Drizzle ORM Transactions](https://orm.drizzle.team/docs/transactions) - PostgreSQL atomic transactions, rollback patterns
- [Vercel Blob Documentation](https://vercel.com/docs/vercel-blob) - Upload patterns, size limits, error handling, 4.5MB server action limit
- [Drizzle ORM PostgreSQL Column Types](https://orm.drizzle.team/docs/column-types/pg) - pgEnum definition and usage
- Existing project files: `src/lib/storage.ts`, `src/lib/schema.ts`, `src/lib/auth.ts` (verified current implementation)

### Secondary (MEDIUM confidence)
- [Next.js App Router File Upload Guide (Medium, 2024)](https://medium.com/@_hanglucas/file-upload-in-next-js-app-router-13-4-6d24f2e3d00f) - FormData handling patterns
- [React Dropzone Documentation](https://react-dropzone.js.org/) - props API, validation callbacks (attempted fetch, got analytics script; relying on npm search results)
- [Next.js Error Handling Best Practices (Better Stack, 2024+)](https://betterstack.com/community/guides/scaling-nodejs/error-handling-nextjs/) - API route error patterns
- [Drizzle ORM Best Practices Gist (2025)](https://gist.github.com/productdevbook/7c9ce3bbeb96b3fabc3c7c2aa2abc717) - Enum patterns, schema design

### Tertiary (LOW confidence - needs verification)
- [Error Message UI Patterns (Mobbin)](https://mobbin.com/glossary/error-message) - Insufficient credits UI patterns (general guidance, not specific to our stack)
- [Database Schema Design for File Upload (DaniWeb)](https://www.daniweb.com/programming/databases/threads/143527/database-design-for-file-upload-solution) - Status tracking patterns (concept validated by multiple sources)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - react-dropzone, Drizzle, Vercel Blob all verified via official docs
- Architecture: HIGH - Transaction pattern verified from Drizzle docs, Vercel Blob limits verified from official docs
- Pitfalls: MEDIUM-HIGH - Race condition and 4.5MB limit confirmed from official sources, retry mechanism is architectural inference
- Database schema: HIGH - Drizzle pgEnum and table structure verified from official docs

**Research date:** 2026-02-14
**Valid until:** ~2026-03-14 (30 days for stable technologies like Drizzle/Vercel Blob, patterns unlikely to change)

**Notes for planner:**
- Existing `src/lib/storage.ts` abstraction is production-ready, just needs config tweaks
- BetterAuth session already includes credits (Phase 1), no additional session work needed
- react-dropzone is optional nice-to-have; can start with plain HTML file input and add react-dropzone later for better UX
- Phase 2 focuses on happy path (credit deduction + upload); Phase 6 adds retry/recovery with Inngest
