import React from "react";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";

const previousApiUrl = process.env.REACT_APP_API_URL;
process.env.REACT_APP_API_URL = "https://api.example.test";
const { AuthProvider, useAuth } = require("../../auth/AuthContext");
const { apiRequest, clearSession, setAccessToken } = require("../../lib/api");
const Login = require("../../router/login").default;
const Register = require("../../router/register").default;

const USER = { id: "c2218743-25a9-428c-a555-ddddeeeeffff", name: "Alex Teacher", email: "alex@example.com" };
const SESSION = { token: "access-token", user: USER, expiresIn: 900 };
const originalFetch = global.fetch;

function response(payload, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: () => "application/json" },
    json: jest.fn().mockResolvedValue(payload),
  };
}

function SessionProbe() {
  const { status, user } = useAuth();
  return <output data-testid="auth-session">{status}:{user?.email || ""}</output>;
}

function LocationProbe() {
  const location = useLocation();
  return <output data-testid="auth-location">{JSON.stringify({ pathname: location.pathname, state: location.state })}</output>;
}

function renderAuth(path = "/login") {
  return render(
    <AuthProvider>
      <SessionProbe />
      <MemoryRouter initialEntries={[path]}>
        <LocationProbe />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/dashboard" element={<h1>Your dashboard</h1>} />
        </Routes>
      </MemoryRouter>
    </AuthProvider>
  );
}

function installFetch(handler = () => { throw new Error("Unexpected backend request"); }) {
  global.fetch = jest.fn((url, options) => {
    if (url.endsWith("/api/auth/refresh")) {
      return Promise.resolve(response({ error: "No active session" }, 401));
    }
    return handler(url, options);
  });
}

async function waitForAnonymous() {
  await waitFor(() => expect(screen.getByTestId("auth-session")).toHaveTextContent("anonymous:"));
}

function fillLogin() {
  fireEvent.change(screen.getByLabelText("Email"), { target: { value: "alex@example.com" } });
  fireEvent.change(screen.getByLabelText("Password"), { target: { value: "password123" } });
}

function callsTo(endpoint) {
  return fetch.mock.calls.filter(([url]) => url.endsWith(endpoint));
}

function authorization(options) {
  return typeof options.headers?.get === "function" ? options.headers.get("Authorization") :
    options.headers?.Authorization || options.headers?.authorization;
}

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  clearSession();
  installFetch();
});

afterEach(() => {
  cleanup();
  clearSession();
  jest.restoreAllMocks();
});

afterAll(() => {
  if (previousApiUrl === undefined) delete process.env.REACT_APP_API_URL;
  else process.env.REACT_APP_API_URL = previousApiUrl;
  global.fetch = originalFetch;
});

test("an absent refresh cookie leaves a visitor anonymous and removes legacy local tokens", async () => {
  localStorage.setItem("token", "legacy-access-token");
  renderAuth();
  await waitForAnonymous();

  expect(localStorage.getItem("token")).toBeNull();
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  expect(callsTo("/api/auth/refresh")).toHaveLength(1);
  expect(callsTo("/api/auth/refresh")[0][1]).toEqual(expect.objectContaining({
    method: "POST", credentials: "include",
  }));
});

test("a rejected login displays the error without refreshing or storing a session", async () => {
  installFetch((url) => {
    if (url.endsWith("/api/auth/login")) return Promise.resolve(response({ error: "Invalid credentials" }, 401));
    throw new Error(`Unexpected request: ${url}`);
  });
  renderAuth();
  await waitForAnonymous();
  fillLogin();
  fireEvent.click(screen.getByRole("button", { name: /^sign in$/i }));

  expect(await screen.findByRole("alert")).toHaveTextContent("Invalid credentials");
  expect(localStorage.getItem("token")).toBeNull();
  expect(callsTo("/api/auth/refresh")).toHaveLength(1);
  expect(callsTo("/api/auth/login")).toHaveLength(1);
  expect(screen.getByTestId("auth-location")).toHaveTextContent('"pathname":"/login"');
  expect(screen.getByTestId("auth-session")).toHaveTextContent("anonymous:");
});

test("successful login enters the dashboard and uses only the in-memory access token", async () => {
  installFetch((url) => {
    if (url.endsWith("/api/auth/login")) return Promise.resolve(response(SESSION));
    if (url.endsWith("/api/projects")) return Promise.resolve(response({ projects: [] }));
    throw new Error(`Unexpected request: ${url}`);
  });
  renderAuth();
  await waitForAnonymous();
  fillLogin();
  fireEvent.click(screen.getByRole("button", { name: /^sign in$/i }));

  expect(await screen.findByRole("heading", { name: "Your dashboard" })).toBeInTheDocument();
  expect(screen.getByTestId("auth-session")).toHaveTextContent("authenticated:alex@example.com");
  expect(localStorage.getItem("token")).toBeNull();
  const [url, options] = callsTo("/api/auth/login")[0];
  expect(url).toBe("https://api.example.test/api/auth/login");
  expect(options.credentials).toBe("include");
  expect(JSON.parse(options.body)).toEqual({ email: "alex@example.com", password: "password123" });

  await apiRequest("/api/projects");
  expect(authorization(callsTo("/api/projects")[0][1])).toBe("Bearer access-token");
});

test.each([
  ["missing user", { token: "access-token", expiresIn: 900 }],
  ["missing token", { user: USER, expiresIn: 900 }],
  ["malformed user", { token: "access-token", user: { name: "Alex" }, expiresIn: 900 }],
])("a response with %s cannot create a session", async (_, payload) => {
  installFetch((url) => {
    if (url.endsWith("/api/auth/login")) return Promise.resolve(response(payload));
    throw new Error(`Unexpected request: ${url}`);
  });
  renderAuth();
  await waitForAnonymous();
  fillLogin();
  fireEvent.click(screen.getByRole("button", { name: /^sign in$/i }));

  expect(await screen.findByRole("alert")).toHaveTextContent(/valid session|unexpected response/i);
  expect(screen.queryByRole("heading", { name: "Your dashboard" })).not.toBeInTheDocument();
  expect(screen.getByTestId("auth-session")).toHaveTextContent("anonymous:");
  expect(localStorage.getItem("token")).toBeNull();
});

test("sign-in prevents duplicate login requests while the server is responding", async () => {
  let resolveLogin;
  installFetch((url) => {
    if (url.endsWith("/api/auth/login")) {
      return new Promise((resolve) => { resolveLogin = resolve; });
    }
    throw new Error(`Unexpected request: ${url}`);
  });
  renderAuth();
  await waitForAnonymous();
  fillLogin();
  const submit = screen.getByRole("button", { name: /^sign in$/i });
  fireEvent.click(submit);
  fireEvent.click(submit);

  expect(submit).toBeDisabled();
  expect(callsTo("/api/auth/login")).toHaveLength(1);
  await act(async () => { resolveLogin(response({ error: "Invalid credentials" }, 401)); });
  expect(await screen.findByRole("alert")).toHaveTextContent("Invalid credentials");
  expect(submit).not.toBeDisabled();
});

test("registration preserves its payload and returns to sign-in with a success state", async () => {
  installFetch((url) => {
    if (url.endsWith("/api/auth/register")) return Promise.resolve(response({ user: USER }, 201));
    throw new Error(`Unexpected request: ${url}`);
  });
  renderAuth("/register");
  await waitForAnonymous();
  fireEvent.change(screen.getByLabelText("Full name"), { target: { value: "Alex Teacher" } });
  fireEvent.change(screen.getByLabelText("Email"), { target: { value: "alex@example.com" } });
  fireEvent.change(screen.getByLabelText("Password"), { target: { value: "password123" } });
  fireEvent.click(screen.getByRole("button", { name: /^create account$/i }));

  expect(await screen.findByText(/your account is ready/i)).toBeInTheDocument();
  expect(screen.getByTestId("auth-location")).toHaveTextContent('"state":{"registered":true,"email":"alex@example.com"}');
  const [url, options] = callsTo("/api/auth/register")[0];
  expect(url).toBe("https://api.example.test/api/auth/register");
  expect(JSON.parse(options.body)).toEqual({ name: "Alex Teacher", email: "alex@example.com", password: "password123" });
  expect(options.credentials).toBe("include");
  expect(screen.getByTestId("auth-session")).toHaveTextContent("anonymous:");
  expect(localStorage.getItem("token")).toBeNull();
});

test("a valid refresh cookie restores the user and authorizes later API requests", async () => {
  global.fetch = jest.fn((url) => {
    if (url.endsWith("/api/auth/refresh")) return Promise.resolve(response(SESSION));
    if (url.endsWith("/api/projects")) return Promise.resolve(response({ projects: [] }));
    throw new Error(`Unexpected request: ${url}`);
  });
  renderAuth();

  expect(await screen.findByRole("heading", { name: "Your dashboard" })).toBeInTheDocument();
  expect(screen.getByTestId("auth-session")).toHaveTextContent("authenticated:alex@example.com");
  expect(callsTo("/api/auth/login")).toHaveLength(0);
  await apiRequest("/api/projects");
  expect(authorization(callsTo("/api/projects")[0][1])).toBe("Bearer access-token");
  expect(localStorage.getItem("token")).toBeNull();
});

test("concurrent unauthorized requests share one refresh and retry with the new token", async () => {
  setAccessToken("expired-token");
  let resolveRefresh;
  global.fetch = jest.fn((url, options) => {
    if (url.endsWith("/api/auth/refresh")) {
      return new Promise((resolve) => { resolveRefresh = resolve; });
    }
    if (authorization(options) === "Bearer expired-token") {
      return Promise.resolve(response({ error: "Access token expired" }, 401));
    }
    if (authorization(options) === "Bearer renewed-token") {
      return Promise.resolve(response({ ok: true }));
    }
    throw new Error(`Unexpected request: ${url}`);
  });

  const first = apiRequest("/api/projects");
  const second = apiRequest("/api/profile");
  await waitFor(() => expect(callsTo("/api/auth/refresh")).toHaveLength(1));
  resolveRefresh(response({ ...SESSION, token: "renewed-token" }));
  await expect(Promise.all([first, second])).resolves.toEqual([{ ok: true }, { ok: true }]);

  expect(callsTo("/api/auth/refresh")).toHaveLength(1);
  expect(callsTo("/api/projects")).toHaveLength(2);
  expect(callsTo("/api/profile")).toHaveLength(2);
  expect(localStorage.getItem("token")).toBeNull();
});

test.each([401, 503, "network"])("a failed refresh (%s) clears the token and rejects once without a retry loop", async (failure) => {
  setAccessToken("expired-token");
  global.fetch = jest.fn((url) => {
    if (url.endsWith("/api/auth/refresh")) {
      return failure === "network" ? Promise.reject(new Error("Offline")) :
        Promise.resolve(response({ error: "Refresh unavailable" }, failure));
    }
    if (url.endsWith("/api/projects")) {
      return Promise.resolve(response({ error: "Access token expired" }, 401));
    }
    if (url.endsWith("/api/probe")) return Promise.resolve(response({ ok: true }));
    throw new Error(`Unexpected request: ${url}`);
  });

  await expect(apiRequest("/api/projects")).rejects.toMatchObject({ name: "ApiError", status: 401 });
  expect(callsTo("/api/projects")).toHaveLength(1);
  expect(callsTo("/api/auth/refresh")).toHaveLength(1);
  await apiRequest("/api/probe", { retryAuth: false });
  expect(authorization(callsTo("/api/probe")[0][1])).toBeUndefined();
});

function LogoutAction() {
  const { logout } = useAuth();
  return <button onClick={logout}>Sign out of test session</button>;
}

test("a logout network failure still clears the user and the in-memory token", async () => {
  global.fetch = jest.fn((url) => {
    if (url.endsWith("/api/auth/refresh")) return Promise.resolve(response(SESSION));
    if (url.endsWith("/api/auth/logout")) return Promise.reject(new Error("Offline"));
    if (url.endsWith("/api/probe")) return Promise.resolve(response({ ok: true }));
    throw new Error(`Unexpected request: ${url}`);
  });
  render(<AuthProvider><SessionProbe /><LogoutAction /></AuthProvider>);
  await waitFor(() => expect(screen.getByTestId("auth-session")).toHaveTextContent("authenticated:alex@example.com"));

  await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Sign out of test session" })); });
  await waitForAnonymous();
  expect(callsTo("/api/auth/logout")).toHaveLength(1);
  expect(authorization(callsTo("/api/auth/logout")[0][1])).toBe("Bearer access-token");
  await apiRequest("/api/probe", { retryAuth: false });
  expect(authorization(callsTo("/api/probe")[0][1])).toBeUndefined();
  expect(localStorage.getItem("token")).toBeNull();
});

test("unmounting the provider aborts its sole pending bootstrap refresh", async () => {
  let refreshSignal;
  global.fetch = jest.fn((url, { signal }) => {
    if (!url.endsWith("/api/auth/refresh")) throw new Error(`Unexpected request: ${url}`);
    refreshSignal = signal;
    return new Promise((resolve, reject) => {
      signal.addEventListener("abort", () => reject(new DOMException("Cancelled", "AbortError")), { once: true });
    });
  });
  const { unmount } = render(<AuthProvider><SessionProbe /></AuthProvider>);
  expect(callsTo("/api/auth/refresh")).toHaveLength(1);
  expect(refreshSignal.aborted).toBe(false);

  await act(async () => { unmount(); });
  expect(refreshSignal.aborted).toBe(true);
  expect(callsTo("/api/auth/refresh")).toHaveLength(1);
});
