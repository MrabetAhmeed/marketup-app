"use client";

import { useToast } from "@/components/shared/Toast";
import { STUB_MESSAGES } from "@/lib/stub-messages";
import type { StubKey } from "@/lib/stub-messages";

export function useFeatureSoonToast(): (key?: StubKey) => void {
  const { showToast } = useToast();
  return (key: StubKey = "FEATURE_COMING_SOON") => {
    showToast(STUB_MESSAGES[key].message);
  };
}
