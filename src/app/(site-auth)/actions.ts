"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashPassword, verifyPassword } from "@/lib/auth";
import {
  createUserSession,
  clearUserSession,
} from "@/lib/user-auth";

// only allow safe internal redirect targets
function safeNext(next: unknown): string {
  const n = String(next ?? "");
  return n.startsWith("/") && !n.startsWith("//") ? n : "/";
}

/* ------------------------------ login ------------------------------ */

const loginSchema = z.object({
  identifier: z.string().trim().min(3, "Enter your email or phone number"),
  password: z.string().min(1, "Enter your password"),
});

export type LoginState = {
  error?: string;
  /** the identifier isn't registered — offer the register page */
  unregistered?: boolean;
};

export async function loginUser(
  _prev: LoginState,
  formData: FormData
): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    identifier: formData.get("identifier"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { identifier, password } = parsed.data;

  // Registration normalises an Omani mobile to +9689XXXXXXX, so a member who
  // typed "9XXXXXXX" then could not sign in with the same thing. Try the
  // identifier as given and as the normalised number.
  const bare = identifier.replace(/[\s-]/g, "");
  const asMobile = /^(\+?968)?[79]\d{7}$/.test(bare)
    ? bare.startsWith("+968")
      ? bare
      : bare.startsWith("968")
        ? `+${bare}`
        : `+968${bare}`
    : null;

  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { email: identifier.toLowerCase() },
        { mobile: bare },
        ...(asMobile ? [{ mobile: asMobile }] : []),
      ],
    },
  });

  if (!user || !user.passwordHash) {
    return {
      unregistered: true,
      error: "This email / phone number is not registered.",
    };
  }

  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) return { error: "Incorrect password. Please try again." };

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });
  await createUserSession({
    uid: user.id,
    name: user.fullName,
    email: user.email,
    mobile: user.mobile,
  });

  redirect(safeNext(formData.get("next")));
}

/* ----------------------------- register ---------------------------- */

const registerSchema = z.object({
  firstName: z.string().trim().min(2, "First name is required"),
  lastName: z.string().trim().min(2, "Last name is required"),
  // Omani mobile: 8 digits starting with 7 or 9, with an optional +968 prefix.
  // Normalised to the international form +9689XXXXXXX for storage.
  mobile: z
    .string()
    .trim()
    .transform((v) => v.replace(/[\s-]/g, ""))
    .refine((v) => /^(\+?968)?[79]\d{7}$/.test(v), {
      message: "Enter a valid Omani mobile number (+968 9XXX XXXX)",
    })
    .transform((v) =>
      v.startsWith("+968") ? v : v.startsWith("968") ? `+${v}` : `+968${v}`
    ),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  address: z.string().trim().min(4, "Please pick your location on the map"),
});

export type RegisterState = {
  error?: string;
  fieldErrors?: Record<string, string>;
};

export async function registerUser(
  _prev: RegisterState,
  formData: FormData
): Promise<RegisterState> {
  const parsed = registerSchema.safeParse(
    Object.fromEntries(formData.entries())
  );
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const i of parsed.error.issues)
      fieldErrors[String(i.path[0])] = i.message;
    return { error: "Please fix the highlighted fields.", fieldErrors };
  }
  const d = parsed.data;

  const clash = await prisma.user.findFirst({
    where: { OR: [{ email: d.email }, { mobile: d.mobile }] },
  });
  if (clash) {
    return {
      error:
        "An account with this email or phone already exists — please sign in.",
    };
  }

  await prisma.user.create({
    data: {
      fullName: `${d.firstName} ${d.lastName}`,
      mobile: d.mobile,
      email: d.email,
      passwordHash: await hashPassword(d.password),
      address: d.address,
      country: "Oman",
      kycStatus: "PENDING",
    },
  });

  // per flow: after registering, the visitor signs in with their credentials
  const next = encodeURIComponent(safeNext(formData.get("next")));
  redirect(`/login?next=${next}&registered=1`);
}

/* ----------------------------- sign out ---------------------------- */

export async function signOutUser(formData: FormData) {
  await clearUserSession();
  redirect(safeNext(formData.get("next")));
}
