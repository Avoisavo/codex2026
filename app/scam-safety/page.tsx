import type { Metadata } from "next";

import ScamSafetyPage from "./scam-safety";

export const metadata: Metadata = {
  title: "Scam Safety",
  description:
    "Six short scam-warning examples and official Malaysian help resources inside the fictional NusaSafe Bank demo.",
};

export default function Page() {
  return <ScamSafetyPage />;
}
