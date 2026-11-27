import { createFileRoute } from "@tanstack/react-router";
import App from "@/components/workspace";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [{ title: "TASMEEM SOURCE — Discover. Evaluate. Source." }, { name: "description", content: "Supplier sourcing, product research and procurement intelligence for TASMEEM." }] }),
  component: App,
});
