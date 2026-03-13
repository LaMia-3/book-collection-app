import {
  AuthUser,
  clearStoredAuthSession,
  getStoredAuthToken,
} from "@/lib/auth-storage";

type ApiErrorPayload = {
  error?: {
    code?: string;
    message?: string;
    details?: unknown;
  };
};

type ApiRequestOptions = {
  auth?: boolean;
  body?: unknown;
  headers?: HeadersInit;
  method?: string;
};

type AuthResponse = {
  token: string;
  user: AuthUser;
};

export class ApiClientError extends Error {
  status: number;
  code?: string;
  details?: unknown;

  constructor(status: number, message: string, code?: string, details?: unknown) {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export const getApiBaseUrl = (): string => {
  const configuredBaseUrl = import.meta.env.VITE_API_URL?.trim();

  if (configuredBaseUrl) {
    return configuredBaseUrl.replace(/\/$/, "");
  }

  return "/api";
};

const buildHeaders = (auth = false, headers?: HeadersInit): Headers => {
  const requestHeaders = new Headers(headers);

  if (!requestHeaders.has("Content-Type")) {
    requestHeaders.set("Content-Type", "application/json");
  }

  if (auth) {
    const token = getStoredAuthToken();

    if (token) {
      requestHeaders.set("Authorization", `Bearer ${token}`);
    }
  }

  return requestHeaders;
};

const parseResponseBody = async (response: Response): Promise<unknown> => {
  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    return response.json();
  }

  return response.text();
};

export const apiRequest = async <T>(
  path: string,
  { auth = false, body, headers, method = "GET" }: ApiRequestOptions = {},
): Promise<T> => {
  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    method,
    headers: buildHeaders(auth, headers),
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const responseBody = await parseResponseBody(response);

  if (!response.ok) {
    const errorPayload =
      typeof responseBody === "object" && responseBody !== null
        ? (responseBody as ApiErrorPayload)
        : undefined;

    if (response.status === 401 && auth) {
      clearStoredAuthSession();
    }

    throw new ApiClientError(
      response.status,
      errorPayload?.error?.message || "Request failed.",
      errorPayload?.error?.code,
      errorPayload?.error?.details,
    );
  }

  return responseBody as T;
};

export const authApi = {
  login: (payload: { email: string; password: string }) =>
    apiRequest<AuthResponse>("/auth/login", {
      method: "POST",
      body: payload,
    }),
  register: (payload: {
    email: string;
    password: string;
    preferredName?: string;
  }) =>
    apiRequest<AuthResponse>("/auth/register", {
      method: "POST",
      body: payload,
    }),
  me: () =>
    apiRequest<AuthUser>("/auth/me", {
      auth: true,
    }),
};
