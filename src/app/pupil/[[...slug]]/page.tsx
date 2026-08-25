import { ClassLink as Link } from "@/components/class-link";
import { db } from "@/lib/db";
import { requirePupil, logout } from "@/lib/auth";
import { redirect } from "next/navigation";
import {
  requestPurchase,
  setGoal,
  cancelPurchase,
  saveAvatarDesign,
} from "@/actions";
import {
  Coins,
  Gift,
  Target,
  History,
  Trophy,
  BookOpen,
  Smile,
} from "lucide-react";
import { AvatarStudio } from "@/components/avatar-studio";
const nav = [
  ["", "My Wallet", Coins],
  ["avatar", "Avatar Studio", Smile],
  ["shop", "Reward Shop", Gift],
  ["savings", "Savings Goal", Target],
  ["history", "My History", History],
  ["class-goal", "Class Goal", Trophy],
  ["reflection", "Reflection", BookOpen],
] as const;
function Frame({
  page,
  name,
  children,
}: {
  page: string;
  name: string;
  children: React.ReactNode;
}) {
  return (
    <div className="pupil-app">
      <header>
        <b>
          <Coins color="#f2b84b" /> Brunner Bucks
        </b>
        <span>
          Hi, {name}!{" "}
          <form action={logout}>
            <button className="btn light">Log out</button>
          </form>
        </span>
      </header>
      <nav>
        {nav.map(([slug, label, Icon]) => (
          <Link
            className={page === slug ? "btn gold" : "btn light"}
            href={`/pupil/${slug}`}
            key={slug}
          >
            <Icon size={18} />
            {label}
          </Link>
        ))}
      </nav>
      <main>{children}</main>
    </div>
  );
}
export default async function PupilExperience({
  params,
}: {
  params: Promise<{ classSlug?: string; slug?: string[] }>;
}) {
  const resolvedParams = await params;
  if (!resolvedParams.classSlug) {
    const classroom = await db.classroom.findFirst({ orderBy: { name: "asc" } });
    redirect(classroom ? `/class/${classroom.slug}/pupil` : "/classrooms");
  }
  const classSlug = resolvedParams.classSlug;
  const session = await requirePupil(classSlug),
    page = resolvedParams.slug?.[0] || "",
    pupil = await db.pupil.findUniqueOrThrow({
      where: { id: session.id },
      include: {
        classroom: true,
        avatarItems: { include: { item: true } },
        savingsGoals: { where: { active: true }, include: { reward: true } },
        transactions: { orderBy: { createdAt: "desc" }, take: 30 },
        purchases: {
          include: { reward: true },
          orderBy: { createdAt: "desc" },
        },
      },
    }),
    rewards = await db.reward.findMany({
      where: { classroomId: pupil.classroomId, active: true },
      orderBy: { price: "asc" },
    }),
    goal = pupil.savingsGoals[0],
    next = await db.classMilestone.findFirst({
      where: {
        classroomId: pupil.classroomId,
        target: { gt: pupil.classroom.classWealth },
        active: true,
      },
      orderBy: { target: "asc" },
    });
  if (page === "avatar")
    return (
      <Frame page={page} name={pupil.displayName}>
        <div className="page-head">
          <div>
            <h1>Avatar Studio</h1>
            <p className="muted">
              Design your character and equip the special items you have
              unlocked.
            </p>
          </div>
        </div>
        <AvatarStudio
          name={pupil.displayName}
          initial={{
            skin: pupil.avatarSkin,
            hair: pupil.avatarHair,
            hairColor: pupil.avatarHairColor,
            eyes: pupil.avatarEyes,
            outfit: pupil.avatarOutfitId,
            accessory: pupil.avatarAccessoryId,
          }}
          owned={pupil.avatarItems.map((x) => x.item)}
          action={saveAvatarDesign}
        />
        <section className="card avatar-shop-callout">
          <div>
            <h2>Want more choices?</h2>
            <p>
              Look for avatar outfits and accessories in the Reward Shop. After
              your teacher approves one, it appears here automatically.
            </p>
          </div>
          <Link href="/pupil/shop" className="btn gold">
            Browse avatar rewards
          </Link>
        </section>
      </Frame>
    );
  if (page === "shop")
    return (
      <Frame page={page} name={pupil.displayName}>
        <div className="page-head">
          <div>
            <h1>Reward shop</h1>
            <p className="muted">
              You have <b>{pupil.balance} BB</b>. Choose something now or save
              for a bigger reward!
            </p>
          </div>
        </div>
        {["Small", "Medium", "Large"].map((tier) => (
          <section
            className={`reward-tier pupil-tier tier-${tier.toLowerCase()}`}
            key={tier}
          >
            <div className="tier-heading">
              <span className="pill">{tier}</span>
              <h2>{tier} rewards</h2>
              <p>
                {tier === "Small"
                  ? "Little rewards within easy reach."
                  : tier === "Medium"
                    ? "Special privileges worth saving for."
                    : "Big rewards for determined savers."}
              </p>
            </div>
            <div className="reward-shop-grid">
              {rewards
                .filter((r) => r.tier === tier)
                .map((r) => (
                  <div className="card reward-card" key={r.id}>
                    <div className="reward-editor-head">
                      <span className="reward-icon">
                        <Gift />
                      </span>
                      <span className="reward-price">{r.price} BB</span>
                    </div>
                    <h2>{r.name}</h2>
                    <p>{r.description}</p>
                    <div className="afford-message">
                      {pupil.balance >= r.price
                        ? `You will have ${pupil.balance - r.price} BB left.`
                        : `Save ${r.price - pupil.balance} more BB to unlock this.`}
                    </div>
                    {goal && pupil.balance >= r.price && (
                      <small>
                        Afterwards:{" "}
                        {Math.min(
                          100,
                          Math.floor(
                            ((pupil.balance - r.price) / goal.reward.price) *
                              100,
                          ),
                        )}
                        % towards {goal.reward.name}.
                      </small>
                    )}
                    <form action={requestPurchase}>
                      <input type="hidden" name="rewardId" value={r.id} />
                      <button
                        className="btn gold"
                        disabled={pupil.balance < r.price}
                      >
                        Request reward
                      </button>
                    </form>
                  </div>
                ))}
            </div>
          </section>
        ))}
      </Frame>
    );
  if (page === "savings")
    return (
      <Frame page={page} name={pupil.displayName}>
        <h1>My savings goal</h1>
        {goal ? (
          <div className="card">
            <h2>{goal.reward.name}</h2>
            <div className="progress">
              <span
                style={{
                  width: `${Math.min(100, (pupil.balance / goal.reward.price) * 100)}%`,
                }}
              />
            </div>
            <p>
              {pupil.balance} of {goal.reward.price} BB ·{" "}
              {Math.max(0, goal.reward.price - pupil.balance)} still needed
            </p>
            {pupil.balance >= goal.reward.price && (
              <h3>🎉 You reached your savings goal!</h3>
            )}
          </div>
        ) : (
          <div className="card">
            <p>Choose a reward to start saving towards.</p>
          </div>
        )}
        <form action={setGoal} className="card section-gap">
          <h2>Choose a goal</h2>
          <select className="input" name="rewardId">
            <option value="">No active goal</option>
            {rewards.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name} — {r.price} BB
              </option>
            ))}
          </select>
          <button className="btn">Update goal</button>
        </form>
      </Frame>
    );
  if (page === "history")
    return (
      <Frame page={page} name={pupil.displayName}>
        <div className="page-head">
          <div>
            <h1>My history</h1>
            <p className="muted">
              Everything you have earned and every reward you have requested.
            </p>
          </div>
        </div>
        <div className="card history-card">
          <h2>Earnings and spending</h2>
          <div className="history-list">
            {pupil.transactions.map((t) => (
              <article className="history-row" key={t.id}>
                <span
                  className={`history-amount ${t.amount > 0 ? "earned" : "spent"}`}
                >
                  {t.amount > 0 ? "+" : ""}
                  {t.amount} BB
                </span>
                <span>
                  <b>{t.reason}</b>
                  <small>{t.createdAt.toLocaleDateString()}</small>
                </span>
              </article>
            ))}
          </div>
        </div>
        <div className="card history-card section-gap">
          <h2>Reward requests</h2>
          <div className="history-list">
            {pupil.purchases.map((item) => (
              <article className="purchase-history-row" key={item.id}>
                <span>
                  <b>{item.reward.name}</b>
                  <small>{item.createdAt.toLocaleDateString()}</small>
                </span>
                <span className={`pill status-${item.status.toLowerCase()}`}>
                  {item.status}
                </span>
                {item.status === "PENDING" && (
                  <form action={cancelPurchase}>
                    <input type="hidden" name="id" value={item.id} />
                    <button className="btn light">Cancel request</button>
                  </form>
                )}
              </article>
            ))}
          </div>
        </div>
      </Frame>
    );
  if (page === "class-goal")
    return (
      <Frame page={page} name={pupil.displayName}>
        <h1>Our class goal</h1>
        <div className="card class-goal-card">
          <Trophy size={60} />
          <div className="value">
            {pupil.classroom.classWealth.toLocaleString()} BB
          </div>
          {next ? (
            <>
              <h2>{next.reward}</h2>
              <div className="progress">
                <span
                  style={{
                    width: `${(pupil.classroom.classWealth / next.target) * 100}%`,
                  }}
                />
              </div>
              <p>
                Only {next.target - pupil.classroom.classWealth} Bucks to go!
              </p>
            </>
          ) : (
            <h2>All milestones unlocked!</h2>
          )}
        </div>
      </Frame>
    );
  if (page === "reflection")
    return (
      <Frame page={page} name={pupil.displayName}>
        <h1>Monthly saving reflection</h1>
        <div className="card reflection-card">
          <p>Think about what you earned, spent and saved this month.</p>
          <label>
            What were you saving towards?
            <input className="input" />
          </label>
          <label>
            Are you happy with your choices?
            <textarea className="input" />
          </label>
          <label>
            What will you do differently next month?
            <textarea className="input" />
          </label>
          <button className="btn">Save reflection</button>
        </div>
      </Frame>
    );
  return (
    <Frame page="" name={pupil.displayName}>
      <h1>My wallet</h1>
      <div className="grid stats">
        <div className="card">
          <div className="label">Available balance</div>
          <div className="value">{pupil.balance} BB</div>
        </div>
        <div className="card">
          <div className="label">Lifetime earnings</div>
          <div className="value">{pupil.lifetimeEarnings} BB</div>
        </div>
        <div className="card">
          <div className="label">Rewards I can afford</div>
          <div className="value">
            {rewards.filter((r) => r.price <= pupil.balance).length}
          </div>
        </div>
      </div>
      {goal && (
        <div className="card section-gap">
          <h2>Saving for {goal.reward.name}</h2>
          <div className="progress">
            <span
              style={{
                width: `${Math.min(100, (pupil.balance / goal.reward.price) * 100)}%`,
              }}
            />
          </div>
          <p>{Math.max(0, goal.reward.price - pupil.balance)} Bucks to go</p>
        </div>
      )}
    </Frame>
  );
}
