import { notFound } from "next/navigation";
import { Coins, KeyRound, PartyPopper } from "lucide-react";
import { pupilLogin } from "@/actions";
import { db } from "@/lib/db";

export default async function Login({ params, searchParams }: { params: Promise<{ classSlug: string }>; searchParams: Promise<{ error?: string }> }) {
  const { classSlug } = await params;
  const [query, classroom] = await Promise.all([searchParams, db.classroom.findUnique({ where: { slug: classSlug }, include: { pupils: { where: { archived: false }, orderBy: { displayName: "asc" } } } })]);
  if (!classroom?.active) notFound();
  return <main className="login-page pupil-login"><section className="login-intro"><div className="logo-bubble"><Coins size={48}/></div><span className="eyebrow">{classroom.name}</span><h1>Ready to see<br/>your progress?</h1><p>Open your wallet and see what you can achieve next.</p><div className="login-feature"><PartyPopper/> Your next reward could be close!</div></section><form action={pupilLogin} className="login-card"><input type="hidden" name="classSlug" value={classroom.slug}/><span className="form-icon"><KeyRound/></span><h2>Welcome back!</h2><p className="muted">Choose your name and enter your secret PIN.</p>{query.error==="1"&&<p className="form-error" role="alert">Check your name and PIN, then try again.</p>}{query.error==="locked"&&<p className="form-error" role="alert">Too many incorrect attempts. Try again in 15 minutes.</p>}<label>Your name<select className="input" name="username" required><option value="">Choose your name…</option>{classroom.pupils.map(p=><option key={p.id} value={p.username}>{p.displayName}</option>)}</select></label><label>Four-digit PIN<input className="input pin-input" name="pin" inputMode="numeric" pattern="[0-9]{4}" maxLength={4} type="password" required placeholder="••••"/></label><button className="btn gold full-button">Open my wallet</button></form></main>;
}
