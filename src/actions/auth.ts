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
          // Dump the full error structure for debugging
          const causeStr = JSON.stringify(error.cause, Object.getOwnPropertyNames(error.cause ?? {}), 2);
          console.error("Auth full error:", error.type, error.message, "cause:", causeStr);
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
          return { error: `Login error [${error.type}]: ${detail} | cause keys: ${Object.keys(error.cause ?? {}).join(",")}` };
        }
      }
    }
    // signIn redirects by throwing a NEXT_REDIRECT error — rethrow it
    throw error;
  }
}
