import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

// Site-visitor session (bidders / buyers) — separate from the admin cookie.
const USER_COOKIE = "albesat_user_session";
const secret = new TextEncoder().encode(
  process.env.JWT_SECRET ?? "dev_insecure_secret"
);

export type UserSession = {
  uid: string;
  name: string;
  email: string | null;
  mobile: string | null;
};

export async function createUserSession(payload: UserSession) {
  const token = await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secret);
  const store = await cookies();
  store.set(USER_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function getUserSession(): Promise<UserSession | null> {
  const store = await cookies();
  const token = store.get(USER_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload as unknown as UserSession;
  } catch {
    return null;
  }
}

export async function clearUserSession() {
  const store = await cookies();
  store.delete(USER_COOKIE);
}
