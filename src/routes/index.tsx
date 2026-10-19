import { createFileRoute } from "@tanstack/react-router";
import { Dashboard } from "@/components/hmi/Dashboard";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "AURA Drive — Infotainment Dashboard" },
      { name: "description", content: "Premium automotive HMI with digital cluster, navigation, media and diagnostics." },
      { property: "og:title", content: "AURA Drive — Infotainment Dashboard" },
      { property: "og:description", content: "Premium automotive HMI with digital cluster, navigation, media and diagnostics." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Dashboard,
});
