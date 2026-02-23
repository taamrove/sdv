"use server";

import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { z } from "zod";

const updateProfileSchema = z.object({
  name: z.string().min(1, "Name is required"),
  image: z.string().nullable().optional(),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
});

export async function getMyProfile() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      createdAt: true,
      lastLoginAt: true,
      role: { select: { name: true } },
    },
  });

  if (!user) throw new Error("User not found");
  return user;
}

export async function updateMyProfile(data: {
  name: string;
  image?: string | null;
}) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not authenticated" };

  const parsed = updateProfileSchema.safeParse(data);
  if (!parsed.success) {
    return { error: parsed.error.issues.map((i) => i.message).join(", ") };
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      name: parsed.data.name,
      ...(parsed.data.image !== undefined && { image: parsed.data.image }),
    },
  });

  return { success: true };
}

export async function updateMyImage(imageUrl: string | null) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not authenticated" };

  await prisma.user.update({
    where: { id: session.user.id },
    data: { image: imageUrl },
  });

  return { success: true };
}

export async function changeMyPassword(data: {
  currentPassword: string;
  newPassword: string;
}) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not authenticated" };

  const parsed = changePasswordSchema.safeParse(data);
  if (!parsed.success) {
    return { error: parsed.error.issues.map((i) => i.message).join(", ") };
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { passwordHash: true },
  });

  if (!user) return { error: "User not found" };

  const isValid = await bcrypt.compare(
    parsed.data.currentPassword,
    user.passwordHash
  );
  if (!isValid) return { error: "Current password is incorrect" };

  const newHash = await bcrypt.hash(parsed.data.newPassword, 12);
  await prisma.user.update({
    where: { id: session.user.id },
    data: { passwordHash: newHash },
  });

  return { success: true };
}
