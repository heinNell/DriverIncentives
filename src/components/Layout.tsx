import { useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useStore } from "../store/useStore";

const navigation = [
  { name: "Dashboard", href: "/" },
  { name: "Drivers", href: "/drivers" },
  { name: "Master Sheet", href: "/master-sheet" },
  { name: "Performance", href: "/performance" },
  { name: "Settings", href: "/settings" },
];

export default function Layout() {
  const location = useLocation();
  const { isLoading } = useStore();
  const { user, signOut } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);

  return (
    <div className="min-h-screen bg-surface-50">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-40 glass border-b border-surface-200">
        <div className="max-w-[1600px] mx-auto px-6">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-surface-900 flex items-center justify-center">
                <svg
                  className="w-5 h-5 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0"
                  />
                </svg>
              </div>
              <div>
                <h1 className="text-lg font-semibold text-surface-900">
                  Fleet Incentives
                </h1>
                <p className="text-xs text-surface-500">
                  Driver Management System
                </p>
              </div>
            </div>

            {/* Navigation */}
            <nav className="hidden md:flex items-center gap-1">
              {navigation.map((item) => (
                <NavLink
                  key={item.name}
                  to={item.href}
                  className={({ isActive }) =>
                    `px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      isActive ||
                      (item.href === "/" && location.pathname === "/")
                        ? "bg-surface-900 text-white"
                        : "text-surface-600 hover:text-surface-900 hover:bg-surface-100"
                    }`
                  }
                >
                  {item.name}
                </NavLink>
              ))}
            </nav>

            {/* Right side */}
            <div className="flex items-center gap-4">
              {isLoading && (
                <div className="flex items-center gap-2 text-sm text-surface-500">
                  <div className="w-4 h-4 border-2 border-surface-300 border-t-primary-500 rounded-full animate-spin" />
                  <span>Syncing...</span>
                </div>
              )}

              {/* User Menu */}
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-surface-100 transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center">
                    <span className="text-sm font-medium text-primary-700">
                      {user?.email?.charAt(0).toUpperCase() || "U"}
                    </span>
                  </div>
                  <span className="hidden lg:block text-sm text-surface-700 max-w-[150px] truncate">
                    {user?.email || "User"}
                  </span>
                  <svg
                    className="w-4 h-4 text-surface-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>

                {showUserMenu && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setShowUserMenu(false)}
                    />
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-surface-200 py-2 z-50">
                      <div className="px-4 py-3 border-b border-surface-100">
                        <p className="text-sm font-medium text-surface-900">
                          Signed in as
                        </p>
                        <p className="text-sm text-surface-500 truncate">
                          {user?.email}
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          signOut();
                          setShowUserMenu(false);
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                          />
                        </svg>
                        Sign out
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Navigation */}
      <div className="fixed bottom-0 left-0 right-0 z-40 md:hidden glass border-t border-surface-200">
        <nav className="flex items-center justify-around py-2">
          {navigation.map((item) => (
            <NavLink
              key={item.name}
              to={item.href}
              className={({ isActive }) =>
                `flex flex-col items-center gap-1 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                  isActive ? "text-primary-600" : "text-surface-500"
                }`
              }
            >
              {item.name}
            </NavLink>
          ))}
        </nav>
      </div>

      {/* Main Content */}
      <main className="pt-16 pb-20 md:pb-0 min-h-screen">
        <div className="max-w-[1600px] mx-auto px-6 py-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
