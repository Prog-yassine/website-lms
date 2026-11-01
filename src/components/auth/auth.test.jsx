import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
  useLocation: () => ({ pathname: "/login", state: null }),
  Link: ({ to, children, ...props }) => {
    const React = require("react");
    return React.createElement("a", { href: to, ...props }, children);
  },
}), { virtual: true });

const previousApiUrl = process.env.REACT_APP_API_URL;
process.env.REACT_APP_API_URL = "https://api.example.test";
const Login = require("../../router/login").default;
const Register = require("../../router/register").default;

function response(payload, ok = true) {
  return {
    ok,
    status: ok ? 200 : 401,
    headers: { get: () => "application/json" },
    json: jest.fn().mockResolvedValue(payload),
  };
}

function fillRootLogin() {
  fireEvent.change(screen.getByLabelText("Email"), { target: { value: "teacher@example.com" } });
  fireEvent.change(screen.getByLabelText("Password"), { target: { value: "password123" } });
}

beforeEach(() => {
  mockNavigate.mockClear();
  localStorage.clear();
  global.fetch = jest.fn();
});

afterAll(() => {
  if (previousApiUrl === undefined) delete process.env.REACT_APP_API_URL;
  else process.env.REACT_APP_API_URL = previousApiUrl;
  delete global.fetch;
});

test("a rejected sign-in displays the server error without storing a session", async () => {
  fetch.mockResolvedValue(response({ error: "Invalid credentials" }, false));
  render(<Login />);
  fillRootLogin();
  fireEvent.click(screen.getByRole("button", { name: /^sign in$/i }));

  expect(await screen.findByRole("alert")).toHaveTextContent("Invalid credentials");
  expect(localStorage.getItem("token")).toBeNull();
  expect(mockNavigate).not.toHaveBeenCalled();
});

test("successful account-owner sign-in stores the token and opens the coming-soon page", async () => {
  fetch.mockResolvedValue(response({ token: "valid-session-token" }));
  render(<Login />);
  fillRootLogin();
  fireEvent.click(screen.getByRole("button", { name: /^sign in$/i }));

  await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith("/coming-soon", { replace: true }));
  expect(localStorage.getItem("token")).toBe("valid-session-token");
  expect(fetch).toHaveBeenCalledWith("https://api.example.test/api/auth/root", expect.objectContaining({
    method: "POST",
    body: JSON.stringify({ email: "teacher@example.com", password: "password123" }),
  }));
});

test("IAM sign-in sends the existing id and secret contract", async () => {
  fetch.mockResolvedValue(response({ token: "iam-session-token" }));
  render(<Login />);
  fireEvent.click(screen.getByRole("tab", { name: "IAM user" }));
  fireEvent.change(screen.getByLabelText("IAM ID"), { target: { value: "1042" } });
  fireEvent.change(screen.getByLabelText("Secret"), { target: { value: "iam-secret" } });
  fireEvent.click(screen.getByRole("button", { name: /^sign in$/i }));

  await waitFor(() => expect(mockNavigate).toHaveBeenCalled());
  expect(fetch).toHaveBeenCalledWith("https://api.example.test/api/auth/iam", expect.objectContaining({
    method: "POST",
    body: JSON.stringify({ id: "1042", secret: "iam-secret" }),
  }));
  expect(localStorage.getItem("token")).toBe("iam-session-token");
});

test("a success response without a token cannot create a session", async () => {
  fetch.mockResolvedValue(response({ message: "Login successful" }));
  render(<Login />);
  fillRootLogin();
  fireEvent.click(screen.getByRole("button", { name: /^sign in$/i }));

  expect(await screen.findByRole("alert")).toHaveTextContent(/valid session/i);
  expect(localStorage.getItem("token")).toBeNull();
  expect(mockNavigate).not.toHaveBeenCalled();
});

test("sign-in prevents duplicate requests while a request is pending", async () => {
  let resolveRequest;
  fetch.mockImplementation(() => new Promise((resolve) => { resolveRequest = resolve; }));
  render(<Login />);
  fillRootLogin();
  const submit = screen.getByRole("button", { name: /^sign in$/i });
  fireEvent.click(submit);
  fireEvent.click(submit);

  expect(submit).toBeDisabled();
  expect(fetch).toHaveBeenCalledTimes(1);
  resolveRequest(response({ error: "Invalid credentials" }, false));
  expect(await screen.findByRole("alert")).toHaveTextContent("Invalid credentials");
  expect(submit).not.toBeDisabled();
});

test("registration uses the configured API and returns to login with a success state", async () => {
  fetch.mockResolvedValue(response({ user: { uuid: "new-account" } }));
  render(<Register />);
  fireEvent.change(screen.getByLabelText("Full name"), { target: { value: "Alex Teacher" } });
  fireEvent.change(screen.getByLabelText("Email"), { target: { value: "alex@example.com" } });
  fireEvent.change(screen.getByLabelText("Password"), { target: { value: "password123" } });
  fireEvent.click(screen.getByRole("button", { name: /^create account$/i }));

  await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith("/login", {
    state: { registered: true, email: "alex@example.com" },
  }));
  expect(fetch).toHaveBeenCalledWith("https://api.example.test/api/auth/register", expect.objectContaining({
    method: "POST",
    body: JSON.stringify({ name: "Alex Teacher", email: "alex@example.com", password: "password123" }),
  }));
  expect(localStorage.getItem("token")).toBeNull();
});
