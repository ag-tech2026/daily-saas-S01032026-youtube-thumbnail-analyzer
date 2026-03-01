import { polar, checkout, webhooks } from "@polar-sh/better-auth"
import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { eq, sql } from "drizzle-orm"
import { db } from "./db"
import { polarClient } from "./polar"
import { user, webhookEvents } from "./schema"

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
  }),
  baseURL: process.env.BETTER_AUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    },
  },
  user: {
    additionalFields: {
      credits: {
        type: "number",
        defaultValue: 3,
        input: false,
        returned: true,
      },
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7,  // 7 days
    updateAge: 60 * 60 * 24,        // Refresh after 1 day
  },
  plugins: [
    polar({
      client: polarClient,
      createCustomerOnSignUp: true,
      use: [
        checkout({
          products: [
            {
              productId: process.env.POLAR_PRODUCT_ID!,
              slug: "credits-50",
            },
          ],
          successUrl: "/dashboard?purchase=success",
          authenticatedUsersOnly: true,
        }),
        webhooks({
          secret: process.env.POLAR_WEBHOOK_SECRET!,
          onOrderPaid: async (payload) => {
            // Extract user ID from Polar customer external ID
            const userId = payload.data.customer?.externalId;
            const webhookId = payload.data.id; // Order ID for idempotency

            if (!userId) {
              console.error("No userId found in webhook payload:", payload.data);
              return;
            }

            try {
              await db.transaction(async (tx) => {
                // Check if webhook already processed (idempotency)
                const existing = await tx
                  .select()
                  .from(webhookEvents)
                  .where(eq(webhookEvents.id, webhookId))
                  .limit(1);

                if (existing.length > 0) {
                  // Webhook already processed, skip
                  return;
                }

                // Insert webhook event record
                await tx.insert(webhookEvents).values({
                  id: webhookId,
                  type: "order.paid",
                  payload: JSON.stringify(payload.data),
                });

                // Add 50 credits to user (atomic increment)
                await tx
                  .update(user)
                  .set({ credits: sql`${user.credits} + 50` })
                  .where(eq(user.id, userId));
              });
            } catch (error) {
              console.error("Error processing webhook:", error);
              throw error;
            }
          },
        }),
      ],
    }),
  ],
})