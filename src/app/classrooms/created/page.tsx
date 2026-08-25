import Link from "next/link";
import { CheckCircle2, Copy, ArrowRight } from "lucide-react";

export default async function Created({ searchParams }: { searchParams: Promise<{ slug?: string }> }) {
  const { slug } = await searchParams;
  const href = slug ? `/class/${slug}` : "/classrooms";
  return <main className="created-classroom"><section className="card"><CheckCircle2 className="created-check"/><span className="eyebrow">Classroom ready</span><h1>Your new Brunner Bucks space is live</h1><p>Bookmark this class homepage on teacher and pupil devices:</p><code>{href}</code><div className="button-row"><Link className="btn gold" href={href}>Open classroom <ArrowRight size={17}/></Link><Link className="btn light" href="/classrooms"><Copy size={17}/> View all classroom links</Link></div></section></main>;
}
