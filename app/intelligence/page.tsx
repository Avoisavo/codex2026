import type { Metadata } from "next";

import IntelligenceLab from "./intelligence";

export const metadata: Metadata = {
  title: "Scam Intelligence Lab",
  description:
    "A deterministic shadow-mode simulation of explainable scam intelligence.",
};

export default function IntelligencePage() {
  return <IntelligenceLab />;
}
