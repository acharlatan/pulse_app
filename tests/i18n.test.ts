import { describe, expect, it } from "vitest";
import { languageChoice, languageOptions, messageKeys, translate } from "../src/i18n/catalog";
import { translateInterface } from "../src/i18n/useInterfaceText";
import interfaceMessages from "../src/i18n/interface-messages.json";
import priorityMessages from "../src/i18n/priority-messages.json";

describe("workspace language catalogue", () => {
  it("provides nonempty labels and supported date locales for every advertised language", () => {
    for (const [locale] of languageOptions) {
      expect(() => new Intl.DateTimeFormat(locale)).not.toThrow();
      for (const key of messageKeys) expect(translate(locale, key).trim(), `${locale} ${key}`).not.toBe("");
    }
  });
  it("chooses the closest supported language without changing unsupported settings", () => {
    expect(languageOptions.map(([locale]) => locale)).toEqual(["en-US", "es-ES", "fr-FR"]);
    expect(languageChoice("ja-JP")).toBe("en-US");
    expect(languageChoice("es-MX")).toBe("es-ES");
    expect(translate("es-MX", "today")).toBe("Hoy");
    expect(languageChoice("en-GB")).toBe("en-US");
    expect(translate(undefined, "today")).toBe("Today");
    expect(translate("nl-NL", "today")).toBe("Today");
  });
  it("localizes built-in values for display while keeping unknown user text intact", () => {
    expect(translateInterface("es-ES", "Do not contact")).toBe("No contactar");
    expect(translateInterface("fr-FR", "Completed")).toBe("Terminé");
    expect(translateInterface("ja-JP", "New")).toBe("New");
    expect(translateInterface("es-ES", "A name the user entered 123")).toBe("A name the user entered 123");
    expect(translateInterface("en-US", "Do not contact")).toBe("Do not contact");
  });
  it("uses a translated warning before discarding unfinished work", () => {
    const warning = "Discard unfinished edits in this dialog? Cancel to keep editing.";
    expect(translateInterface("es-ES", warning)).toContain("Cancelar");
    expect(translateInterface("fr-FR", warning)).not.toBe(warning);
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
    for (const [source, translations] of Object.entries(priorityMessages)) {
      expect(translations, source).toHaveLength(2);
      const expected = [...source.matchAll(/\{\d+\}/g)].map((x) => x[0]).sort();
      for (const value of translations) {
        expect(value.trim(), source).not.toBe("");
        expect([...value.matchAll(/\{\d+\}/g)].map((x) => x[0]).sort(), source).toEqual(expected);
      }
    }
  });
  it("localizes the redesigned relationship and focus experiences", () => {
    for (const [locale] of languageOptions.slice(1)) {
      for (const message of ["Get to know your network.", "Search people in this report", "Current review status", "Start with one thing that matters.", "Search priorities", "No priorities match these filters."]) {
        expect(translateInterface(locale, message)).not.toBe(message);
      }
      expect(translateInterface(locale, "{0} matching priorities", 3)).toContain("3");
    }
  });
  it("bundles translated labels for the new Analytics and Orbit controls", () => {
    for (const [locale] of languageOptions.filter(([locale]) => locale !== "en-US")) {
      expect(translateInterface(locale, "Keep commitments")).not.toBe("Keep commitments");
      expect(translateInterface(locale, "Back to previous selection")).not.toBe("Back to previous selection");
      expect(translateInterface(locale, "Saved follow-up due {0}. Review the date, scope and any contact restrictions.", "2026-10-30")).toContain("2026-10-30");
    }
  });
});
