# Brunner Bucks

Brunner Bucks is a private, locally hosted multi-classroom economy for positive recognition, saving towards rewards, custom avatars and cumulative class milestones. Personal spendable balances and lifetime Class Wealth are separate: purchases never reduce Class Wealth.

## Setup

Requires Node.js 20+ and npm.

```bash
npm install
copy .env.example .env
npx prisma migrate dev --name init
npx prisma db seed
npm run dev
```

Open `http://localhost:3000`, then choose **Choose classroom**. The classroom-management screen at `/classrooms` is protected by the four-digit `MANAGEMENT_PIN`. The local development PIN is `2468`; replace it before sharing or deploying the app. The migrated demo classroom is available at `http://localhost:3000/class/brunner-class`. Demo teacher password: `teacher123`. Pupil usernames are lowercase first names; seed PINs cycle through `1111`, `2222`, and `3333`. Change all demo credentials before real use.

## Multiple classrooms

`/classrooms` is the PIN-protected classroom setup area. It lists existing bookmark links and creates new classrooms with their own teacher password, pupils, balances, groups, shop, milestones, reports and display. Five failed management, teacher or pupil sign-in attempts produce a 15-minute lockout. Each classroom has a stable portal URL:

```text
/class/{class-slug}
/class/{class-slug}/teacher
/class/{class-slug}/pupil
/class/{class-slug}/display
```

Pupil usernames only need to be unique inside their own classroom. Avatar appearance and collectible ownership are stored per pupil; the global avatar catalogue can be offered independently by each classroom shop. Pupil photo upload/storage has been removed.

## Commands

```bash
npm run dev
npm run typecheck
npm test
npm run build
npx prisma studio
```

## Application areas

- `/class/{class-slug}/teacher`: protected dashboard, multi-pupil awards, pupil/PIN management, saved groups, rewards, purchase approvals, milestones, audit activity, reports and local settings.
- `/class/{class-slug}/pupil`: a pupil-private wallet, avatar studio, shop requests, savings goal, own history, shared class goal and monthly reflection.
- `/class/{class-slug}/display`: privacy-safe whiteboard view with no pupil balances or rankings.

Balance mutations in `src/lib/economy.ts` use Prisma database transactions. Pending purchases do not deduct Bucks; approvals verify balance and stock, deduct exactly once, and leave Class Wealth untouched. Awards update balance, lifetime earnings, Class Wealth, transaction audit, activity audit and milestones together.

## Database and backups

SQLite is stored at `prisma/dev.db` and ignored by Git. For a reliable complete backup, stop the app and copy this file. Restore by stopping the app and replacing it. Keep `.env` private. To reset demo data, stop the app, remove `prisma/dev.db`, rerun the migration, then seed.

Vercel production uses PostgreSQL. The generated production schema and initial migration live under `prisma/postgres`. To create a private, portable export of the local database:

```bash
npm run db:export -- --out private-exports/before-production.export.json
```

The importer refuses to run without an explicit confirmation variable and refuses a non-empty destination. Keep exports outside source control because they contain classroom data.

## Vercel preparation

The project is configured to build in Vercel's Dublin region (`dub1`), apply PostgreSQL migrations, enable production security headers and expose `/api/health`. In Vercel, configure these Production environment variables:

```text
DATABASE_URL=<the pooled PostgreSQL connection string>
SESSION_SECRET=<a unique random value of at least 32 characters>
MANAGEMENT_PIN=<a private, non-default four-digit PIN>
APP_URL=https://brunnerbucks.ie
```

Do not use the local `2468` PIN in production; production validation deliberately rejects it. Use Node.js 20 or newer. Connect the Git repository to Vercel, provision PostgreSQL in an EU region, add the environment variables, and deploy. After the first successful deployment, attach `brunnerbucks.ie` and its required DNS records in Vercel, then test `/api/health`, management unlock, teacher login, pupil login, awards, purchases and backups before inviting a school.

The current application is multi-classroom but single-school: one management PIN can administer every classroom in the database. Before serving unrelated schools from one deployment, add a first-class school tenant and enforce school isolation, or deploy a separate project and database for every school. Do not place multiple schools into the current shared database as-is.

## Structure

`src/app` contains App Router screens; `src/actions.ts` contains server mutations; `src/lib` contains authentication, database and economy logic; `prisma` defines persistence and seed data; `src/tests` covers financial invariants.

## Security and limitations

The management screen is PIN-protected and management, teacher and pupil sign-ins are throttled. Production still requires HTTPS, private Vercel environment variables, unique credentials, encrypted backups, monitoring and a production PostgreSQL database. A four-digit shared PIN is suitable as a barrier against casual pupil access, not as the sole administrator identity for a multi-school commercial service.

Schools entering pupil information does not remove Brunner Bucks' data-protection responsibilities. For an Irish school service, establish controller/processor terms, retention and deletion processes, access controls, incident handling and an appropriate privacy notice before launch; obtain professional legal/data-protection advice for the final service.
