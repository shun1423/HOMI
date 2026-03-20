"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ContractorsRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/app/places");
  }, [router]);
  return null;
}
