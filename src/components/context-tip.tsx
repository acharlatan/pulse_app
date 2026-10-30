import { useInterfaceText } from "../i18n/useInterfaceText";
import { Sparkles } from "lucide-react";
export function ContextTip({title,children}:{title:string;children:string}) {
  const text=useInterfaceText();
  return <details className="context-tip"><summary><Sparkles size={17}/><span>{text(title)}</span></summary><p>{text(children)}</p></details>;
}
