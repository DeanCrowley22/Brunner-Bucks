import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { Coins, GraduationCap, Monitor, Sparkles, ArrowRight, School } from "lucide-react";

export default async function ClassroomPortal({ params }: { params: Promise<{ classSlug: string }> }) {
  const { classSlug } = await params;
  const classroom = await db.classroom.findUnique({ where: { slug: classSlug }, include: { teachers: { orderBy: { createdAt: "asc" }, take: 1 } } });
  if (!classroom?.active) notFound();
  const base = `/class/${classroom.slug}`;
  const teacherName = classroom.teachers[0]?.displayName || "your teacher";
  return (
    <main className="welcome-page class-portal">
      <div className="confetti confetti-one" />
      <div className="confetti confetti-two" />
      <section className="welcome-hero">
        <div className="logo-bubble"><Coins size={52} /><Sparkles className="logo-sparkle" size={22} /></div>
        <span className="eyebrow">{classroom.schoolYear}</span>
        <h1>{classroom.name}</h1>
        <p>{teacherName}&apos;s Brunner Bucks classroom—ready to celebrate, save and grow.</p>
      </section>
      <div className="welcome-grid">
        <Link className="portal-card teacher-portal" href={`${base}/teacher/login`}><span className="portal-icon"><School /></span><span className="portal-copy"><small>For {teacherName}</small><h2>Teacher dashboard</h2><p>Award Bucks and manage this classroom.</p></span><span className="portal-link">Teacher login <ArrowRight size={18}/></span></Link>
        <Link className="portal-card pupil-portal" href={`${base}/pupil/login`}><span className="portal-icon"><GraduationCap /></span><span className="portal-copy"><small>For pupils</small><h2>Open my wallet</h2><p>See your avatar, savings and rewards.</p></span><span className="portal-link">Pupil login <ArrowRight size={18}/></span></Link>
        <Link className="portal-card display-portal" href={`${base}/display`}><span className="portal-icon"><Monitor /></span><span className="portal-copy"><small>For the whiteboard</small><h2>Class goal display</h2><p>Celebrate progress towards the next milestone.</p></span><span className="portal-link">Open display <ArrowRight size={18}/></span></Link>
      </div>
    </main>
  );
}
