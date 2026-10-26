export { AIQuota } from "./quota";
import { handle } from "./handler";
export default { fetch: handle } satisfies ExportedHandler<Env>;
