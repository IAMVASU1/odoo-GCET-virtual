/**
 * API Utility Functions
 * Helper functions for making authenticated API requests
 */

/**
 * Get the authentication token from localStorage
 * @returns {string|null} JWT token or null if not found
 */
export function getAuthToken() {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('authToken')
  }
  return null
}

/**
 * Make an authenticated API request
 * @param {string} endpoint - API endpoint (e.g., '/api/users')
 * @param {Object} options - Fetch options (method, body, etc.)
 * @returns {Promise} Response data
 */
export async function fetchAPI(endpoint, options = {}) {
  const token = getAuthToken()
  
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  }

  // Add Authorization header if token exists
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const response = await fetch(endpoint, {
    ...options,
    headers,
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.error || data.message || 'Request failed')
  }

  return data
}

/**
 * GET request helper
 */
export async function apiGet(endpoint) {
  return fetchAPI(endpoint, { method: 'GET' })
}

/**
 * POST request helper
 */
export async function apiPost(endpoint, body) {
  return fetchAPI(endpoint, {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

/**
 * PATCH request helper
 */
export async function apiPatch(endpoint, body) {
  return fetchAPI(endpoint, {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
}

/**
 * DELETE request helper
 */
export async function apiDelete(endpoint) {
  return fetchAPI(endpoint, { method: 'DELETE' })
}
