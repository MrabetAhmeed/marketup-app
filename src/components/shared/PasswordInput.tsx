"use client";

import { useState, useCallback } from "react";

interface PasswordInputProps {
  id: string;
  name: string;
  label: string;
  placeholder?: string;
  required?: boolean;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
  error?: string;
  showStrength?: boolean;
}

function scorePassword(p: string): number {
  if (!p) return 0;
  let score = 0;
  if (p.length >= 8) score++;
  if (/[A-Z]/.test(p)) score++;
  if (/[0-9]/.test(p)) score++;
  if (/[^A-Za-z0-9]/.test(p)) score++;
  return score;
}

const STRENGTH_LABELS = [
  "Trop court — 8 caractères min · 1 majuscule · 1 chiffre · 1 caractère spécial",
  "Faible — ajoutez une majuscule, un chiffre et un caractère spécial",
  "Moyen — il manque un caractère spécial ou un chiffre",
  "Bon — encore un effort",
  "Robuste — parfait",
];

const BAR_COLORS = ["", "bg-[#D13438]", "bg-[#F59E0B]", "bg-[#FACC15]", "bg-[#107C10]"];

export default function PasswordInput({
  id,
  name,
  label,
  placeholder = "Minimum 8 caractères",
  required = false,
  value,
  onChange,
  onBlur,
  error,
  showStrength = false,
}: PasswordInputProps): JSX.Element {
  const [visible, setVisible] = useState(false);

  const score = scorePassword(value);

  const toggleVisibility = useCallback(() => {
    setVisible((prev) => !prev);
  }, []);

  return (
    <div>
      <label htmlFor={id} className={`block text-[11px] font-bold uppercase tracking-[0.06em] text-[#616161] mb-1.5 ${required ? "after:content-['*'] after:text-[#D13438] after:ml-1" : ""}`}>
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          name={name}
          type={visible ? "text" : "password"}
          required={required}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          placeholder={placeholder}
          className={`w-full px-3.5 py-2.5 bg-white border rounded text-sm text-[#242424] placeholder:text-[#8A8886] transition-[border-color,box-shadow] duration-150 pr-12 focus:border-[#0078D4] focus:outline-none focus:ring-2 focus:ring-[#EFF6FC] ${error ? "border-[#D13438]" : "border-[#D1D1D1]"}`}
        />
        <button
          type="button"
          onClick={toggleVisibility}
          className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center text-[#616161] hover:text-[#0078D4] rounded transition-colors"
          aria-label={visible ? "Masquer le mot de passe" : "Afficher le mot de passe"}
        >
          <span className="material-symbols-outlined text-xl">
            {visible ? "visibility_off" : "visibility"}
          </span>
        </button>
      </div>

      {/* Strength bar */}
      {showStrength && (
        <>
          <div className="flex gap-1 mt-2">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className={`h-1 flex-1 rounded-sm transition-colors duration-200 ${i <= score ? BAR_COLORS[score] || "bg-[#E0E0E0]" : "bg-[#E0E0E0]"}`}
              />
            ))}
          </div>
          <p
            className="text-xs mt-2"
            style={{ color: score >= 4 ? "#107C10" : score >= 2 ? "#616161" : "#8A8886" }}
          >
            {value ? STRENGTH_LABELS[score] || "" : "8 caractères min · 1 majuscule · 1 chiffre · 1 caractère spécial"}
          </p>
        </>
      )}

      {error && <p className="text-xs text-[#D13438] mt-1">{error}</p>}
    </div>
  );
}
