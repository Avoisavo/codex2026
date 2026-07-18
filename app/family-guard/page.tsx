import type { Metadata } from "next";

import FamilyGuardDashboard from "./family-guard";

export const metadata: Metadata = {
  title: "Family Guard",
  description:
    "Trusted-contact review for protected transfers in the fictional NusaSafe Bank hackathon demo.",
};

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ request?: string | string[] }>;
}) {
  const params = await searchParams;
  const initialRequestId = Array.isArray(params.request)
    ? params.request[0]
    : params.request;

  return <FamilyGuardDashboard initialRequestId={initialRequestId ?? null} />;
}
