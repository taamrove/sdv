"use client";

import { SessionProvider } from "next-auth/react";

interface Props {
  children: React.ReactNode;
}

export function AuthSessionProvider({ children }: Props) {
  return (
    <SessionProvider refetchOnWindowFocus={true} refetchWhenOffline={false}>
      {children}
    </SessionProvider>
  );
}
