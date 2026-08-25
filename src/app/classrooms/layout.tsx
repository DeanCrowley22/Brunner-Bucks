import { requireManagement } from "@/lib/auth";

export default async function ManagementLayout({ children }: { children: React.ReactNode }) {
  await requireManagement();
  return children;
}
