import { usePulse } from "../app/context";
import { translate, type MessageKey } from "./catalog";
export function useTranslation() {
  const { settings } = usePulse();
  return (key: MessageKey) => translate(settings.locale, key);
}
