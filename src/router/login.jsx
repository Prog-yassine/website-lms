import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginType, setLoginType] = useState("root"); // "root" ou "iam"
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    const baseUrl = process.env.REACT_APP_API_URL || "http://localhost:5000";

    const endpoint =
      loginType === "root"
        ? `${baseUrl}/api/auth/root`
        : `${baseUrl}/api/auth/iam`;

    // Prepare body depending on type
    const body =
      loginType === "root"
        ? { email, password }
        : { id: email, secret: password }; // reusing same state vars

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "Login failed");
        return;
      }

      localStorage.setItem("token", data.token);
      navigate("/dashboard/org");
    } catch (err) {
      console.error(err);
      alert("Server error");
    }
  };



  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Left side */}
      <div className="flex flex-col gap-6 p-6 md:p-10">
        <div className="flex justify-center gap-2 md:justify-start">
          <a
            onClick={() => navigate("/")}
            className="flex items-center gap-2 font-semibold text-lg cursor-pointer"
          >
            <div className="text-white flex items-center justify-center rounded-md">
              <img src="./logo.svg" className="w-10 h-10" />
            </div>
            Grupedia
          </a>
        </div>

        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-sm">
            <h2 className="text-4xl font-bold">Welcome back</h2>
            <h2 className="text-sm font-bold text-gray-400">
              Sign in to your account
            </h2>

            {/* Switch Root / IAM */}
            <div className="flex gap-0 my-4">
              <button
                type="button"
                onClick={() => setLoginType("root")}
                className={`flex-1 py-2 cursor-pointer ${
                  loginType === "root"
                    ? "border-b-3 border-emerald-500 text-emerald-500"
                    : "border-b-3 border-white text-gray-700"
                }`}
              >
                Root
              </button>
              <button
                type="button"
                onClick={() => setLoginType("iam")}
                className={`flex-1 py-2 cursor-pointer ${
                  loginType === "iam"
                    ? "border-b-3 border-emerald-500 text-emerald-500"
                    : "border-b-3 border-white text-gray-700"
                }`}
              >
                IAM
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 my-8">
              <div>
                <label className="block text-lg font-medium mb-1">
                    {loginType === "root" ? "Email" : "ID"}
                </label>
                <input
                    type={loginType === "root" ? "email" : "number"}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-emerald-500 focus:ring focus:ring-emerald-200 outline-none"
                />
              </div>

              <div>
                <label className="block text-lg font-medium mb-1">
                    {loginType === "root" ? "Password" : "Secret"}
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-emerald-500 focus:ring focus:ring-emerald-200 outline-none"
                />
              </div>
              <button
                type="submit"
                className="w-full rounded-md bg-emerald-500 text-white py-2 font-medium hover:bg-emerald-700 transition cursor-pointer"
              >
                Sign In
              </button>
            </form>

            <p className="mt-4 text-center text-sm text-gray-500">
              Don’t have an account?{" "}
              <a href="#" className="text-emerald-600 hover:underline">
                Sign up
              </a>
            </p>
          </div>
        </div>
      </div>

      {/* Right side image */}
      <div className="bg-gray-100 relative hidden lg:block"></div>
    </div>
  );
};

export default Login;