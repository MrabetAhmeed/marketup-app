"use client";

import { useRef, useCallback } from "react";

interface OtpInputProps {
  value: string;
  onChange: (code: string) => void;
  error?: string;
  disabled?: boolean;
}

export default function OtpInput({ value, onChange, error, disabled }: OtpInputProps): JSX.Element {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const digits = value.padEnd(6, "").slice(0, 6).split("");

  const setRef = useCallback((el: HTMLInputElement | null, i: number) => {
    inputRefs.current[i] = el;
  }, []);

  const updateDigit = useCallback(
    (index: number, digit: string) => {
      const arr = value.padEnd(6, " ").slice(0, 6).split("");
      arr[index] = digit;
      onChange(arr.join("").replace(/ /g, ""));
    },
    [value, onChange],
  );

  const handleInput = useCallback(
    (e: React.FormEvent<HTMLInputElement>, index: number) => {
      const input = e.currentTarget;
      const v = input.value.replace(/[^0-9]/g, "");
      if (v.length > 1) {
        input.value = v.charAt(0);
      }
      const digit = v.charAt(0) || "";
      updateDigit(index, digit);
      if (digit && index < 5) {
        inputRefs.current[index + 1]?.focus();
      }
    },
    [updateDigit],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
      if (e.key === "Backspace" && !e.currentTarget.value && index > 0) {
        updateDigit(index - 1, "");
        inputRefs.current[index - 1]?.focus();
      } else if (e.key === "ArrowLeft" && index > 0) {
        inputRefs.current[index - 1]?.focus();
      } else if (e.key === "ArrowRight" && index < 5) {
        inputRefs.current[index + 1]?.focus();
      }
    },
    [updateDigit],
  );

  const handlePaste = useCallback(
    (e: React.ClipboardEvent<HTMLInputElement>) => {
      e.preventDefault();
      const text = e.clipboardData.getData("text");
      const pastedDigits = text.replace(/[^0-9]/g, "").slice(0, 6);
      if (!pastedDigits) return;
      onChange(pastedDigits);
      const focusIdx = Math.min(pastedDigits.length, 5);
      inputRefs.current[focusIdx]?.focus();
    },
    [onChange],
  );

  return (
    <div>
      {/* OTP boxes — 3 + separator + 3 */}
      <div className="flex justify-center items-center gap-2 md:gap-3 mb-6" role="group" aria-label="Code à 6 chiffres">
        {[0, 1, 2].map((i) => (
          <input
            key={i}
            ref={(el) => setRef(el, i)}
            className={`w-[44px] h-[56px] md:w-[56px] md:h-[64px] text-center text-[22px] md:text-[26px] font-semibold text-[#242424] bg-white border rounded transition-all duration-150 focus:border-[#0078D4] focus:outline-none focus:ring-2 focus:ring-[#EFF6FC] ${error ? "border-[#D13438] focus:ring-[#FEEBEB]" : digits[i]?.trim() ? "border-[#0078D4]" : "border-[#D1D1D1]"}`}
            maxLength={1}
            type="text"
            inputMode="numeric"
            pattern="[0-9]"
            autoComplete={i === 0 ? "one-time-code" : "off"}
            autoFocus={i === 0}
            value={digits[i]?.trim() || ""}
            disabled={disabled}
            onInput={(e) => handleInput(e, i)}
            onKeyDown={(e) => handleKeyDown(e, i)}
            onPaste={handlePaste}
          />
        ))}

        <span className="text-[#D1D1D1] font-bold text-xl select-none" aria-hidden="true">–</span>

        {[3, 4, 5].map((i) => (
          <input
            key={i}
            ref={(el) => setRef(el, i)}
            className={`w-[44px] h-[56px] md:w-[56px] md:h-[64px] text-center text-[22px] md:text-[26px] font-semibold text-[#242424] bg-white border rounded transition-all duration-150 focus:border-[#0078D4] focus:outline-none focus:ring-2 focus:ring-[#EFF6FC] ${error ? "border-[#D13438] focus:ring-[#FEEBEB]" : digits[i]?.trim() ? "border-[#0078D4]" : "border-[#D1D1D1]"}`}
            maxLength={1}
            type="text"
            inputMode="numeric"
            pattern="[0-9]"
            autoComplete="off"
            value={digits[i]?.trim() || ""}
            disabled={disabled}
            onInput={(e) => handleInput(e, i)}
            onKeyDown={(e) => handleKeyDown(e, i)}
            onPaste={handlePaste}
          />
        ))}
      </div>

      {/* Error message */}
      {error && (
        <p className="text-sm text-[#D13438] mb-4 text-center" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
