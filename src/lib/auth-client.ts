import { polarClient } from "@polar-sh/better-auth"
import { createAuthClient } from "better-auth/react"

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  plugins: [polarClient()],
})

export const {
  signIn,
  signOut,
  useSession,
  getSession,
} = authClient

// Extend user type to include credits field
declare module "better-auth/react" {
  interface User {
    credits: number;
  }
}