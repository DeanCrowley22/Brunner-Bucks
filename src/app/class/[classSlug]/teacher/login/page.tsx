import { notFound } from "next/navigation";
import { Coins, LockKeyhole, Sparkles } from "lucide-react";
import { teacherLogin } from "@/actions";
import { db } from "@/lib/db";

export default async function Login({ params, searchParams }: { params: Promise<{ classSlug: string }>; searchParams: Promise<{ error?: string }> }) {
  const { classSlug } = await params;
  const [query, classroom] = await Promise.all([searchParams, db.classroom.findUnique({ where: { slug: classSlug }, include: { teachers: { orderBy: { createdAt: "asc" }, take: 1 } } })]);
  if (!classroom?.active) notFound();
  const teacherName=classroom.teachers[0]?.displayName||"Teacher";
  return <main className="login-page teacher-login"><section className="login-intro"><div className="logo-bubble"><Coins size={48}/></div><span className="eyebrow">{classroom.name}</span><h1>Welcome back,<br/>{teacherName}!</h1><p>Your classroom is ready for another brilliant day.</p><div className="login-feature"><Sparkles/> Celebrate effort, kindness and teamwork</div></section><form action={teacherLogin} className="login-card"><input type="hidden" name="classSlug" value={classroom.slug}/><span className="form-icon"><LockKeyhole/></span><h2>{teacherName}&apos;s login</h2><p className="muted">Enter your password for {classroom.name}.</p>{query.error==="1"&&<p className="form-error" role="alert">That password was not recognised.</p>}{query.error==="locked"&&<p className="form-error" role="alert">Too many incorrect attempts. Try again in 15 minutes.</p>}<label>Password<input className="input" name="password" type="password" required autoFocus placeholder="Your password"/></label><button className="btn gold full-button">Open my teacher dashboard</button></form></main>;
}
