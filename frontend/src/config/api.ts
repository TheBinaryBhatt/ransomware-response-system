// Legacy API config (kept only for backwards compatibility in older code).
// The modern single source of truth for API configuration is:
//   - `src/utils/constants.ts` for API_BASE_URL/WS_URL
//   - `src/services/api.ts` for concrete endpoint paths

export { API_BASE_URL } from '../utils/constants';

export const API_ENDPOINTS = {} as const;
export const WS_ENDPOINTS = {} as const;

export default API_ENDPOINTS;
