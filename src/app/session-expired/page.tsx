"use client";

import { useEffect, useRef } from "react";
import { signOut } from "next-auth/react";

export default function SessionExpiredPage(): JSX.Element {
  const triggered = useRef(false);

  useEffect(() => {
    if (triggered.current) return;
    triggered.current = true;
    signOut({ callbackUrl: "/login?reason=session_expired" });
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-muted">
      <div className="text-center">
        <div className="w-12 h-12 rounded-lg bg-primary-light flex items-center justify-center mx-auto mb-4">
          <span className="material-symbols-outlined text-primary" style={{ fontSize: 24 }}>
            logout
          </span>
        </div>
        <h1 className="font-heading font-semibold text-[16px] text-ink-primary mb-1">
          Session expirée
        </h1>
        <p className="text-[13px] text-ink-secondary">
          Redirection vers la page de connexion...
        </p>
      </div>
    </div>
  );
}
