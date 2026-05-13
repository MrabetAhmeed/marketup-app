"use client";

import { useState, useEffect, useCallback, createContext, useContext } from "react";

interface ToastState {
  message: string;
  visible: boolean;
}

interface ToastContextValue {
  showToast: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue>({ showToast: () => {} });

export function useToast(): ToastContextValue {
  return useContext(ToastContext);
}

const DURATION_MS = 1800;

export function ToastProvider({ children }: { children: React.ReactNode }): JSX.Element {
  const [toast, setToast] = useState<ToastState>({ message: "", visible: false });

  const showToast = useCallback((message: string) => {
    setToast({ message, visible: true });
  }, []);

  useEffect(() => {
    if (!toast.visible) return;
    const timer = setTimeout(() => {
      setToast((prev) => ({ ...prev, visible: false }));
    }, DURATION_MS);
    return () => clearTimeout(timer);
  }, [toast.visible]);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* Toast element */}
      <div
        className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] transition-all duration-300 ${toast.visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"}`}
      >
        <div className="bg-[#242424] text-white text-sm font-medium px-[18px] py-[10px] rounded-[6px] shadow-lg whitespace-nowrap">
          {toast.message}
        </div>
      </div>
    </ToastContext.Provider>
  );
}
