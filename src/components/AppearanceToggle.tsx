import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { usePulse } from "../app/context";
import { useInterfaceText } from "../i18n/useInterfaceText";

/** Uses the existing workspace preference and save/error path. */
export function AppearanceToggle({ labelled = false }: { labelled?: boolean }) {
  const p = usePulse();
  const text = useInterfaceText();
  const [systemDark, setSystemDark] = useState(() => matchMedia("(prefers-color-scheme: dark)").matches);
  useEffect(() => {
    const query = matchMedia("(prefers-color-scheme: dark)");
    const update = () => setSystemDark(query.matches);
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  const dark = p.settings.theme === "dark" || (p.settings.theme === "system" && systemDark);
  const label = text(dark ? "Switch to light mode" : "Switch to dark mode");
  return <button type="button" className={labelled ? "appearance-menu" : "icon-button appearance-quick"} aria-label={label} title={label}
    onClick={() => void p.run(() => p.setSettings({ theme: dark ? "light" : "dark" }))}>
    {dark ? <Sun size={18} aria-hidden="true" /> : <Moon size={18} aria-hidden="true" />}
    {labelled && <span>{label}</span>}
  </button>;
}
