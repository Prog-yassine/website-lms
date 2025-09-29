import { Navigate, Outlet } from "react-router-dom";
import { useEffect, useState, createContext } from "react";

// Create a context to share auth data
export const AuthContext = createContext(null);

const ProtectedRoute = () => {
  const [isValid, setIsValid] = useState(null);
  const [authData, setAuthData] = useState(null); // Store API response data

  useEffect(() => {
    const verifyToken = async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        setIsValid(false);
        setAuthData(null);
        return;
      }

      try {
        const res = await fetch("http://localhost:5000/api/auth/verify", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await res.json();
        if (res.ok) {
          setIsValid(true);
          setAuthData(data); // Save returned data
        } else {
          setIsValid(false);
          setAuthData(null);
        }
      } catch (err) {
        console.error("Error verifying token:", err);
        setIsValid(false);
        setAuthData(null);
      }
    };

    verifyToken();
  }, []);

  // Loading state
  if (isValid === null) {
    return <div className="text-center p-8">Checking authentication...</div>;
  }

  // If token invalid or missing → redirect login
  if (!isValid) {
    return <Navigate to="/login" replace />;
  }

  // Provide authData to child routes via context
  return (
    <AuthContext.Provider value={authData}>
      <Outlet />
    </AuthContext.Provider>
  );
};

export default ProtectedRoute;
