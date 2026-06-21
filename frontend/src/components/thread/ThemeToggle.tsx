import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

export function ThemeToggle() {
  const [isDark, setIsDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("thread-theme");
    const prefersDark =
      stored === "dark" ||
      (!stored && window.matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.classList.toggle("dark", prefersDark);
    setIsDark(prefersDark);
    setMounted(true);
  }, []);

  const toggle = () => {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("thread-theme", next ? "dark" : "light");
  };

  return (
    <button
      onClick={toggle}
      aria-label="Toggle theme"
      className="relative inline-flex h-8 w-8 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
    >
      <Sun
        className={`h-4 w-4 transition-opacity duration-200 ${
          mounted && isDark ? "absolute opacity-0" : "opacity-100"
        }`}
      />
      <Moon
        className={`h-4 w-4 transition-opacity duration-200 ${
          mounted && isDark ? "opacity-100" : "absolute opacity-0"
        }`}
      />
    </button>
  );
}
