import { usePulse } from "../app/context";
import { languageChoice, languageOptions } from "../i18n/catalog";
import { useTranslation } from "../i18n/useTranslation";

/** The existing locale preference is backed up per workspace and also formats dates. */
export function LanguageSelector({ compact = false }: { compact?: boolean }) {
  const p = usePulse();
  const t = useTranslation();
  return <div className={`language-selector ${compact ? "language-selector-compact" : ""}`}>
    <label className="field"><span>{t("language")}</span><select aria-label={t("language")} value={languageChoice(p.settings.locale)} onChange={(event) => void p.run(() => p.setSettings({ locale: event.target.value }))}>{languageOptions.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
    <small>{t("languageNote")} {t("dateLocale")}</small>
  </div>;
}
