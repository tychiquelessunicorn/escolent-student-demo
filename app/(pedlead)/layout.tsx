import { PedleadShell } from "@/components/pedlead-shell";

export const metadata = {
  title: "Content Authoring · Escolent Pedagogical Lead",
  description: "Cross-tenant skill graph and misconception taxonomy authoring and validation.",
};

export default function PedleadLayout({ children }: { children: React.ReactNode }) {
  return <PedleadShell>{children}</PedleadShell>;
}
