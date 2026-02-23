import "next-auth";

declare module "next-auth" {
  interface User {
    id: string;
    email: string;
    name: string;
    image?: string | null;
    role: string;
    permissions: string[];
  }

  interface Session {
    user: User & {
      id: string;
      image?: string | null;
      role: string;
      permissions: string[];
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    image?: string | null;
    role: string;
    permissions: string[];
  }
}
