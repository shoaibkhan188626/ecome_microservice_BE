// ═══════════════════════════════════════════════════
// API Test Helper
// Utilities for making HTTP requests in tests
// ═══════════════════════════════════════════════════

export function buildUrl(baseUrl, path) {
  return `${baseUrl}${path}`;
}

export function createJsonBody(data) {
  return {
    body: JSON.stringify(data),
    headers: { 'Content-Type': 'application/json' },
  };
}

export function extractBody(response) {
  return response.body;
}

export function expectSuccessResponse(response) {
  return {
    success: true,
    ...response,
  };
}

export function expectErrorResponse(code, message) {
  return {
    success: false,
    error: {
      code,
      message,
    },
  };
}
