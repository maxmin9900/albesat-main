"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  verifyPassword,
  createSessionToken,
  setSessionCookie,
} from "@/lib/auth";

export type LoginState = { error?: string };

export async function loginAction(
  _prev: LoginState,
  formData: FormData
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Email and password are required." };
  }

  const admin = await prisma.adminUser.findUnique({ where: { email } });
  if (!admin || !admin.isActive) {
    return { error: "User not found or inactive." };
  }

  const ok = await verifyPassword(password, admin.passwordHash);
  if (!ok) {
    return { error: "Incorrect password." };
  }

  await prisma.adminUser.update({
    where: { id: admin.id },
    data: { lastLoginAt: new Date() },
  });

  const token = await createSessionToken({
    sub: admin.id,
    email: admin.email,
    name: admin.name,
    role: admin.role,
  });
  await setSessionCookie(token);

  redirect("/admin");
}
