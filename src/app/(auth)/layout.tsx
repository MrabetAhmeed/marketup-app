"use client";

import { ToastProvider } from "@/components/shared/Toast";

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>): JSX.Element {
  return (
    <ToastProvider>
      <div className="bg-white min-h-screen">
        <main className="flex min-h-screen">{children}</main>
      </div>
    </ToastProvider>
  );
}
