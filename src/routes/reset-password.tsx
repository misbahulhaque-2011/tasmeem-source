import { createFileRoute } from "@tanstack/react-router";
import { ResetPassword } from "@/components/workspace";

export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [{ title: "Set your password — TASMEEM SOURCE" }] }),
  component: ResetPassword,
});
