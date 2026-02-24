"use client";

import { createContext, useContext, type ReactNode } from "react";

/**
 * Serializable user data passed from the server.
 * This is a plain object (no Date, no class instances) so it can cross
 * the RSC → Client Component boundary safely.
 */
export interface ServerUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  image?: string | null;
  role: string;
  permissions: string[];
}

const ServerSessionContext = createContext<ServerUser | null>(null);

export function ServerSessionProvider({
  user,
  children,
}: {
  user: ServerUser | null;
  children: ReactNode;
}) {
  return (
    <ServerSessionContext.Provider value={user}>
      {children}
    </ServerSessionContext.Provider>
  );
}

export function useServerSession() {
  return useContext(ServerSessionContext);
}
