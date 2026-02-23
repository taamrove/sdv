"use server";

import { AuthError } from "next-auth";
import { signIn } from "@/lib/auth";

export async function loginAction(email: string, password: string) {
  try {
    await signIn("credentials", {
      email,
      password,
      redirectTo: "/dashboard",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case "CredentialsSignin":
          return { error: "Invalid email or password." };
        default: {
          // Walk the entire cause chain to find the deepest error message
          let detail = error.message;
          let current: unknown = error.cause;
          while (current && typeof current === "object") {
            const err = current as Record<string, unknown>;
            if (err.message && typeof err.message === "string") {
              detail = err.message;
            }
            current = err.cause ?? err.err ?? err.error;
          }
          console.error("Auth error:", error.type, "detail:", detail);
          return { error: `Login error: ${detail}` };
        }
      }
    }
    // signIn redirects by throwing a NEXT_REDIRECT error — rethrow it
    throw error;
  }
}
