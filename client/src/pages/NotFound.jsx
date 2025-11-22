import React from "react";
import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="text-center mt-20">
      <h1 className="text-5xl font-bold text-red-500">404</h1>
      <p className="text-slate-300 text-lg mt-2">Page Not Found</p>

      <Link
        to="/auth"
        className="mt-4 inline-block px-4 py-2 bg-cyan-600 rounded hover:bg-cyan-500"
      >
        Go to Login
      </Link>
    </div>
  );
}
