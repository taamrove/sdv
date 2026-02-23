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
          const cause = error.cause as Error | undefined;
          const rootCause = cause?.cause as Error | undefined;
          const detail = rootCause?.message ?? cause?.message ?? error.message;
          console.error("Auth error:", error.type, detail, error.cause);
          return { error: `Auth error: ${detail}` };
        }
      }
    }
    // signIn redirects by throwing a NEXT_REDIRECT error — rethrow it
    throw error;
  }
}
