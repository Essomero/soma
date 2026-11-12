/**
 * Extract tenant_id from request.
 *
 * Self-hosted (no x-tenant-id header): always 'default'
 * Cloud (soma-cloud proxy): proxy injects x-tenant-id from user session
 */
export function getTenantId(req) {
  return req?.headers?.['x-tenant-id'] || 'default';
}
