import { HqSessionGuard } from "@/components/hq-session-guard";

export default function GlobalHqLayout({ children }: { children: React.ReactNode }) {
  return <HqSessionGuard>{children}</HqSessionGuard>;
}
