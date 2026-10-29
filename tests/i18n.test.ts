import { describe, expect, it } from "vitest";
import { languageChoice, languageOptions, messageKeys, translate } from "../src/i18n/catalog";
import { translateInterface } from "../src/i18n/useInterfaceText";
import interfaceMessages from "../src/i18n/interface-messages.json";

describe("workspace language catalogue", () => {
  it("provides nonempty labels and supported date locales for every advertised language", () => {
    for (const [locale] of languageOptions) {
      expect(() => new Intl.DateTimeFormat(locale)).not.toThrow();
      for (const key of messageKeys) expect(translate(locale, key).trim(), `${locale} ${key}`).not.toBe("");
    }
  });
  it("chooses the closest supported language without changing unsupported settings", () => {
    expect(languageChoice("es-MX")).toBe("es-ES");
    expect(translate("es-MX", "today")).toBe("Hoy");
    expect(languageChoice("en-GB")).toBe("en-US");
    expect(translate(undefined, "today")).toBe("Today");
    expect(translate("nl-NL", "today")).toBe("Today");
  });
  it("localizes built-in values for display while keeping unknown user text intact", () => {
    expect(translateInterface("es-ES", "Do not contact")).toBe("No contactar");
    expect(translateInterface("fr-FR", "Completed")).toBe("Terminé");
    expect(translateInterface("ja-JP", "New")).toBe("新規");
    expect(translateInterface("es-ES", "A name the user entered 123")).toBe("A name the user entered 123");
    expect(translateInterface("en-US", "Do not contact")).toBe("Do not contact");
  });
  it("uses a translated warning before discarding unfinished work", () => {
    const warning = "Discard unfinished edits in this dialog? Cancel to keep editing.";
    expect(translateInterface("es-ES", warning)).toContain("Cancelar");
    expect(translateInterface("ja-JP", warning)).toContain("キャンセル");
  });
  it("inserts user-entered values without translating or interpreting them", () => {
    expect(translateInterface("es-ES", "Delete {0}?", "Marketing {1}")).toBe("¿Eliminar Marketing {1}?");
    expect(translateInterface("en-US", "Delete {0}?", "Olivia")).toBe("Delete Olivia?");
  });
  it("preserves placeholders in every stored translation", () => {
    for (const [source, translations] of Object.entries(interfaceMessages)) {
      expect(translations, source).toHaveLength(10);
      const expected = [...source.matchAll(/\{\d+\}/g)].map((x) => x[0]).sort();
      for (const value of translations) {
        if (!value) continue; // An unavailable translation falls back to English.
        expect([...value.matchAll(/\{\d+\}/g)].map((x) => x[0]).sort(), source).toEqual(expected);
      }
    }
  });
});
