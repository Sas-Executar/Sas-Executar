import { AuthGate } from "@/features/auth/auth-gate";

export default function IndexRoute() {
  return <AuthGate />;
}
