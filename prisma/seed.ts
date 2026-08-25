import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
const db = new PrismaClient();
async function main() {
  await db.activityLog.deleteMany();
  await db.transaction.deleteMany();
  await db.savingsGoal.deleteMany();
  await db.purchaseRequest.deleteMany();
  await db.groupMember.deleteMany();
  await db.group.deleteMany();
  await db.pupilReflection.deleteMany();
  await db.classMilestone.deleteMany();
  await db.reward.deleteMany();
  await db.earningCategory.deleteMany();
  await db.pupil.deleteMany();
  await db.teacher.deleteMany();
  await db.classroom.deleteMany();
  const classroom = await db.classroom.create({
    data: { name: "Ms. Hennessy's 6th Class", slug: "brunner-class", schoolYear: "2026/27" },
  });
  await db.teacher.create({
    data: {
      classroomId: classroom.id,
      displayName: "Ms. Hennessy",
      passwordHash: await bcrypt.hash("teacher123", 12),
    },
  });
  const categoryNames = [
    "Excellent Effort",
    "Kindness",
    "Teamwork",
    "Classroom Job",
    "Homework",
    "Improvement",
    "Participation",
    "Organisation",
    "Helping Others",
    "Positive Attitude",
  ];
  const categories = [];
  for (let i = 0; i < categoryNames.length; i++)
    categories.push(
      await db.earningCategory.create({
        data: {
          classroomId: classroom.id,
          name: categoryNames[i],
          defaultAmount: [2, 2, 3, 3, 2, 5, 2, 2, 3, 2][i],
          order: i,
        },
      }),
    );
  const names = [
    "Aoife",
    "Ben",
    "Cara",
    "Daniel",
    "Ella",
    "Finn",
    "Grace",
    "Hugo",
    "Isla",
    "Jack",
  ];
  const pupils = [];
  for (let i = 0; i < names.length; i++)
    pupils.push(
      await db.pupil.create({
        data: {
          classroomId: classroom.id,
          firstName: names[i],
          displayName: names[i],
          username: names[i].toLowerCase(),
          pinHash: await bcrypt.hash(`${(i % 3) + 1}`.repeat(4), 10),
          avatar: ["Star", "Rocket", "Book", "Trophy"][i % 4],
        },
      }),
    );
  const rewardData = [
    [
      "Use a Special Pen",
      10,
      "Small",
      "Use one of the teacher's colourful special pens for your work during one lesson.",
    ],
    [
      "Choose Your Seat for One Lesson",
      15,
      "Small",
      "Pick any available seat in the classroom for one whole lesson.",
    ],
    [
      "Five Minutes of Drawing Time",
      10,
      "Small",
      "Enjoy five quiet minutes to draw anything you like using classroom art supplies.",
    ],
    [
      "Be First in Line",
      10,
      "Small",
      "Take the first place in the class line for the next transition.",
    ],
    [
      "Choose the Brain Break",
      20,
      "Small",
      "Choose the class's next movement, dance or mindfulness brain break.",
    ],
    [
      "Teacher's Assistant",
      40,
      "Medium",
      "Help the teacher with classroom jobs and special tasks for one lesson.",
    ],
    [
      "Choose the Class Music",
      40,
      "Medium",
      "Choose the teacher-approved background music while the class works.",
    ],
    [
      "Extra Computer Time",
      50,
      "Medium",
      "Receive extra classroom computer or tablet time during an agreed session.",
    ],
    [
      "Sit Beside a Friend",
      50,
      "Medium",
      "Choose a friend to sit beside for one lesson, with the teacher's approval.",
    ],
    [
      "Choose a Classroom Game",
      60,
      "Medium",
      "Pick the classroom game everyone will play during the next game slot.",
    ],
    [
      "Lead a Class Quiz",
      100,
      "Large",
      "Become the quiz host and lead a teacher-prepared class quiz.",
    ],
    [
      "Choose the Friday Activity",
      120,
      "Large",
      "Choose from the teacher's approved activities for the Friday class slot.",
    ],
    [
      "Lunch With a Friend",
      150,
      "Large",
      "Invite one friend to have lunch with you in the classroom on an agreed day.",
    ],
    [
      "Small Homework Pass",
      180,
      "Large",
      "Skip one small homework task chosen and approved by the teacher.",
    ],
    [
      "Create a Challenge for the Teacher",
      200,
      "Large",
      "Design a fun, safe challenge for the teacher to attempt in front of the class.",
    ],
  ] as const;
  const rewards = [];
  for (const [name, price, tier, description] of rewardData)
    rewards.push(
      await db.reward.create({
        data: {
          classroomId: classroom.id,
          name,
          description,
          price,
          tier,
          category: "Classroom Privileges",
          unlimitedStock: true,
        },
      }),
    );
  const avatarRewards = [
    [
      "Rainbow Hoodie",
      75,
      "Medium",
      "A bright rainbow hoodie for your classroom character.",
      "OUTFIT",
      "rainbow",
      "RARE",
    ],
    [
      "Space Explorer Suit",
      120,
      "Large",
      "A deep-space suit for adventures beyond the classroom.",
      "OUTFIT",
      "space",
      "EPIC",
    ],
    [
      "Sports Jersey",
      60,
      "Medium",
      "A green sports jersey for your classroom character.",
      "OUTFIT",
      "sport",
      "COMMON",
    ],
    [
      "Cool Glasses",
      35,
      "Small",
      "A stylish pair of glasses for your character.",
      "ACCESSORY",
      "glasses",
      "COMMON",
    ],
    [
      "Royal Crown",
      140,
      "Large",
      "A shining golden crown for your character.",
      "ACCESSORY",
      "crown",
      "EPIC",
    ],
    [
      "Pink Headphones",
      80,
      "Medium",
      "Colourful headphones for your character.",
      "ACCESSORY",
      "headphones",
      "RARE",
    ],
  ] as const;
  for (const [
    name,
    price,
    tier,
    description,
    type,
    assetKey,
    rarity,
  ] of avatarRewards) {
    const item = await db.avatarItem.create({
      data: { name, type, assetKey, rarity, description },
    });
    await db.reward.create({
      data: { classroomId: classroom.id, name, description, price, tier, category: "Avatar Collection", unlimitedStock: true, avatarItemId: item.id },
    });
  }
  await db.avatarItem.createMany({
    data: [
      {
        name: "Wizard Hat",
        type: "ACCESSORY",
        assetKey: "wizard",
        rarity: "LEGENDARY",
        description: "An event-only magical wizard hat.",
        eventOnly: true,
      },
      {
        name: "Royal Celebration Outfit",
        type: "OUTFIT",
        assetKey: "royal",
        rarity: "LEGENDARY",
        description: "A rare outfit awarded at special class events.",
        eventOnly: true,
      },
      {
        name: "Science Champion Coat",
        type: "OUTFIT",
        assetKey: "scientist",
        rarity: "EPIC",
        description: "A special coat for classroom science champions.",
        eventOnly: true,
      },
    ],
  });
  for (const [target, reward] of [
    [500, "Ten-Minute Class Game"],
    [1000, "Extra Outdoor Break"],
    [2500, "Class Quiz Against the Teacher"],
    [5000, "Movie Afternoon"],
    [8000, "Themed Classroom Day"],
    [12000, "End-of-Term Celebration"],
  ] as const)
    await db.classMilestone.create({
      data: {
        classroomId: classroom.id,
        name: `${target.toLocaleString()} Bucks`,
        description: "Earn together and celebrate together.",
        target,
        reward,
      },
    });
  const group = await db.group.create({
    data: { classroomId: classroom.id, name: "Blue Table" },
  });
  for (const p of pupils.slice(0, 5))
    await db.groupMember.create({ data: { groupId: group.id, pupilId: p.id } });
  let wealth = 0;
  for (let i = 0; i < pupils.length; i++) {
    const amount = 20 + i * 3;
    wealth += amount;
    await db.pupil.update({
      where: { id: pupils[i].id },
      data: { balance: amount, lifetimeEarnings: amount },
    });
    await db.transaction.create({
      data: {
        pupilId: pupils[i].id,
        classroomId: classroom.id,
        type: "EARNING",
        amount,
        balanceBefore: 0,
        balanceAfter: amount,
        classWealthImpact: amount,
        categoryId: categories[i % categories.length].id,
        reason: "Demo award",
        createdBy: "TEACHER",
      },
    });
  }
  await db.classroom.update({
    where: { id: classroom.id },
    data: { classWealth: wealth },
  });
  await db.savingsGoal.create({
    data: { pupilId: pupils[0].id, rewardId: rewards[10].id },
  });
  await db.purchaseRequest.create({
    data: { pupilId: pupils[1].id, rewardId: rewards[0].id, price: 10 },
  });
  console.log("Seeded demo: teacher123; pupil PINs cycle 1111, 2222, 3333");
}
main().finally(() => db.$disconnect());
