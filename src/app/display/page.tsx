import { redirect } from "next/navigation";
import { db } from "@/lib/db";
export default async function LegacyDisplay(){const classroom=await db.classroom.findFirst({orderBy:{name:"asc"}});redirect(classroom?`/class/${classroom.slug}/display`:"/classrooms")}
