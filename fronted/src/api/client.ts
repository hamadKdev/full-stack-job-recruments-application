function getResolvedApiBaseUrl(): string {
  let url = (import.meta.env.VITE_API_BASE_URL || '').trim();

  // Strip accidental quotes if provided in env vars (e.g. "https://..." or 'https://...')
  if (
    (url.startsWith('"') && url.endsWith('"')) ||
    (url.startsWith("'") && url.endsWith("'"))
  ) {
    url = url.slice(1, -1).trim();
  }

  // Fallback to primary production backend if not configured or empty
  if (!url) {
    url = 'https://full-stack-job-recruitment-9djp.vercel.app';
  }

  // Prevent browser Mixed Content blocking: if app is on HTTPS, enforce HTTPS
  if (typeof window !== 'undefined' && window.location.protocol === 'https:' && url.startsWith('http://')) {
    url = url.replace(/^http:\/\//, 'https://');
  }

  // Remove trailing slashes
  return url.replace(/\/+$/, '');
}

const API_BASE_URL = getResolvedApiBaseUrl();

export class ApiError extends Error {
  status: number;
  data: any;

  constructor(status: number, message: string, data?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

/**
 * Extracts a human-readable error message from backend error responses.
 * FastAPI typically returns { detail: string | Array<{ msg: string }> }
 */
export function extractErrorMessage(error: any): string {
  if (!error) return 'An unexpected error occurred';
  if (typeof error === 'string') return error;

  if (error instanceof ApiError) {
    if (error.data) {
      if (typeof error.data.detail === 'string') {
        return error.data.detail;
      }
      if (Array.isArray(error.data.detail)) {
        return error.data.detail
          .map((item: any) => item.msg || JSON.stringify(item))
          .join(', ');
      }
      if (error.data.message) {
        return error.data.message;
      }
    }
    return error.message;
  }

  if (error.message) {
    return error.message;
  }

  return 'Network or server error. Please try again.';
}

interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>;
}

export async function apiClient<T = any>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const { params, headers: customHeaders, body, ...customOptions } = options;

  let url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        searchParams.append(key, String(value));
      }
    });
    const queryString = searchParams.toString();
    if (queryString) {
      url += (url.includes('?') ? '&' : '?') + queryString;
    }
  }

  const token = localStorage.getItem('access_token');
  const headers: Record<string, string> = {};

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Only set Content-Type to application/json if body is NOT FormData
  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
  if (!isFormData && body && typeof body === 'string') {
    headers['Content-Type'] = 'application/json';
  }

  if (customHeaders) {
    Object.assign(headers, customHeaders);
  }

  // Execute fetch with automatic single retry for network errors/cold starts
  let response: Response;
  const executeFetch = () =>
    fetch(url, {
      headers,
      body,
      ...customOptions,
    });

  try {
    response = await executeFetch();
  } catch (initialErr: any) {
    // Retry once after 1 second if initial attempt fails (useful for serverless cold-start or momentary latency)
    try {
      await new Promise((res) => setTimeout(res, 1200));
      response = await executeFetch();
    } catch (retryErr: any) {
      console.error(`[API Connection Error] Failed connecting to ${url}:`, retryErr);
      throw new ApiError(
        0,
        'Unable to connect to the recruitment server. Please try again in a moment.'
      );
    }
  }

  let responseData: any = null;
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    try {
      responseData = await response.json();
    } catch {
      responseData = null;
    }
  } else {
    try {
      responseData = await response.text();
    } catch {
      responseData = null;
    }
  }

  if (!response.ok) {
    if (response.status === 401) {
      localStorage.removeItem('access_token');
      localStorage.removeItem('role');
      localStorage.removeItem('user_id');
      window.dispatchEvent(new CustomEvent('auth:unauthorized'));
      const msg =
        (responseData && (responseData.detail || responseData.message)) ||
        'Session expired or invalid. Please log in again.';
      throw new ApiError(401, typeof msg === 'string' ? msg : 'Unauthorized', responseData);
    }

    if (response.status === 403) {
      const msg =
        (responseData && (responseData.detail || responseData.message)) ||
        'You do not have permission to perform this action.';
      throw new ApiError(403, typeof msg === 'string' ? msg : 'Access Forbidden', responseData);
    }

    if (response.status === 404) {
      const msg =
        (responseData && (responseData.detail || responseData.message)) ||
        'The requested resource was not found.';
      throw new ApiError(404, typeof msg === 'string' ? msg : 'Not Found', responseData);
    }

    if (response.status === 422) {
      let msg = 'Validation error.';
      if (responseData && Array.isArray(responseData.detail)) {
        msg = responseData.detail.map((d: any) => d.msg || 'Invalid field').join(', ');
      } else if (responseData && typeof responseData.detail === 'string') {
        msg = responseData.detail;
      }
      throw new ApiError(422, msg, responseData);
    }

    if (response.status >= 500) {
      const msg =
        (responseData && (responseData.detail || responseData.message)) ||
        'A server error occurred. Please try again later.';
      throw new ApiError(response.status, typeof msg === 'string' ? msg : 'Internal Server Error', responseData);
    }

    const detailMsg =
      (responseData && (responseData.detail || responseData.message)) ||
      `Request failed with status ${response.status}`;
    throw new ApiError(
      response.status,
      typeof detailMsg === 'string' ? detailMsg : 'Request failed',
      responseData
    );
  }

  return responseData as T;
}

export { API_BASE_URL };
