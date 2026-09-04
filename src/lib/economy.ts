import { db } from "./db";
import { deductionResult } from "./rules";

export async function awardBucks(
  classroomId: string,
  pupilIds: string[],
  amount: number,
  categoryId: string,
  note?: string,
) {
  if (!Number.isInteger(amount) || amount < 1 || amount > 10000 || !pupilIds.length)
    throw new Error("Invalid award");
  return db.$transaction(async (tx) => {
    const pupils = await tx.pupil.findMany({
      where: { id: { in: pupilIds }, classroomId, archived: false },
    });
    if (pupils.length !== new Set(pupilIds).size) throw new Error("Pupil not found in this classroom");
    const category = await tx.earningCategory.findFirst({
      where: { id: categoryId, classroomId, active: true },
    });
    if (!category) throw new Error("Category unavailable");
    for (const pupil of pupils) {
      await tx.pupil.update({
        where: { id: pupil.id },
        data: { balance: { increment: amount }, lifetimeEarnings: { increment: amount } },
      });
      await tx.classroom.update({ where: { id: classroomId }, data: { classWealth: { increment: amount } } });
      await tx.transaction.create({
        data: {
          pupilId: pupil.id,
          classroomId,
          type: "EARNING",
          amount,
          balanceBefore: pupil.balance,
          balanceAfter: pupil.balance + amount,
          classWealthImpact: amount,
          categoryId,
          reason: category.name,
          teacherNote: note,
          createdBy: "TEACHER",
        },
      });
      await tx.activityLog.create({
        data: {
          classroomId,
          pupilId: pupil.id,
          type: "BUCKS_EARNED",
          description: `${pupil.displayName} earned ${amount} Bucks for ${category.name}`,
          amount,
        },
      });
    }
    const classroom = await tx.classroom.findUniqueOrThrow({ where: { id: classroomId } });
    await tx.classMilestone.updateMany({
      where: { classroomId, unlockedAt: null, target: { lte: classroom.classWealth } },
      data: { unlockedAt: new Date() },
    });
    return { count: pupils.length, total: amount * pupils.length };
  });
}

export async function removeBucks(
  classroomId: string,
  pupilIds: string[],
  amount: number,
  reason: string,
  note?: string,
) {
  if (!Number.isInteger(amount) || amount < 1 || amount > 10000 || !pupilIds.length)
    throw new Error("Invalid deduction");
  const cleanReason = reason.trim();
  if (cleanReason.length < 2 || cleanReason.length > 160)
    throw new Error("A short reason is required");
  return db.$transaction(async (tx) => {
    const pupils = await tx.pupil.findMany({
      where: { id: { in: pupilIds }, classroomId, archived: false },
    });
    if (pupils.length !== new Set(pupilIds).size)
      throw new Error("Pupil not found in this classroom");
    let total = 0;
    let count = 0;
    let capped = 0;
    for (const pupil of pupils) {
      const result = deductionResult(pupil.balance, amount);
      if (result.removed === 0) {
        capped++;
        continue;
      }
      if (result.removed < amount) capped++;
      await tx.pupil.update({
        where: { id: pupil.id },
        data: { balance: { decrement: result.removed } },
      });
      await tx.transaction.create({
        data: {
          pupilId: pupil.id,
          classroomId,
          type: "CORRECTION",
          amount: -result.removed,
          balanceBefore: pupil.balance,
          balanceAfter: result.balance,
          classWealthImpact: 0,
          reason: `Bucks removed: ${cleanReason}`,
          teacherNote: note?.trim() || null,
          createdBy: "TEACHER",
        },
      });
      await tx.activityLog.create({
        data: {
          classroomId,
          pupilId: pupil.id,
          type: "BUCKS_REMOVED",
          description: `${pupil.displayName} had ${result.removed} Bucks removed: ${cleanReason}`,
          amount: -result.removed,
        },
      });
      total += result.removed;
      count++;
    }
    return { count, total, capped };
  });
}

export async function approvePurchase(id: string, classroomId: string) {
  return db.$transaction(async (tx) => {
    const request = await tx.purchaseRequest.findFirst({
      where: { id, pupil: { classroomId }, reward: { classroomId } },
      include: { pupil: true, reward: { include: { avatarItem: true } } },
    });
    if (!request || request.status !== "PENDING") throw new Error("Purchase already processed");
    if (!request.reward.active) throw new Error("Reward unavailable");
    if (request.pupil.balance < request.price) throw new Error("Insufficient balance");
    if (!request.reward.unlimitedStock && (request.reward.stock ?? 0) < 1) throw new Error("Out of stock");
    await tx.pupil.update({ where: { id: request.pupilId }, data: { balance: { decrement: request.price } } });
    if (!request.reward.unlimitedStock)
      await tx.reward.update({ where: { id: request.rewardId }, data: { stock: { decrement: 1 } } });
    await tx.purchaseRequest.update({ where: { id }, data: { status: "APPROVED", processedAt: new Date() } });
    if (request.reward.avatarItem)
      await tx.pupilAvatarItem.upsert({
        where: { pupilId_itemId: { pupilId: request.pupilId, itemId: request.reward.avatarItem.id } },
        create: { pupilId: request.pupilId, itemId: request.reward.avatarItem.id, grantedBy: "PURCHASE" },
        update: {},
      });
    await tx.transaction.create({
      data: {
        pupilId: request.pupilId,
        classroomId,
        type: "PURCHASE",
        amount: -request.price,
        balanceBefore: request.pupil.balance,
        balanceAfter: request.pupil.balance - request.price,
        classWealthImpact: 0,
        rewardId: request.rewardId,
        purchaseRequestId: id,
        reason: request.reward.name,
        createdBy: "TEACHER",
      },
    });
    await tx.activityLog.create({
      data: {
        classroomId,
        pupilId: request.pupilId,
        type: request.reward.avatarItem ? "AVATAR_ITEM_UNLOCKED" : "PURCHASE_APPROVED",
        description: `${request.reward.name} approved`,
        amount: -request.price,
      },
    });
  });
}
