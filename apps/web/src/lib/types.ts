/**
 * Type-only bridge to the API: page data types are inferred from the API loaders, so the
 * web app and the API can't drift apart. Example:
 *   import type { membersPage } from "@api/modules/members/routes";
 *   type Data = Loaded<typeof membersPage>;
 * Only `import type` is allowed from "@api/*" (the alias doesn't exist at runtime).
 */
export type Loaded<F extends (...args: never[]) => Promise<unknown>> = Awaited<ReturnType<F>>;
