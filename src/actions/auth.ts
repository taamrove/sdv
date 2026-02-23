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
        default:
          console.error("Auth error:", error.type, error.message, error.cause);
          return { error: `Auth error: ${error.type} — ${error.message}` };
      }
    }
    // signIn redirects by throwing a NEXT_REDIRECT error — rethrow it
    throw error;
  }
}
