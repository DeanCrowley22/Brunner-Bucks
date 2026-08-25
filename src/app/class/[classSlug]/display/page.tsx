import { notFound } from "next/navigation";
import { Coins, Sparkles, Trophy } from "lucide-react";
import { db } from "@/lib/db";
import { DisplayControls } from "@/components/display-controls";

export default async function Display({ params }: { params: Promise<{ classSlug: string }> }) {
  const { classSlug } = await params;
  const classroom = await db.classroom.findUnique({ where: { slug: classSlug } });
  if (!classroom?.active) notFound();
  const next = await db.classMilestone.findFirst({ where: { classroomId: classroom.id, target: { gt: classroom.classWealth }, active: true }, orderBy: { target: "asc" } });
  const unlocked = await db.classMilestone.findMany({ where: { classroomId: classroom.id, unlockedAt: { not: null }, active: true }, orderBy: { target: "desc" }, take: 3 });
  return <main className="class-display"><DisplayControls homeHref={`/class/${classroom.slug}`} /><div className="display-orb orb-one"/><div className="display-orb orb-two"/><section className="display-content"><div className="display-logo"><Coins/><Sparkles/></div><span className="display-eyebrow">{classroom.name} is building something brilliant</span><h1>Class Wealth</h1><div className="display-wealth">{classroom.classWealth.toLocaleString()} <small>BB</small></div>{next?<section className="display-goal"><Trophy/><div><span>Next class reward</span><h2>{next.reward}</h2></div><div className="display-progress"><span style={{width:`${Math.min(100,classroom.classWealth/next.target*100)}%`}}/></div><p><b>{(next.target-classroom.classWealth).toLocaleString()} Bucks</b> to go <small>· Target {next.target.toLocaleString()}</small></p></section>:<section className="display-goal complete"><Trophy/><h2>Every class milestone is unlocked!</h2></section>}{unlocked.length>0&&<div className="recent-unlocks"><span>Recently unlocked</span>{unlocked.map(x=><b key={x.id}>{x.reward}</b>)}</div>}</section></main>;
}
