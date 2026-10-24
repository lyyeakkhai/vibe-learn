const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export type TokenGetter = () => Promise<string | null>;

export class ApiClient {
  private static authToken: string | null = null;
  private static tokenGetter: TokenGetter | null = null;
  private static isRefreshing = false;

  static setAuthToken(token: string | null) {
    this.authToken = token;
  }

  static setTokenGetter(getter: TokenGetter | null) {
    this.tokenGetter = getter;
  }

  static getAuthToken(): string | null {
    return this.authToken;
  }

  static async request<T>(
    endpoint: string,
    options: RequestInit = {},
    token?: string | null,
  ): Promise<T> {
    const url = endpoint.startsWith('http')
      ? endpoint
      : `${API_BASE_URL}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...((options.headers as Record<string, string>) || {}),
    };

    let effectiveToken: string | null = null;

    if (token !== undefined && token !== null) {
      effectiveToken = token;
    } else if (this.tokenGetter) {
      try {
        effectiveToken = await this.tokenGetter();
      } catch (err) {
        console.warn('Failed to retrieve fresh token from tokenGetter:', err);
      }
    }

    if (!effectiveToken) {
      effectiveToken = this.authToken;
    }

    if (effectiveToken) {
      headers['Authorization'] = `Bearer ${effectiveToken}`;
    }

    let response = await fetch(url, {
      ...options,
      headers,
      credentials: 'include',
    });

    // Automatic silent refresh on 401 for non-auth endpoints
    if (
      response.status === 401 &&
      !endpoint.includes('/auth/') &&
      !this.isRefreshing
    ) {
      this.isRefreshing = true;
      try {
        const refreshRes = await fetch(`${API_BASE_URL}/auth/refresh`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
        });

        if (refreshRes.ok) {
          const data = await refreshRes.json();
          if (data?.accessToken) {
            this.setAuthToken(data.accessToken);
            headers['Authorization'] = `Bearer ${data.accessToken}`;
            response = await fetch(url, {
              ...options,
              headers,
              credentials: 'include',
            });
          }
        }
      } catch (err) {
        console.warn('Silent token refresh failed:', err);
      } finally {
        this.isRefreshing = false;
      }
    }

    if (!response.ok) {
      let errorMessage = `API request failed with status ${response.status}`;
      try {
        const errJson = await response.json();
        errorMessage = errJson.message || errJson.error || errorMessage;
      } catch {
        // fallback to status text
      }
      throw new Error(errorMessage);
    }

    if (response.status === 204) {
      return {} as T;
    }

    return response.json();
  }

  static get<T>(endpoint: string, token?: string | null): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' }, token);
  }

  static post<T>(
    endpoint: string,
    body?: any,
    token?: string | null,
  ): Promise<T> {
    return this.request<T>(
      endpoint,
      { method: 'POST', body: body ? JSON.stringify(body) : undefined },
      token,
    );
  }

  static put<T>(
    endpoint: string,
    body?: any,
    token?: string | null,
  ): Promise<T> {
    return this.request<T>(
      endpoint,
      { method: 'PUT', body: body ? JSON.stringify(body) : undefined },
      token,
    );
  }

  static patch<T>(
    endpoint: string,
    body?: any,
    token?: string | null,
  ): Promise<T> {
    return this.request<T>(
      endpoint,
      { method: 'PATCH', body: body ? JSON.stringify(body) : undefined },
      token,
    );
  }

  static delete<T>(endpoint: string, token?: string | null): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' }, token);
  }
}
