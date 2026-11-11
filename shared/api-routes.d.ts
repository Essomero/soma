export const ROUTE_HANDLERS: Record<string, string>;
export const HANDLER_FILES: string[];
export function routesForHandler(handler: string): string[];
export function apiRouteFromPath(path: string): string | null;
export function handlerForRoute(route: string | null | undefined): string | null;
export function handlerForPath(path: string): string | null;
