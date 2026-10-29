import { describe, expect, it } from "vitest";
import { languageChoice, languageOptions, messageKeys, translate } from "../src/i18n/catalog";

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
});
