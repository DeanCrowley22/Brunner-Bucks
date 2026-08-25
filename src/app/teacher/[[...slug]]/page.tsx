import { ClassLink as Link } from "@/components/class-link";
import { db } from "@/lib/db";
import { getSession, requireTeacher, logout } from "@/lib/auth";
import { redirect } from "next/navigation";
import {
  awardAction,
  addPupil,
  approveAction,
  rejectAction,
  resetPin,
  archivePupil,
  completeMilestone,
  updatePupilDetails,
  createGroup,
  updateGroup,
  deleteGroup,
  removePupil,
  createReward,
  updateReward,
  removeReward,
  createMilestone,
  updateMilestone,
  removeMilestone,
  grantAvatarItem,
} from "@/actions";
import {
  Coins,
  LayoutDashboard,
  Users,
  Gift,
  ShoppingCart,
  Trophy,
  Settings,
  FileText,
  Activity,
  PlusCircle,
  ArrowLeft,
  Target,
  TrendingUp,
} from "lucide-react";
import { PupilAvatar } from "@/components/pupil-avatar";
import {AwardCelebration,AwardSubmitControls} from "@/components/award-experience";
const nav = [
  ["", "Dashboard", LayoutDashboard],
  ["award", "Award Bucks", PlusCircle],
  ["pupils", "Pupils", Users],
  ["groups", "Groups", Users],
  ["shop", "Reward Shop", Gift],
  ["purchases", "Purchases", ShoppingCart],
  ["milestones", "Class Milestones", Trophy],
  ["activity", "Activity", Activity],
  ["reports", "Reports", FileText],
  ["settings", "Settings", Settings],
] as const;
async function Frame({
  page,
  children,
}: {
  page: string;
  children: React.ReactNode;
}) {
  const session = await getSession();
  const classroom = session?.classroomId
    ? await db.classroom.findUnique({ where: { id: session.classroomId } })
    : null;
  const base = classroom ? `/class/${classroom.slug}` : "";
  return (
    <div
      className="shell"
      style={{
        display: "grid",
        gridTemplateColumns: "245px 1fr",
        minHeight: "100vh",
      }}
    >
      <aside
        className="sidebar"
        style={{ background: "#10233f", color: "white", padding: 22 }}
      >
        <h2>
          <Coins color="#f2b84b" /> Brunner Bucks
        </h2>
        <nav>
          {nav.map(([slug, label, Icon]) => (
            <Link
              key={slug}
              href={`${base}/teacher/${slug}`}
              style={{
                display: "flex",
                gap: 10,
                padding: "11px 9px",
                marginBottom: 4,
                borderRadius: 10,
                background: page === slug ? "#ffffff18" : "transparent",
              }}
            >
              <Icon size={19} />
              {label}
            </Link>
          ))}
          <Link href={`${base}/display`} style={{ display: "block", padding: 10 }}>
            Classroom Display ↗
          </Link>
        </nav>
        <form action={logout}>
          <button
            className="btn light"
            style={{ marginTop: 20, width: "100%" }}
          >
            Log out
          </button>
        </form>
      </aside>
      <main className="main" style={{ padding: 34, minWidth: 0 }}>
        {children}
      </main>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="card">
      <div className="label">{label}</div>
      <div className="value">{value}</div>
    </div>
  );
}
export default async function TeacherExperience({
  params,
  searchParams,
}: {
  params: Promise<{ classSlug?: string; slug?: string[] }>;
  searchParams: Promise<{ group?: string;success?:string;total?:string;count?:string }>;
}) {
  const resolvedParams = await params;
  if (!resolvedParams.classSlug) {
    const classroom = await db.classroom.findFirst({ orderBy: { name: "asc" } });
    redirect(classroom ? `/class/${classroom.slug}/teacher` : "/classrooms");
  }
  const classSlug = resolvedParams.classSlug;
  await requireTeacher(classSlug);
  const parts = resolvedParams.slug || [],
    page = parts[0] || "",
    c = await db.classroom.findUniqueOrThrow({ where: { slug: classSlug } });
  if (page === "award") {
    const q = await searchParams,
      pupils = await db.pupil.findMany({
        where: { classroomId: c.id, archived: false },
        orderBy: { displayName: "asc" },
      }),
      cats = await db.earningCategory.findMany({
        where: { classroomId: c.id, active: true },
        orderBy: { order: "asc" },
      }),
      selected = q.group
        ? (
            await db.groupMember.findMany({
              where: { groupId: q.group, group: { classroomId: c.id } },
              select: { pupilId: true },
            })
          ).map((x) => x.pupilId)
        : [];
    return (
      <Frame page={page}>
        <AwardCelebration active={q.success==="1"} total={Number(q.total||0)} count={Number(q.count||0)}/>
        <div className="page-head">
          <div>
            <h1>Award Brunner Bucks</h1>
            <p className="muted">
              Select pupils, choose a reason and celebrate their effort.
            </p>
          </div>
        </div>
        <form action={awardAction} className="card">
          <div className="pupil-select-grid">
            {pupils.map((p) => (
              <label key={p.id} className="pupil-select">
                <input
                  type="checkbox"
                  name="pupilId"
                  value={p.id}
                  defaultChecked={selected.includes(p.id)}
                />
                <PupilAvatar name={p.displayName} skin={p.avatarSkin} hair={p.avatarHair} hairColor={p.avatarHairColor} eyes={p.avatarEyes} outfit={p.avatarOutfitId} accessory={p.avatarAccessoryId}/>
                <span>
                  <b>{p.displayName}</b>
                  <small>{p.balance} BB available</small>
                </span>
              </label>
            ))}
          </div>
          <hr />
          <div className="grid stats">
            <label>
              Amount
              <input
                className="input"
                name="amount"
                type="number"
                min="1"
                defaultValue="5"
                required
              />
            </label>
            <label>
              Reason
              <select className="input" name="categoryId">
                {cats.map((x) => (
                  <option value={x.id} key={x.id}>
                    {x.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Optional note
              <input className="input" name="note" />
            </label>
          </div>
          <AwardSubmitControls/>
        </form>
      </Frame>
    );
  }
  if (page === "pupils" && parts[1]) {
    const p = await db.pupil.findFirstOrThrow({
        where: { id: parts[1], classroomId: c.id },
        include: {
          transactions: {
            include: { category: true, reward: true },
            orderBy: { createdAt: "desc" },
          },
          purchases: {
            include: { reward: true },
            orderBy: { createdAt: "desc" },
          },
          savingsGoals: {
            include: { reward: true },
            orderBy: { createdAt: "desc" },
          },
          groupMembers: { include: { group: true } },avatarItems:{include:{item:true}},
        },
      }),
      spent = Math.abs(
        p.transactions
          .filter((t) => t.type === "PURCHASE")
          .reduce((s, t) => s + t.amount, 0),
      ),
      goal = p.savingsGoals.find((g) => g.active),eventItems=await db.avatarItem.findMany({where:{eventOnly:true,active:true},orderBy:{rarity:"asc"}});
    return (
      <Frame page="pupils">
        <Link href="/teacher/pupils" className="back-link">
          <ArrowLeft size={16} /> All pupils
        </Link>
        <section className="profile-hero card">
          <PupilAvatar
            name={p.displayName}
            size={104}
            skin={p.avatarSkin}
            hair={p.avatarHair}
            hairColor={p.avatarHairColor}
            eyes={p.avatarEyes}
            outfit={p.avatarOutfitId}
            accessory={p.avatarAccessoryId}
          />
          <div>
            <span className="pill">
              {p.archived ? "Archived" : "Active pupil"}
            </span>
            <h1>{p.displayName}</h1>
            <p className="muted">
              @{p.username} ·{" "}
              {p.groupMembers.map((x) => x.group.name).join(" · ") ||
                "No groups yet"}
            </p>
          </div>
          <div className="avatar-profile-note"><b>Custom character</b><span>{p.avatarItems.length} special items unlocked</span></div>
        </section>
        <section className="card profile-admin">
          <div>
            <h2>Account access</h2>
            <p className="muted">Reset this pupil's PIN or remove them from the active class.</p>
          </div>
          <form action={resetPin} className="profile-pin-form">
            <input type="hidden" name="id" value={p.id} />
            <label>New four-digit PIN<input className="input" name="pin" inputMode="numeric" pattern="[0-9]{4}" maxLength={4} placeholder="e.g. 4821" required /></label>
            <button className="btn light">Reset PIN</button>
          </form>
          <form action={removePupil}>
            <input type="hidden" name="id" value={p.id} />
            <button className="btn danger">Remove pupil</button>
          </form>
        </section>
        <section className="card event-unlocks"><div><span className="eyebrow">Teacher event rewards</span><h2>Unlock a rare avatar item</h2><p className="muted">Grant an event-only collectible without charging Bucks.</p></div>{eventItems.length?<form action={grantAvatarItem}><input type="hidden" name="pupilId" value={p.id}/><select className="input" name="itemId">{eventItems.map(item=><option value={item.id} key={item.id}>{item.name} · {item.rarity}</option>)}</select><button className="btn gold">Unlock item</button></form>:<p className="muted">No event-only items are configured.</p>}</section>
        <div className="grid stats profile-stats">
          <Stat label="Available balance" value={`${p.balance} BB`} />
          <Stat label="Lifetime earned" value={`${p.lifetimeEarnings} BB`} />
          <Stat label="Total spent" value={`${spent} BB`} />
          <Stat label="Rewards requested" value={String(p.purchases.length)} />
        </div>
        <div className="grid two detail-grid">
          <section className="card">
            <h2>
              <Target size={20} /> Savings
            </h2>
            {goal ? (
              <>
                <h3>{goal.reward.name}</h3>
                <div className="progress">
                  <span
                    style={{
                      width: `${Math.min(100, (p.balance / goal.reward.price) * 100)}%`,
                    }}
                  />
                </div>
                <p>
                  {p.balance} of {goal.reward.price} BB
                </p>
              </>
            ) : (
              <p className="muted">No active savings goal.</p>
            )}
          </section>
          <form action={updatePupilDetails} className="card">
            <h2>Profile details</h2>
            <input type="hidden" name="id" value={p.id} />
            <label>
              Display name
              <input
                className="input"
                name="displayName"
                defaultValue={p.displayName}
              />
            </label>
            <label>
              Username
              <input
                className="input"
                name="username"
                defaultValue={p.username}
              />
            </label>
            <label>
              Private teacher note
              <textarea
                className="input"
                name="teacherNote"
                defaultValue={p.teacherNote || ""}
              />
            </label>
            <button className="btn">Save details</button>
          </form>
        </div>
        <section className="card section-gap">
          <h2>Transaction history</h2>
          {p.transactions.map((t) => (
            <div className="activity-row" key={t.id}>
              <span
                className={`amount ${t.amount >= 0 ? "positive" : "negative"}`}
              >
                {t.amount > 0 ? "+" : ""}
                {t.amount} BB
              </span>
              <span>
                <b>{t.reason}</b>
                <small>
                  {t.createdAt.toLocaleDateString()} ·{" "}
                  {t.category?.name || t.reward?.name || t.type}
                </small>
              </span>
            </div>
          ))}
        </section>
      </Frame>
    );
  }
  if (page === "pupils") {
    const ps = await db.pupil.findMany({
      where: { classroomId: c.id },
      orderBy: { displayName: "asc" },
    });
    return (
      <Frame page={page}>
        <div className="page-head">
          <div>
            <h1>Pupils</h1>
            <p className="muted">
              Open a profile for detailed progress, avatars and history.
            </p>
          </div>
        </div>
        <div className="pupil-card-grid">
          {ps.map((p) => (
            <Link
              className="pupil-card card"
              href={`/teacher/pupils/${p.id}`}
              key={p.id}
            >
              <PupilAvatar
                name={p.displayName}
                size={62}
                skin={p.avatarSkin} hair={p.avatarHair} hairColor={p.avatarHairColor} eyes={p.avatarEyes} outfit={p.avatarOutfitId} accessory={p.avatarAccessoryId}
              />
              <div>
                <h3>{p.displayName}</h3>
                <p>
                  {p.balance} BB{" "}
                  <span className="muted">· {p.lifetimeEarnings} earned</span>
                </p>
                <span className="pill">
                  {p.archived ? "Archived" : "Active"}
                </span>
              </div>
            </Link>
          ))}
        </div>
        <form action={addPupil} className="card section-gap">
          <h2>Add a pupil</h2>
          <div className="grid stats">
            <input
              className="input"
              name="firstName"
              placeholder="First name"
              required
            />
            <input
              className="input"
              name="username"
              placeholder="Username (optional)"
            />
            <input
              className="input"
              name="pin"
              placeholder="4-digit PIN"
              pattern="[0-9]{4}"
              required
            />
          </div>
          <button className="btn">Add pupil</button>
        </form>
      </Frame>
    );
  }
  if (page === "groups") {
    const groups = await db.group.findMany({
        where: { classroomId: c.id },
        include: { members: { include: { pupil: true } } },
        orderBy: { name: "asc" },
      }),
      pupils = await db.pupil.findMany({
        where: { classroomId: c.id, archived: false },
        orderBy: { displayName: "asc" },
      });
    return (
      <Frame page={page}>
        <div className="page-head">
          <div>
            <h1>Saved groups</h1>
            <p className="muted">
              Create flexible tables, teams and working groups.
            </p>
          </div>
        </div>
        <div className="group-grid">
          {groups.map((g) => (
            <form action={updateGroup} className="card group-card" key={g.id}>
              <input type="hidden" name="id" value={g.id} />
              <input
                className="group-title-input"
                name="name"
                defaultValue={g.name}
              />
              <div className="member-picker">
                {pupils.map((p) => (
                  <label key={p.id}>
                    <input
                      type="checkbox"
                      name="pupilId"
                      value={p.id}
                      defaultChecked={g.members.some((m) => m.pupilId === p.id)}
                    />
                    <PupilAvatar
                      name={p.displayName}
                      size={32}
                      skin={p.avatarSkin} hair={p.avatarHair} hairColor={p.avatarHairColor} eyes={p.avatarEyes} outfit={p.avatarOutfitId} accessory={p.avatarAccessoryId}
                    />
                    {p.displayName}
                  </label>
                ))}
              </div>
              <div className="button-row">
                <button className="btn light">Save group</button>
                <Link
                  href={`/teacher/award?group=${g.id}`}
                  className="btn gold"
                >
                  Reward this group
                </Link>
                <button formAction={deleteGroup} className="btn danger">
                  Delete
                </button>
              </div>
            </form>
          ))}
        </div>
        <form action={createGroup} className="card section-gap">
          <h2>Create a new group</h2>
          <label>
            Group name
            <input
              className="input"
              name="name"
              placeholder="e.g. Green Table"
              required
            />
          </label>
          <div className="member-picker compact">
            {pupils.map((p) => (
              <label key={p.id}>
                <input type="checkbox" name="pupilId" value={p.id} />
                <PupilAvatar
                  name={p.displayName}
                  size={30}
                  skin={p.avatarSkin} hair={p.avatarHair} hairColor={p.avatarHairColor} eyes={p.avatarEyes} outfit={p.avatarOutfitId} accessory={p.avatarAccessoryId}
                />
                {p.displayName}
              </label>
            ))}
          </div>
          <button className="btn">Create group</button>
        </form>
      </Frame>
    );
  }
  if (page === "purchases") {
    const rs = await db.purchaseRequest.findMany({
      where: { pupil: { classroomId: c.id } },
      include: { pupil: true, reward: true },
      orderBy: { createdAt: "desc" },
    });
    return (
      <Frame page={page}>
        <h1>Purchase requests</h1>
        <div className="card" style={{ overflowX: "auto" }}>
          <table>
            <thead>
              <tr>
                <th>Pupil</th>
                <th>Reward</th>
                <th>Price</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {rs.map((r) => (
                <tr key={r.id}>
                  <td><Link className="profile-inline pupil-link" href={`/teacher/pupils/${r.pupilId}`}><PupilAvatar name={r.pupil.displayName} size={34} skin={r.pupil.avatarSkin} hair={r.pupil.avatarHair} hairColor={r.pupil.avatarHairColor} eyes={r.pupil.avatarEyes} outfit={r.pupil.avatarOutfitId} accessory={r.pupil.avatarAccessoryId}/><b>{r.pupil.displayName}</b></Link></td>
                  <td>{r.reward.name}</td>
                  <td>{r.price}</td>
                  <td>{r.status}</td>
                  <td>
                    {r.status === "PENDING" && (
                      <div style={{ display: "flex", gap: 8 }}>
                        <form action={approveAction}>
                          <input type="hidden" name="id" value={r.id} />
                          <button className="btn gold">Approve</button>
                        </form>
                        <form action={rejectAction}>
                          <input type="hidden" name="id" value={r.id} />
                          <button className="btn light">Reject</button>
                        </form>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Frame>
    );
  }
  if (page === "shop") {
    const rewards=await db.reward.findMany({where:{classroomId:c.id},orderBy:{price:"asc"}}),tiers=["Small","Medium","Large"];
    return <Frame page={page}><div className="page-head"><div><h1>Reward shop</h1><p className="muted">Add rewards and keep their descriptions and prices up to date.</p></div></div>{tiers.map(tier=><section className={`reward-tier tier-${tier.toLowerCase()}`} key={tier}><div className="tier-heading"><span className="pill">{tier}</span><h2>{tier} rewards</h2><p>{tier==="Small"?"Quick treats pupils can reach regularly.":tier==="Medium"?"Special privileges worth saving for.":"Big experiences for determined savers."}</p></div><div className="reward-admin-grid">{rewards.filter(r=>r.tier===tier).map(r=><form action={updateReward} className="card reward-editor" key={r.id}><input type="hidden" name="id" value={r.id}/><div className="reward-editor-head"><span className="reward-icon"><Gift/></span><b>{r.price} BB</b></div><label>Reward name<input className="input" name="name" defaultValue={r.name} required/></label><label>Description<textarea className="input" name="description" defaultValue={r.description} required/></label><div className="editor-row"><label>Price<input className="input" name="price" type="number" min="1" defaultValue={r.price}/></label><label>Size<select className="input" name="tier" defaultValue={r.tier}><option>Small</option><option>Medium</option><option>Large</option></select></label></div><label>Category<input className="input" name="category" defaultValue={r.category}/></label><label className="check-row"><input type="checkbox" name="active" defaultChecked={r.active}/> Available to pupils</label><div className="button-row"><button className="btn light">Save changes</button><button formAction={removeReward} className="btn danger">Remove</button></div></form>)}</div></section>)}<form action={createReward} className="card section-gap create-panel"><div><span className="eyebrow">New shop item</span><h2>Create a reward</h2></div><div className="editor-row"><label>Name<input className="input" name="name" required/></label><label>Price<input className="input" name="price" type="number" min="1" required/></label><label>Size<select className="input" name="tier"><option>Small</option><option>Medium</option><option>Large</option></select></label></div><label>Description<textarea className="input" name="description" placeholder="Tell pupils exactly what they receive." required/></label><label>Category<input className="input" name="category" defaultValue="Classroom Privileges"/></label><button className="btn gold">Add reward</button></form></Frame>;
  }
  if (page === "shop-old") {
    const rs = await db.reward.findMany({
      where: { classroomId: c.id },
      orderBy: { price: "asc" },
    });
    return (
      <Frame page={page}>
        <h1>Reward shop</h1>
        <div className="grid stats">
          {rs.map((r) => (
            <div className="card" key={r.id}>
              <Gift color="#7257c8" />
              <h2>{r.name}</h2>
              <p>{r.description}</p>
              <b>{r.price} BB</b> · <span className="pill">{r.tier}</span>
            </div>
          ))}
        </div>
      </Frame>
    );
  }
  if (page === "milestones") {
    const milestones=await db.classMilestone.findMany({where:{classroomId:c.id},orderBy:{target:"asc"}});return <Frame page={page}><div className="page-head"><div><h1>Class milestones</h1><p className="muted">Build a ladder of shared celebrations and edit future goals any time.</p></div></div><div className="milestone-admin-list">{milestones.map(m=><form action={updateMilestone} className="card milestone-editor" key={m.id}><input type="hidden" name="id" value={m.id}/><div className="milestone-number"><Trophy/><b>{m.target.toLocaleString()}</b><small>BB target</small></div><div className="milestone-fields"><div className="editor-row"><label>Name<input className="input" name="name" defaultValue={m.name}/></label><label>Class reward<input className="input" name="reward" defaultValue={m.reward}/></label><label>Target<input className="input" name="target" type="number" defaultValue={m.target} readOnly={Boolean(m.unlockedAt)}/></label></div><label>Description<input className="input" name="description" defaultValue={m.description}/></label><div className="progress"><span style={{width:`${Math.min(100,c.classWealth/m.target*100)}%`}}/></div><p>{m.unlockedAt?(m.completedAt?"Reward completed":"Unlocked — ready to celebrate!"):`${Math.max(0,m.target-c.classWealth)} Bucks remaining`}</p><div className="button-row"><button className="btn light">Save changes</button>{m.unlockedAt&&!m.completedAt&&<button formAction={completeMilestone} className="btn gold">Mark completed</button>}<button formAction={removeMilestone} className="btn danger">{m.unlockedAt?"Hide":"Remove"}</button></div></div></form>)}</div><form action={createMilestone} className="card section-gap create-panel"><div><span className="eyebrow">Next class adventure</span><h2>Create a milestone</h2></div><div className="editor-row"><label>Name<input className="input" name="name" placeholder="e.g. 15,000 Bucks" required/></label><label>Reward<input className="input" name="reward" placeholder="e.g. Class picnic" required/></label><label>Target<input className="input" name="target" type="number" min="1" required/></label></div><label>Description<input className="input" name="description" placeholder="What will the class unlock?"/></label><button className="btn gold">Add milestone</button></form></Frame>;
  }
  if (page === "milestones-old") {
    const ms = await db.classMilestone.findMany({
      where: { classroomId: c.id },
      orderBy: { target: "asc" },
    });
    return (
      <Frame page={page}>
        <h1>Class milestones</h1>
        <div className="grid">
          {ms.map((m) => (
            <div className="card" key={m.id}>
              <b>
                {m.target.toLocaleString()} BB · {m.reward}
              </b>
              <div className="progress">
                <span
                  style={{
                    width: `${Math.min(100, (c.classWealth / m.target) * 100)}%`,
                  }}
                />
              </div>
              <p>
                {m.unlockedAt
                  ? m.completedAt
                    ? "Reward completed"
                    : "Unlocked — ready to celebrate!"
                  : `${Math.max(0, m.target - c.classWealth)} Bucks remaining`}
              </p>
              {m.unlockedAt && !m.completedAt && (
                <form action={completeMilestone}>
                  <input type="hidden" name="id" value={m.id} />
                  <button className="btn gold">Mark reward completed</button>
                </form>
              )}
            </div>
          ))}
        </div>
      </Frame>
    );
  }
  if (page === "activity") {
    const a = await db.activityLog.findMany({
      where: { classroomId: c.id },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return (
      <Frame page={page}>
        <div className="page-head"><div><h1>Class activity</h1><p className="muted">A tidy timeline of awards, requests and classroom changes.</p></div></div>
        <div className="card activity-feed">
          {a.length ? (
            a.map((x) => (
              <article className="activity-entry" key={x.id}><span className="activity-dot"/><div><span className="pill">{x.type.replaceAll("_", " ")}</span><p>{x.pupilId?<Link href={`/teacher/pupils/${x.pupilId}`} className="activity-description">{x.description}</Link>:x.description}</p><time>{x.createdAt.toLocaleString()}</time></div>{x.amount!=null&&<b className={x.amount>=0?"positive":"negative"}>{x.amount>0?"+":""}{x.amount} BB</b>}</article>
            ))
          ) : (
            <p>No activity yet. Award some Bucks to begin.</p>
          )}
        </div>
      </Frame>
    );
  }
  const pupils = await db.pupil.findMany({
      where: { classroomId: c.id, archived: false },
      include: {
        transactions: { orderBy: { createdAt: "desc" } },
        savingsGoals: { where: { active: true }, include: { reward: true } },
        purchases: true,
      },
    }),
    pending = await db.purchaseRequest.count({ where: { status: "PENDING", pupil: { classroomId: c.id } } }),
    spent = await db.transaction.aggregate({
      _sum: { amount: true },
      where: { classroomId: c.id, type: "PURCHASE" },
    }),
    next = await db.classMilestone.findFirst({
      where: { classroomId: c.id, target: { gt: c.classWealth } },
      orderBy: { target: "asc" },
    });
  if (page === "reports" && parts[1] === "savings") {
    const savers = pupils.filter((p) => p.savingsGoals[0]);
    return (
      <Frame page="reports">
        <Link href="/teacher/reports" className="back-link">
          <ArrowLeft size={16} /> Reports overview
        </Link>
        <div className="page-head">
          <div>
            <h1>Active savings goals</h1>
            <p className="muted">
              What each pupil is working towards and how close they are.
            </p>
          </div>
        </div>
        <div className="pupil-card-grid">
          {savers.map((p) => {
            const goal = p.savingsGoals[0],
              percent = Math.min(
                100,
                Math.round((p.balance / goal.reward.price) * 100),
              );
            return (
              <Link
                className="card savings-card"
                href={`/teacher/pupils/${p.id}`}
                key={p.id}
              >
                <div className="profile-inline">
                  <PupilAvatar name={p.displayName} skin={p.avatarSkin} hair={p.avatarHair} hairColor={p.avatarHairColor} eyes={p.avatarEyes} outfit={p.avatarOutfitId} accessory={p.avatarAccessoryId}/>
                  <div>
                    <h3>{p.displayName}</h3>
                    <p>{goal.reward.name}</p>
                  </div>
                  <b>{percent}%</b>
                </div>
                <div className="progress">
                  <span style={{ width: `${percent}%` }} />
                </div>
                <small>
                  {p.balance} of {goal.reward.price} BB ·{" "}
                  {Math.max(0, goal.reward.price - p.balance)} to go
                </small>
              </Link>
            );
          })}
        </div>
      </Frame>
    );
  }
  if (page === "reports")
    return (
      <Frame page={page}>
        <div className="page-head">
          <div>
            <h1>Class reports</h1>
            <p className="muted">
              A clearer view of earning, spending and saving.
            </p>
          </div>
        </div>
        <div className="grid stats">
          <Stat label="Lifetime class wealth" value={`${c.classWealth} BB`} />
          <Link href="/teacher/pupils" className="card stat-link"><div className="label">Current balances</div><div className="value">{pupils.reduce((s,p)=>s+p.balance,0)} BB</div><span>View pupils →</span></Link>
          <Link href="/teacher/activity" className="card stat-link"><div className="label">Total spent</div><div className="value">{Math.abs(spent._sum.amount||0)} BB</div><span>View activity →</span></Link>
          <Link href="/teacher/reports/savings" className="card stat-link">
            <div className="label">Active savings goals</div>
            <div className="value">
              {pupils.reduce((s, p) => s + p.savingsGoals.length, 0)}
            </div>
            <span>View pupil goals →</span>
          </Link>
        </div>
        <div className="grid two detail-grid">
          <section className="card">
            <h2>
              <TrendingUp size={20} /> Class snapshot
            </h2>
            <div className="report-list">
              <span>
                <b>
                  {pupils.reduce(
                    (s, p) =>
                      s +
                      p.transactions.filter((t) => t.type === "EARNING").length,
                    0,
                  )}
                </b>{" "}
                earning awards
              </span>
              <span>
                <b>
                  {pupils.reduce(
                    (s, p) =>
                      s +
                      p.purchases.filter(
                        (x) =>
                          x.status === "APPROVED" || x.status === "FULFILLED",
                      ).length,
                    0,
                  )}
                </b>{" "}
                approved rewards
              </span>
              <span>
                <b>{pending}</b> requests awaiting review
              </span>
              <span>
                <b>{pupils.filter((p) => p.purchases.length === 0).length}</b>{" "}
                pupils yet to request a reward
              </span>
            </div>
          </section>
          <section className="card">
            <h2>
              <Target size={20} /> Saving habits
            </h2>
            <p>
              <b>
                {pupils.filter((p) => p.savingsGoals.length > 0).length} of{" "}
                {pupils.length}
              </b>{" "}
              pupils have an active goal.
            </p>
            <Link href="/teacher/reports/savings" className="btn light">
              Explore savings goals
            </Link>
          </section>
        </div>
        <div className="card section-gap table-card">
          <table>
            <thead>
              <tr>
                <th>Pupil</th>
                <th>Balance</th>
                <th>Lifetime earned</th>
                <th>Total spent</th>
                <th>Savings goal</th>
                <th>Last award</th>
              </tr>
            </thead>
            <tbody>
              {pupils.map((p) => (
                <tr key={p.id}>
                  <td>
                    <Link
                      className="profile-inline"
                      href={`/teacher/pupils/${p.id}`}
                    >
                      <PupilAvatar
                        name={p.displayName}
                        size={34}
                        skin={p.avatarSkin} hair={p.avatarHair} hairColor={p.avatarHairColor} eyes={p.avatarEyes} outfit={p.avatarOutfitId} accessory={p.avatarAccessoryId}
                      />
                      <b>{p.displayName}</b>
                    </Link>
                  </td>
                  <td>{p.balance} BB</td>
                  <td>{p.lifetimeEarnings} BB</td>
                  <td>
                    {Math.abs(
                      p.transactions
                        .filter((t) => t.type === "PURCHASE")
                        .reduce((s, t) => s + t.amount, 0),
                    )}{" "}
                    BB
                  </td>
                  <td>{p.savingsGoals[0]?.reward.name || "—"}</td>
                  <td>
                    {p.transactions
                      .find((t) => t.type === "EARNING")
                      ?.createdAt.toLocaleDateString() || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Frame>
    );
  if (page === "settings")
    return (
      <Frame page={page}>
        <h1>Settings & local data</h1>
        <div className="card">
          <h2>{c.name}</h2>
          <p>School year: {c.schoolYear}</p>
          <p>
            Currency: {c.currencyPlural} ({c.abbreviation})
          </p>
          <h3>Local backup</h3>
          <p className="muted">
            Stop the app and copy <code>prisma/dev.db</code>. Restore by
            replacing that file while the app is stopped.
          </p>
          <h3>New school year</h3>
          <p>
            Export a backup before resetting. Historical financial records are
            never silently deleted.
          </p>
        </div>
      </Frame>
    );
  const weekAgo = new Date(Date.now() - 7 * 86400000),
    unrecognised = pupils.filter(
      (p) => !p.transactions.some((t) => t.createdAt > weekAgo),
    ).length;
  return (
    <Frame page="">
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 15,
          flexWrap: "wrap",
        }}
      >
        <div>
          <h1>Good morning 👋</h1>
          <p className="muted">
            Here is how your classroom economy is growing.
          </p>
        </div>
        <Link href="/teacher/award" className="btn gold">
          Award Brunner Bucks
        </Link>
      </div>
      <div className="grid stats">
        <Stat label="Class Wealth Total" value={`${c.classWealth} BB`} />
        <Stat
          label="Current pupil balances"
          value={`${pupils.reduce((s, p) => s + p.balance, 0)} BB`}
        />
        <Stat label="Pending purchases" value={`${pending}`} />
        <Stat label="Active pupils" value={`${pupils.length}`} />
      </div>
      <div
        className="grid two"
        style={{ gridTemplateColumns: "2fr 1fr", marginTop: 18 }}
      >
        <div className="card">
          <h2>Next class milestone</h2>
          {next ? (
            <>
              <h3>{next.reward}</h3>
              <div className="progress">
                <span
                  style={{ width: `${(c.classWealth / next.target) * 100}%` }}
                />
              </div>
              <p>
                {c.classWealth.toLocaleString()} of{" "}
                {next.target.toLocaleString()} · {next.target - c.classWealth}{" "}
                to go
              </p>
            </>
          ) : (
            <p>Every milestone has been unlocked!</p>
          )}
        </div>
        <div className="card">
          <h2>Gentle fairness reminder</h2>
          <p>
            {unrecognised} pupils have not received Bucks this week. Consider
            opportunities to recognise their effort.
          </p>
        </div>
      </div>
    </Frame>
  );
}
