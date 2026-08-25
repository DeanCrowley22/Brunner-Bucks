import { Coins, KeyRound, LockKeyhole, ShieldCheck } from "lucide-react";
import { redirect } from "next/navigation";
import { unlockManagement } from "@/actions";
import { managementIsUnlocked } from "@/lib/auth";

export default async function ManagementUnlock({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (await managementIsUnlocked()) redirect("/classrooms");
  const query = await searchParams;
  return <main className="management-unlock"><section className="unlock-brand"><div className="logo-bubble"><Coins size={48}/></div><span className="eyebrow">Brunner Bucks staff</span><h1>School management</h1><p>Unlock the school administration area to create and maintain classrooms.</p><div className="login-feature"><ShieldCheck/> Protected staff-only access</div></section><form action={unlockManagement} className="card unlock-card"><span className="form-icon"><LockKeyhole/></span><h2>Enter the staff PIN</h2><p className="muted">Use the shared four-digit management PIN supplied to authorised staff.</p>{query.error==="invalid"&&<p className="form-error" role="alert">That PIN was not recognised.</p>}{query.error==="locked"&&<p className="form-error" role="alert">Too many incorrect attempts. This device is locked out for 15 minutes.</p>}<label>Four-digit staff PIN<div className="password-field"><KeyRound/><input className="input pin-input" name="pin" type="password" inputMode="numeric" pattern="[0-9]{4}" maxLength={4} autoComplete="off" autoFocus required placeholder="••••"/></div></label><button className="btn gold full-button">Unlock classroom management</button><small className="unlock-help">Five incorrect attempts trigger a temporary lockout.</small></form></main>;
}
