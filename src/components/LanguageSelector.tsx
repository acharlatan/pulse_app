import { usePulse } from "../app/context";
import { languageChoice, languageOptions } from "../i18n/catalog";
import { useTranslation } from "../i18n/useTranslation";
import { useInterfaceText } from "../i18n/useInterfaceText";

/** The existing locale preference is backed up per workspace and also formats dates. */
export function LanguageSelector({ compact = false }: { compact?: boolean }) {
  const p = usePulse();
  const t = useTranslation();
  const text = useInterfaceText();
  const unsupported = languageChoice(p.settings.locale) === "en-US" && !/^en(?:-|$)/i.test(p.settings.locale || "en-US");
  return <div className={`language-selector ${compact ? "language-selector-compact" : ""}`}>
    <label className="field"><span>{t("language")}</span><select aria-label={t("language")} value={unsupported ? "" : languageChoice(p.settings.locale)} onChange={(event) => void p.run(() => p.setSettings({ locale: event.target.value }))}>{unsupported && <option value="" disabled>{text("Choose a language")}</option>}{languageOptions.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
    {unsupported && <small>{text("Your previous language is no longer supported. The interface uses English until you choose a language; your saved date format is unchanged.")}</small>}
    <small>{t("languageNote")} {t("dateLocale")}</small>
  </div>;
}
