import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createHash, timingSafeEqual } from "node:crypto";
import { db } from "@/lib/db";

const key = () => new TextEncoder().encode(process.env.SESSION_SECRET || "");

export type Session = {
  role: "TEACHER" | "PUPIL";
  id: string;
  classroomId: string;
};

export async function setSession(data: Session) {
  const token = await new SignJWT(data)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("8h")
    .sign(key());
  (await cookies()).set("bb_session", token, {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 28800,
  });
}

export async function getSession(): Promise<Session | null> {
  try {
    const token = (await cookies()).get("bb_session")?.value;
    if (!token) return null;
    return (await jwtVerify(token, key())).payload as unknown as Session;
  } catch {
    return null;
  }
}

async function requireRole(role: Session["role"], classSlug?: string) {
  const session = await getSession();
  if (session?.role !== role || !session.classroomId) {
    redirect(classSlug ? `/class/${classSlug}/${role.toLowerCase()}/login` : "/");
  }
  if (classSlug) {
    const { db } = await import("@/lib/db");
    const classroom = await db.classroom.findUnique({ where: { slug: classSlug } });
    if (!classroom?.active || classroom.id !== session.classroomId) {
      redirect(`/class/${classSlug}/${role.toLowerCase()}/login?error=class`);
    }
  }
  return session;
}

export const requireTeacher = (classSlug?: string) => requireRole("TEACHER", classSlug);
export const requirePupil = (classSlug?: string) => requireRole("PUPIL", classSlug);

export async function logout() {
  "use server";
  (await cookies()).delete("bb_session");
  redirect("/");
}

const MANAGEMENT_COOKIE = "bb_management";
const MANAGEMENT_MAX_FAILURES = 5;
const MANAGEMENT_LOCK_MINUTES = 15;

async function managementFingerprint() {
  const requestHeaders = await headers();
  const forwarded = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim();
  const address = forwarded || requestHeaders.get("x-real-ip") || "local";
  const agent = requestHeaders.get("user-agent") || "unknown";
  return createHash("sha256").update(`${address}|${agent}|${process.env.SESSION_SECRET}`).digest("hex");
}

export async function loginAttemptKey(scope: string, identifier: string) {
  const fingerprint = await managementFingerprint();
  return createHash("sha256").update(`${scope}|${identifier.toLowerCase()}|${fingerprint}`).digest("hex");
}

export async function loginIsLocked(attemptKey: string) {
  const attempt = await db.loginAccessAttempt.findUnique({ where: { key: attemptKey } });
  return Boolean(attempt?.lockedUntil && attempt.lockedUntil > new Date());
}

export async function recordLoginFailure(attemptKey: string) {
  const attempt = await db.loginAccessAttempt.findUnique({ where: { key: attemptKey } });
  const failedCount = (attempt?.failedCount || 0) + 1;
  const lockedUntil = failedCount >= MANAGEMENT_MAX_FAILURES
    ? new Date(Date.now() + MANAGEMENT_LOCK_MINUTES * 60_000)
    : null;
  await db.loginAccessAttempt.upsert({
    where: { key: attemptKey },
    create: { key: attemptKey, failedCount: lockedUntil ? 0 : failedCount, lockedUntil },
    update: { failedCount: lockedUntil ? 0 : failedCount, lockedUntil },
  });
  return Boolean(lockedUntil);
}

export async function clearLoginFailures(attemptKey: string) {
  await db.loginAccessAttempt.deleteMany({ where: { key: attemptKey } });
}

export async function managementIsUnlocked() {
  try {
    const token = (await cookies()).get(MANAGEMENT_COOKIE)?.value;
    if (!token) return false;
    const payload = (await jwtVerify(token, key())).payload;
    return payload.role === "MANAGEMENT";
  } catch {
    return false;
  }
}

export async function requireManagement() {
  if (!(await managementIsUnlocked())) redirect("/management-unlock");
}

export async function unlockManagementWithPin(pin: string) {
  const expected = process.env.MANAGEMENT_PIN || "";
  if (!/^\d{4}$/.test(expected)) throw new Error("MANAGEMENT_PIN must be configured as four digits");
  const fingerprint = await managementFingerprint();
  const attempt = await db.managementAccessAttempt.findUnique({ where: { fingerprint } });
  const now = new Date();
  if (attempt?.lockedUntil && attempt.lockedUntil > now) return { ok: false, locked: true };
  const valid = /^\d{4}$/.test(pin) && timingSafeEqual(Buffer.from(pin), Buffer.from(expected));
  if (!valid) {
    const failedCount = (attempt?.failedCount || 0) + 1;
    const lockedUntil = failedCount >= MANAGEMENT_MAX_FAILURES
      ? new Date(Date.now() + MANAGEMENT_LOCK_MINUTES * 60_000)
      : null;
    await db.managementAccessAttempt.upsert({
      where: { fingerprint },
      create: { fingerprint, failedCount, lockedUntil },
      update: { failedCount: lockedUntil ? 0 : failedCount, lockedUntil },
    });
    return { ok: false, locked: Boolean(lockedUntil) };
  }
  await db.managementAccessAttempt.deleteMany({ where: { fingerprint } });
  const token = await new SignJWT({ role: "MANAGEMENT" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("12h")
    .sign(key());
  (await cookies()).set(MANAGEMENT_COOKIE, token, {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/classrooms",
    maxAge: 43200,
  });
  return { ok: true, locked: false };
}

export async function lockManagement() {
  "use server";
  (await cookies()).delete(MANAGEMENT_COOKIE);
  redirect("/management-unlock");
}
