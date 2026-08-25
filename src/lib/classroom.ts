import { db } from "@/lib/db";

export function classroomBase(slug: string) {
  return `/class/${slug}`;
}

export async function classroomForSession(classroomId: string) {
  return db.classroom.findUniqueOrThrow({ where: { id: classroomId } });
}

export function makeClassroomSlug(name: string) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || "classroom";
}
