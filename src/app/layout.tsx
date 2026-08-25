import "./globals.css";
import "./polish.css";
import "./fun.css";
import "./management.css";
import "./dashboards.css";
import "./avatars.css";
import "./student-layout.css";
import "./premium-features.css";
import { Coins } from "lucide-react";
import { assertRuntimeEnvironment } from "@/lib/env";

assertRuntimeEnvironment();

export const metadata = {
  title: "Brunner Bucks",
  description: "A positive local classroom economy",
  robots: { index: false, follow: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <footer style={{ textAlign: "center", padding: 24, color: "#738095" }}>
          <Coins size={16} style={{ verticalAlign: "middle" }} /> Brunner Bucks
          {" · "}Private local classroom economy
        </footer>
      </body>
    </html>
  );
}
