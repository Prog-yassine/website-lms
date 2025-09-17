import { Navigate, Outlet } from "react-router-dom";
import { useEffect, useState } from "react";

const ProtectedRoute = () => {
  const [isValid, setIsValid] = useState(null); // null = loading, true/false après vérification

  useEffect(() => {
    const verifyToken = async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        setIsValid(false);
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

        if (res.ok) {
          setIsValid(true);
        } else {
          setIsValid(false);
        }
      } catch (err) {
        console.error("Error verifying token:", err);
        setIsValid(false);
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

  // If valid → render child routes
  return <Outlet />;
};

export default ProtectedRoute;
