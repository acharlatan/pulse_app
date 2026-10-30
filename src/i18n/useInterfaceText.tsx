import { createContext, useCallback, useContext, type ReactNode } from "react";
import { languageChoice, languageOptions } from "./catalog";
import messages from "./interface-messages.json";
import priorityMessages from "./priority-messages.json";

const InterfaceLocale = createContext("en-US");
const translations = messages as Record<string, string[]>;
const priorityTranslations = priorityMessages as Record<string, string[]>;

export function InterfaceLocaleProvider({ locale, children }: { locale: string; children: ReactNode }) {
  return <InterfaceLocale.Provider value={languageChoice(locale)}>{children}</InterfaceLocale.Provider>;
}

/** Translate app-authored interface copy; never call this on user-entered data. */
export function translateInterface(locale: string | null | undefined, source: string, ...values: unknown[]): string {
  const chosen = languageChoice(locale);
  const index = languageOptions.findIndex(([code]) => code === chosen) - 1;
  const message = chosen === "en-US" ? source : priorityTranslations[source]?.[index] || translations[source]?.[index] || source;
  return message.replace(/\{(\d+)\}/g, (match, index: string) => {
    const position = Number(index);
    return position < values.length ? String(values[position] ?? "") : match;
  });
}

export function useInterfaceText() {
  const locale = useContext(InterfaceLocale);
  return useCallback((source: string, ...values: unknown[]) => translateInterface(locale, source, ...values), [locale]);
}
