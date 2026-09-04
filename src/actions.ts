"use server";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { awardBucks, approvePurchase, removeBucks } from "@/lib/economy";
import { clearLoginFailures, loginAttemptKey, loginIsLocked, recordLoginFailure, requireManagement, requirePupil, requireTeacher, setSession, unlockManagementWithPin } from "@/lib/auth";
import { classroomForSession, makeClassroomSlug } from "@/lib/classroom";
const val = (f: FormData, k: string) => String(f.get(k) || "").trim();
async function teacherPupil(id: string) {
  const session = await requireTeacher();
  const pupil = await db.pupil.findFirstOrThrow({ where: { id, classroomId: session.classroomId } });
  return { session, pupil };
}
async function teacherGroup(id: string) {
  const session = await requireTeacher();
  const group = await db.group.findFirstOrThrow({ where: { id, classroomId: session.classroomId } });
  return { session, group };
}
async function teacherReward(id: string) {
  const session = await requireTeacher();
  const reward = await db.reward.findFirstOrThrow({ where: { id, classroomId: session.classroomId } });
  return { session, reward };
}
async function teacherMilestone(id: string) {
  const session = await requireTeacher();
  const milestone = await db.classMilestone.findFirstOrThrow({ where: { id, classroomId: session.classroomId } });
  return { session, milestone };
}
export async function teacherLogin(f: FormData) {
  const classSlug = val(f, "classSlug");
  const attemptKey = await loginAttemptKey("teacher", classSlug);
  if (await loginIsLocked(attemptKey)) redirect(`/class/${classSlug}/teacher/login?error=locked`);
  const classroom = await db.classroom.findUnique({ where: { slug: classSlug } });
  const t = classroom?.active
    ? await db.teacher.findFirst({ where: { classroomId: classroom.id } })
    : null;
  if (!t || !(await bcrypt.compare(val(f, "password"), t.passwordHash))) {
    const locked = await recordLoginFailure(attemptKey);
    redirect(`/class/${classSlug}/teacher/login?error=${locked ? "locked" : "1"}`);
  }
  await clearLoginFailures(attemptKey);
  await setSession({ role: "TEACHER", id: t.id, classroomId: t.classroomId });
  redirect(`/class/${classSlug}/teacher`);
}
export async function pupilLogin(f: FormData) {
  const classSlug = val(f, "classSlug");
  const username = val(f, "username").toLowerCase();
  const attemptKey = await loginAttemptKey(`pupil:${classSlug}`, username || "unknown");
  if (await loginIsLocked(attemptKey)) redirect(`/class/${classSlug}/pupil/login?error=locked`);
  const classroom = await db.classroom.findUnique({ where: { slug: classSlug } });
  const p = await db.pupil.findFirst({
    where: {
      classroomId: classroom?.active ? classroom.id : "missing",
      username,
      archived: false,
    },
  });
  if (
    !p ||
    !/^\d{4}$/.test(val(f, "pin")) ||
    !(await bcrypt.compare(val(f, "pin"), p.pinHash))
  ) {
    const locked = await recordLoginFailure(attemptKey);
    redirect(`/class/${classSlug}/pupil/login?error=${locked ? "locked" : "1"}`);
  }
  await clearLoginFailures(attemptKey);
  await setSession({ role: "PUPIL", id: p.id, classroomId: p.classroomId });
  redirect(`/class/${classSlug}/pupil`);
}
export async function awardAction(f: FormData) {
  const session = await requireTeacher();
  const classroom = await classroomForSession(session.classroomId);
  const result=await awardBucks(
    session.classroomId,
    f.getAll("pupilId").map(String),
    Number(val(f, "amount")),
    val(f, "categoryId"),
    val(f, "note"),
  );
  revalidatePath(`/class/${classroom.slug}/teacher`);
  redirect(`/class/${classroom.slug}/teacher/award?success=1&total=${result.total}&count=${result.count}`);
}
export async function removeBucksAction(f: FormData) {
  const session = await requireTeacher();
  const classroom = await classroomForSession(session.classroomId);
  const result = await removeBucks(
    session.classroomId,
    f.getAll("pupilId").map(String),
    Number(val(f, "amount")),
    val(f, "reason"),
    val(f, "note"),
  );
  revalidatePath(`/class/${classroom.slug}/teacher`);
  revalidatePath(`/class/${classroom.slug}/teacher/pupils`);
  revalidatePath(`/class/${classroom.slug}/teacher/activity`);
  revalidatePath(`/class/${classroom.slug}/teacher/reports`);
  revalidatePath(`/class/${classroom.slug}/pupil`);
  redirect(`/class/${classroom.slug}/teacher/award?removed=1&total=${result.total}&count=${result.count}&capped=${result.capped}`);
}
export async function addPupil(f: FormData) {
  const session = await requireTeacher();
  const c = await classroomForSession(session.classroomId),
    first = val(f, "firstName"),
    pin = val(f, "pin");
  if (!first || !/^\d{4}$/.test(pin))
    throw new Error("Name and four-digit PIN required");
  await db.pupil.create({
    data: {
      classroomId: c.id,
      firstName: first,
      displayName: first,
      username: val(f, "username").toLowerCase() || first.toLowerCase(),
      pinHash: await bcrypt.hash(pin, 10),
    },
  });
  revalidatePath("/teacher/pupils");
}

export async function createClassroom(f: FormData) {
  await requireManagement();
  const name = val(f, "name");
  const schoolYear = val(f, "schoolYear");
  const teacherName = val(f, "teacherName") || "Teacher";
  const password = val(f, "password");
  if (!name || !schoolYear || password.length < 8)
    throw new Error("Class name, school year and an 8+ character teacher password are required");
  const base = makeClassroomSlug(name);
  let slug = base;
  let suffix = 2;
  while (await db.classroom.findUnique({ where: { slug } })) slug = `${base}-${suffix++}`;
  const classroom = await db.classroom.create({
    data: {
      name,
      slug,
      schoolYear,
      teachers: { create: { displayName: teacherName, passwordHash: await bcrypt.hash(password, 12) } },
      categories: {
        create: [
          { name: "Brilliant effort", icon: "Sparkles", description: "Trying hard and keeping going", defaultAmount: 5, order: 1 },
          { name: "Kindness", icon: "Heart", description: "Helping and encouraging others", defaultAmount: 5, order: 2 },
          { name: "Teamwork", icon: "Users", description: "Working brilliantly together", defaultAmount: 5, order: 3 },
        ],
      },
      milestones: {
        create: [
          { name: "First class goal", description: "The first shared class celebration.", target: 1000, reward: "Choose a class celebration" },
        ],
      },
    },
  });
  const catalogue = await db.avatarItem.findMany({ where: { active: true, eventOnly: false } });
  const avatarPrices: Record<string, [number, string]> = {
    glasses: [35, "Small"], sport: [60, "Medium"], rainbow: [75, "Medium"],
    headphones: [80, "Medium"], space: [120, "Large"], crown: [140, "Large"],
  };
  await db.reward.createMany({ data: [
    { classroomId: classroom.id, name: "Choose the class music", description: "Choose suitable music for independent working time.", price: 25, tier: "Small", category: "Classroom Privileges" },
    { classroomId: classroom.id, name: "Teacher's chair", description: "Use the teacher's chair for one lesson.", price: 50, tier: "Medium", category: "Classroom Privileges" },
    { classroomId: classroom.id, name: "Homework pass", description: "Skip one eligible homework task with teacher approval.", price: 100, tier: "Large", category: "Classroom Privileges" },
    ...catalogue.map(item => ({ classroomId: classroom.id, name: item.name, description: item.description, price: avatarPrices[item.assetKey]?.[0] || 75, tier: avatarPrices[item.assetKey]?.[1] || "Medium", category: "Avatar Collection", avatarItemId: item.id })),
  ] });
  redirect(`/classrooms/created?slug=${classroom.slug}`);
}

export async function updateClassroom(f: FormData) {
  await requireManagement();
  const id = val(f, "id");
  const name = val(f, "name");
  const schoolYear = val(f, "schoolYear");
  const teacherName = val(f, "teacherName");
  const password = val(f, "password");
  if (!name || !schoolYear || !teacherName)
    throw new Error("Classroom, school year and teacher name are required");
  if (password && password.length < 8)
    throw new Error("A replacement password must contain at least 8 characters");
  const classroom = await db.classroom.findUniqueOrThrow({ where: { id } });
  const teacher = await db.teacher.findFirst({ where: { classroomId: id }, orderBy: { createdAt: "asc" } });
  await db.$transaction([
    db.classroom.update({ where: { id }, data: { name, schoolYear } }),
    ...(teacher
      ? [db.teacher.update({ where: { id: teacher.id }, data: { displayName: teacherName, ...(password ? { passwordHash: await bcrypt.hash(password, 12) } : {}) } })]
      : [db.teacher.create({ data: { classroomId: id, displayName: teacherName, passwordHash: await bcrypt.hash(password || "change-this-password", 12) } })]),
  ]);
  revalidatePath("/classrooms");
  revalidatePath(`/class/${classroom.slug}`);
  redirect(`/classrooms?updated=${classroom.slug}`);
}

export async function setClassroomActive(f: FormData) {
  await requireManagement();
  const id = val(f, "id");
  const active = val(f, "active") === "true";
  const classroom = await db.classroom.update({ where: { id }, data: { active } });
  revalidatePath("/classrooms");
  revalidatePath(`/class/${classroom.slug}`);
  redirect(`/classrooms?${active ? "restored" : "archived"}=${classroom.slug}`);
}

export async function unlockManagement(f: FormData) {
  const result = await unlockManagementWithPin(val(f, "pin"));
  if (!result.ok) redirect(`/management-unlock?error=${result.locked ? "locked" : "invalid"}`);
  redirect("/classrooms");
}
export async function requestPurchase(f: FormData) {
  const s = await requirePupil(),
    reward = await db.reward.findFirstOrThrow({
      where: { id: val(f, "rewardId"), classroomId: s.classroomId },
    }),
    p = await db.pupil.findUniqueOrThrow({ where: { id: s.id } });
  if (!reward.active || p.balance < reward.price)
    throw new Error("Reward unavailable or unaffordable");
  const existing = await db.purchaseRequest.count({
    where: { pupilId: s.id, rewardId: reward.id, status: "PENDING" },
  });
  if (existing) throw new Error("Request already pending");
  await db.purchaseRequest.create({
    data: { pupilId: s.id, rewardId: reward.id, price: reward.price },
  });
  await db.activityLog.create({
    data: {
      classroomId: p.classroomId,
      pupilId: p.id,
      type: "PURCHASE_REQUESTED",
      description: `${p.displayName} requested ${reward.name}`,
    },
  });
  revalidatePath("/pupil/shop");
}
export async function approveAction(f: FormData) {
  const session = await requireTeacher();
  await approvePurchase(val(f, "id"), session.classroomId);
  revalidatePath("/teacher/purchases");
}
export async function rejectAction(f: FormData) {
  const session = await requireTeacher();
  await db.purchaseRequest.updateMany({
    where: { id: val(f, "id"), status: "PENDING", pupil: { classroomId: session.classroomId } },
    data: {
      status: "REJECTED",
      teacherNote: val(f, "note"),
      processedAt: new Date(),
    },
  });
  revalidatePath("/teacher/purchases");
}
export async function cancelPurchase(f: FormData) {
  const s = await requirePupil();
  await db.purchaseRequest.updateMany({
    where: { id: val(f, "id"), pupilId: s.id, status: "PENDING" },
    data: { status: "CANCELLED" },
  });
  revalidatePath("/pupil/history");
}
export async function setGoal(f: FormData) {
  const s = await requirePupil();
  await db.savingsGoal.updateMany({
    where: { pupilId: s.id, active: true },
    data: { active: false },
  });
  const id = val(f, "rewardId");
  if (id) {
    await db.reward.findFirstOrThrow({ where: { id, classroomId: s.classroomId, active: true } });
    await db.savingsGoal.create({ data: { pupilId: s.id, rewardId: id } });
  }
  revalidatePath("/pupil/savings");
}
export async function resetPin(f: FormData) {
  await teacherPupil(val(f, "id"));
  const pin = val(f, "pin");
  if (!/^\d{4}$/.test(pin)) throw new Error("Four-digit PIN required");
  await db.pupil.update({
    where: { id: val(f, "id") },
    data: { pinHash: await bcrypt.hash(pin, 10) },
  });
  revalidatePath("/teacher/pupils");
}
export async function archivePupil(f: FormData) {
  await teacherPupil(val(f, "id"));
  await db.pupil.update({
    where: { id: val(f, "id") },
    data: { archived: val(f, "archive") === "true" },
  });
  revalidatePath("/teacher/pupils");
}
export async function completeMilestone(f: FormData) {
  await teacherMilestone(val(f, "id"));
  await db.classMilestone.updateMany({
    where: { id: val(f, "id"), unlockedAt: { not: null } },
    data: { completedAt: new Date() },
  });
  revalidatePath("/teacher/milestones");
}

export async function updatePupilDetails(f: FormData) {
  const id = val(f, "id"),
    displayName = val(f, "displayName"),
    username = val(f, "username").toLowerCase();
  if (!displayName || !username)
    throw new Error("Name and username are required");
  await teacherPupil(id);
  await db.pupil.update({
    where: { id },
    data: { displayName, username, teacherNote: val(f, "teacherNote") || null },
  });
  revalidatePath(`/teacher/pupils/${id}`);
  revalidatePath("/teacher/pupils");
}
export async function createGroup(f: FormData) {
  const session = await requireTeacher();
  const c = await classroomForSession(session.classroomId),
    name = val(f, "name"),
    pupilIds = f.getAll("pupilId").map(String);
  if (!name) throw new Error("Group name required");
  const validPupils = await db.pupil.count({ where: { id: { in: pupilIds }, classroomId: c.id } });
  if (validPupils !== new Set(pupilIds).size) throw new Error("A selected pupil is not in this classroom");
  await db.group.create({
    data: {
      classroomId: c.id,
      name,
      members: { create: pupilIds.map((pupilId) => ({ pupilId })) },
    },
  });
  revalidatePath("/teacher/groups");
}
export async function updateGroup(f: FormData) {
  const id = val(f, "id"),
    name = val(f, "name"),
    pupilIds = f.getAll("pupilId").map(String);
  const { session } = await teacherGroup(id);
  const validPupils = await db.pupil.count({ where: { id: { in: pupilIds }, classroomId: session.classroomId } });
  if (validPupils !== new Set(pupilIds).size) throw new Error("A selected pupil is not in this classroom");
  await db.$transaction([
    db.group.update({ where: { id }, data: { name } }),
    db.groupMember.deleteMany({ where: { groupId: id } }),
    ...pupilIds.map((pupilId) =>
      db.groupMember.create({ data: { groupId: id, pupilId } }),
    ),
  ]);
  revalidatePath("/teacher/groups");
}
export async function deleteGroup(f: FormData) {
  await teacherGroup(val(f, "id"));
  await db.group.delete({ where: { id: val(f, "id") } });
  revalidatePath("/teacher/groups");
}
export async function removePupil(f: FormData) {
  const id = val(f, "id"),
    { pupil: ownedPupil } = await teacherPupil(id);
  if (val(f, "confirm") !== "DELETE") throw new Error("Permanent deletion must be confirmed");
  const classroom = await classroomForSession(ownedPupil.classroomId);
  await db.$transaction(async (tx) => {
    const p = await tx.pupil.findFirstOrThrow({
      where: { id: ownedPupil.id, classroomId: ownedPupil.classroomId },
    });
    const currentClassroom = await tx.classroom.findUniqueOrThrow({ where: { id: p.classroomId } });
    const wealthToRemove = Math.min(p.lifetimeEarnings, currentClassroom.classWealth);
    const correctedWealth = currentClassroom.classWealth - wealthToRemove;

    await tx.transaction.deleteMany({ where: { pupilId: p.id } });
    await tx.purchaseRequest.deleteMany({ where: { pupilId: p.id } });
    await tx.savingsGoal.deleteMany({ where: { pupilId: p.id } });
    await tx.pupilReflection.deleteMany({ where: { pupilId: p.id } });
    await tx.pupilAvatarItem.deleteMany({ where: { pupilId: p.id } });
    await tx.groupMember.deleteMany({ where: { pupilId: p.id } });
    await tx.activityLog.deleteMany({ where: { pupilId: p.id } });
    await tx.pupil.delete({ where: { id: p.id } });
    await tx.classroom.update({
      where: { id: p.classroomId },
      data: { classWealth: correctedWealth },
    });
    await tx.classMilestone.updateMany({
      where: { classroomId: p.classroomId, target: { gt: correctedWealth }, completedAt: null },
      data: { unlockedAt: null },
    });
  });
  revalidatePath(`/class/${classroom.slug}/teacher/pupils`);
  revalidatePath(`/class/${classroom.slug}/teacher/reports`);
  revalidatePath(`/class/${classroom.slug}/teacher/activity`);
  revalidatePath(`/class/${classroom.slug}/display`);
  redirect(`/class/${classroom.slug}/teacher/pupils`);
}
export async function createReward(f: FormData) {
  const session = await requireTeacher();
  const c = await classroomForSession(session.classroomId),
    price = Number(val(f, "price")),
    stockText = val(f, "stock");
  if (
    !val(f, "name") ||
    !val(f, "description") ||
    !Number.isInteger(price) ||
    price < 1
  )
    throw new Error("Valid reward details required");
  await db.reward.create({
    data: {
      classroomId: c.id,
      name: val(f, "name"),
      description: val(f, "description"),
      price,
      tier: val(f, "tier"),
      category: val(f, "category") || "Classroom Privileges",
      unlimitedStock: !stockText,
      stock: stockText ? Number(stockText) : null,
    },
  });
  revalidatePath("/teacher/shop");
  revalidatePath("/pupil/shop");
}
export async function updateReward(f: FormData) {
  const id = val(f, "id"),
    price = Number(val(f, "price")),
    stockText = val(f, "stock");
  await teacherReward(id);
  if (
    !val(f, "name") ||
    !val(f, "description") ||
    !Number.isInteger(price) ||
    price < 1
  )
    throw new Error("Valid reward details required");
  await db.reward.update({
    where: { id },
    data: {
      name: val(f, "name"),
      description: val(f, "description"),
      price,
      tier: val(f, "tier"),
      category: val(f, "category") || "Classroom Privileges",
      active: val(f, "active") === "on",
      unlimitedStock: !stockText,
      stock: stockText ? Number(stockText) : null,
    },
  });
  revalidatePath("/teacher/shop");
  revalidatePath("/pupil/shop");
}
export async function removeReward(f: FormData) {
  const id = val(f, "id"),
    { reward } = await teacherReward(id),
    used = await db.transaction.count({ where: { rewardId: id } }),
    requested = await db.purchaseRequest.count({ where: { rewardId: id } }),
    goals = await db.savingsGoal.count({ where: { rewardId: id } });
  if (reward && (used || requested || goals))
    await db.reward.update({ where: { id }, data: { active: false } });
  else await db.reward.delete({ where: { id } });
  revalidatePath("/teacher/shop");
  revalidatePath("/pupil/shop");
}
export async function createMilestone(f: FormData) {
  const session = await requireTeacher();
  const c = await classroomForSession(session.classroomId),
    target = Number(val(f, "target"));
  if (
    !val(f, "name") ||
    !val(f, "reward") ||
    !Number.isInteger(target) ||
    target < 1
  )
    throw new Error("Valid milestone required");
  await db.classMilestone.create({
    data: {
      classroomId: c.id,
      name: val(f, "name"),
      description: val(f, "description") || "A shared class celebration.",
      target,
      reward: val(f, "reward"),
    },
  });
  revalidatePath("/teacher/milestones");
  revalidatePath("/display");
}
export async function updateMilestone(f: FormData) {
  const id = val(f, "id"),
    { milestone: existing } = await teacherMilestone(id),
    target = Number(val(f, "target"));
  await db.classMilestone.update({
    where: { id },
    data: {
      name: val(f, "name"),
      description: val(f, "description"),
      reward: val(f, "reward"),
      target: existing.unlockedAt ? existing.target : target,
      active: val(f, "active") === "on",
    },
  });
  revalidatePath("/teacher/milestones");
  revalidatePath("/display");
}
export async function removeMilestone(f: FormData) {
  const id = val(f, "id"),
    { milestone: m } = await teacherMilestone(id);
  if (m.unlockedAt)
    await db.classMilestone.update({ where: { id }, data: { active: false } });
  else await db.classMilestone.delete({ where: { id } });
  revalidatePath("/teacher/milestones");
  revalidatePath("/display");
}

export async function saveAvatarDesign(f:FormData){const session=await requirePupil(),pupil=await db.pupil.findFirstOrThrow({where:{id:session.id,classroomId:session.classroomId},include:{avatarItems:{include:{item:true}}}}),outfit=val(f,"outfit")||"default",accessory=val(f,"accessory")||null,owned=new Set(pupil.avatarItems.map(x=>x.item.assetKey));if(outfit!=="default"&&!owned.has(outfit))throw new Error("That outfit is not unlocked");if(accessory&&!owned.has(accessory))throw new Error("That accessory is not unlocked");const allowed={skin:["pale","light","warm","olive","tan","deep"],hair:["short","long","bob","curly","afro","buns","spiky","mohawk"],hairColor:["black","brown","blonde","auburn","silver","blue","pink","purple"],eyes:["brown","hazel","blue","green","grey","violet"]};for(const [key,values] of Object.entries(allowed))if(!values.includes(val(f,key)))throw new Error("Invalid avatar choice");await db.pupil.update({where:{id:session.id},data:{avatarSkin:val(f,"skin"),avatarHair:val(f,"hair"),avatarHairColor:val(f,"hairColor"),avatarEyes:val(f,"eyes"),avatarOutfitId:outfit,avatarAccessoryId:accessory}});const classroom=await classroomForSession(session.classroomId);revalidatePath(`/class/${classroom.slug}/pupil`);revalidatePath(`/class/${classroom.slug}/teacher`);redirect(`/class/${classroom.slug}/pupil/avatar?saved=1`)}
export async function grantAvatarItem(f:FormData){const pupilId=val(f,"pupilId"),itemId=val(f,"itemId"),{pupil}=await teacherPupil(pupilId);await db.avatarItem.findFirstOrThrow({where:{id:itemId,eventOnly:true,active:true}});await db.pupilAvatarItem.upsert({where:{pupilId_itemId:{pupilId,itemId}},create:{pupilId,itemId,grantedBy:"TEACHER_EVENT"},update:{}});await db.activityLog.create({data:{classroomId:pupil.classroomId,pupilId,type:"AVATAR_ITEM_UNLOCKED",description:"A special avatar item was unlocked by the teacher"}});const classroom=await classroomForSession(pupil.classroomId);revalidatePath(`/class/${classroom.slug}/teacher/pupils/${pupilId}`);revalidatePath(`/class/${classroom.slug}/pupil/avatar`)}
