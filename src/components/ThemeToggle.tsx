import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

function getInitial(): "light" | "dark" {
  try {
    const saved = localStorage.getItem("dsops-theme");
    if (saved === "light" || saved === "dark") return saved;
  } catch (_) { /* ignore */ }
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark">(getInitial);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    try { localStorage.setItem("dsops-theme", theme); } catch (_) { /* ignore */ }
  }, [theme]);

  return (
    <Button
      variant="outline"
      size="icon"
      aria-label="Toggle light or dark theme"
      onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
    >
      {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </Button>
  );
}
