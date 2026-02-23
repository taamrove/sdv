import "next-auth";

declare module "next-auth" {
  interface User {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    image?: string | null;
    role: string;
    permissions: string[];
  }

  interface Session {
    user: User & {
      id: string;
      firstName: string;
      lastName: string;
      image?: string | null;
      role: string;
      permissions: string[];
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    firstName: string;
    lastName: string;
    image?: string | null;
    role: string;
    permissions: string[];
  }
}
