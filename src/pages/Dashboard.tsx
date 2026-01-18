import { Link } from "react-router-dom";
import { useStore } from "../store/useStore";
import
    {
        formatCurrency,
        formatNumber,
        getMonthName,
    } from "../utils/formatters";

export default function Dashboard() {
  const {
    drivers,
    incentiveCalculations,
    driverPerformance,
    kilometerRates,
    selectedYear,
    selectedMonth,
  } = useStore();

  const activeDrivers = drivers.filter((d) => d.status === "active");
  const localDrivers = activeDrivers.filter((d) => d.driver_type === "local");
  const exportDrivers = activeDrivers.filter((d) => d.driver_type === "export");

  // Get current month performance
  const currentPerformance = driverPerformance.filter(
    (p) => p.year === selectedYear && p.month === selectedMonth,
  );

  const totalKilometers = currentPerformance.reduce(
    (sum, p) => sum + p.actual_kilometers,
    0,
  );
  const totalTrips = currentPerformance.reduce(
    (sum, p) => sum + p.trips_completed,
    0,
  );

  // Get current month calculations
  const currentCalculations = incentiveCalculations.filter(
    (c) => c.year === selectedYear && c.month === selectedMonth,
  );

  const totalIncentives = currentCalculations.reduce(
    (sum, c) => sum + c.total_incentive,
    0,
  );
  const totalEarnings = currentCalculations.reduce(
    (sum, c) => sum + c.total_earnings,
    0,
  );

  // Get current rates
  const localRate = kilometerRates.find(
    (r) => r.driver_type === "local" && r.is_active,
  );
  const exportRate = kilometerRates.find(
    (r) => r.driver_type === "export" && r.is_active,
  );

  // Top performers
  const topPerformers = [...currentPerformance]
    .sort((a, b) => b.actual_kilometers - a.actual_kilometers)
    .slice(0, 5)
    .map((p) => {
      const driver = drivers.find((d) => d.id === p.driver_id);
      return { ...p, driver };
    });

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-surface-900">Dashboard</h1>
          <p className="text-surface-500 mt-1">
            Overview for {getMonthName(selectedMonth)} {selectedYear}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            className="form-select"
            value={selectedMonth}
            onChange={(e) =>
              useStore
                .getState()
                .setSelectedPeriod(selectedYear, parseInt(e.target.value))
            }
          >
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i + 1} value={i + 1}>
                {getMonthName(i + 1)}
              </option>
            ))}
          </select>
          <select
            className="form-select"
            value={selectedYear}
            onChange={(e) =>
              useStore
                .getState()
                .setSelectedPeriod(parseInt(e.target.value), selectedMonth)
            }
          >
            {[2024, 2025, 2026].map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="stat-card card-hover">
          <div className="flex items-start justify-between">
            <div>
              <p className="stat-label">Active Drivers</p>
              <p className="stat-value">{activeDrivers.length}</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-primary-50 flex items-center justify-center">
              <svg
                className="w-5 h-5 text-primary-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-4 text-sm">
            <span className="text-surface-500">
              <span className="font-medium text-surface-700">
                {localDrivers.length}
              </span>{" "}
              Local
            </span>
            <span className="text-surface-500">
              <span className="font-medium text-surface-700">
                {exportDrivers.length}
              </span>{" "}
              Export
            </span>
          </div>
        </div>

        <div className="stat-card card-hover">
          <div className="flex items-start justify-between">
            <div>
              <p className="stat-label">Total Kilometers</p>
              <p className="stat-value">{formatNumber(totalKilometers)}</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
              <svg
                className="w-5 h-5 text-green-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                />
              </svg>
            </div>
          </div>
          <p className="mt-4 text-sm text-surface-500">
            {formatNumber(totalTrips)} trips completed this month
          </p>
        </div>

        <div className="stat-card card-hover">
          <div className="flex items-start justify-between">
            <div>
              <p className="stat-label">Total Incentives</p>
              <p className="stat-value">{formatCurrency(totalIncentives)}</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-yellow-50 flex items-center justify-center">
              <svg
                className="w-5 h-5 text-yellow-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
          </div>
          <p className="mt-4 text-sm text-surface-500">
            {formatCurrency(totalEarnings)} total earnings
          </p>
        </div>

        <div className="stat-card card-hover">
          <div className="flex items-start justify-between">
            <div>
              <p className="stat-label">Current Rates</p>
              <div className="mt-2">
                <p className="text-lg font-semibold text-surface-900">
                  {formatCurrency(localRate?.rate_per_km || 0)}/km
                </p>
                <p className="text-xs text-surface-500">Local Rate</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-lg font-semibold text-surface-900 mt-2">
                {formatCurrency(exportRate?.rate_per_km || 0)}/km
              </p>
              <p className="text-xs text-surface-500">Export Rate</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Performers */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-surface-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-surface-100">
            <h2 className="font-semibold text-surface-900">Top Performers</h2>
            <p className="text-sm text-surface-500 mt-0.5">
              Highest kilometers this month
            </p>
          </div>
          <div className="divide-y divide-surface-100">
            {topPerformers.length > 0 ? (
              topPerformers.map((item, index) => (
                <Link
                  key={item.id}
                  to={`/drivers/${item.driver_id}`}
                  className="flex items-center gap-4 px-6 py-4 hover:bg-surface-50 transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-surface-100 flex items-center justify-center text-sm font-medium text-surface-600">
                    {index + 1}
                  </div>
                  <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center text-sm font-medium text-primary-700">
                    {item.driver?.first_name?.charAt(0)}
                    {item.driver?.last_name?.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-surface-900 truncate">
                      {item.driver?.first_name} {item.driver?.last_name}
                    </p>
                    <p className="text-sm text-surface-500">
                      {item.driver?.employee_id} ·{" "}
                      {item.driver?.driver_type === "local"
                        ? "Local"
                        : "Export"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-surface-900">
                      {formatNumber(item.actual_kilometers)} km
                    </p>
                    <p className="text-sm text-surface-500">
                      {item.trips_completed} trips
                    </p>
                  </div>
                </Link>
              ))
            ) : (
              <div className="px-6 py-12 text-center text-surface-500">
                No performance data for this period
              </div>
            )}
          </div>
          <div className="px-6 py-4 border-t border-surface-100">
            <Link
              to="/performance"
              className="text-sm font-medium text-primary-600 hover:text-primary-700"
            >
              View all performance data
            </Link>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-surface-200 p-6">
            <h2 className="font-semibold text-surface-900 mb-4">
              Quick Actions
            </h2>
            <div className="space-y-3">
              <Link
                to="/drivers"
                className="flex items-center gap-3 p-3 rounded-xl hover:bg-surface-50 transition-colors"
              >
                <div className="w-10 h-10 rounded-lg bg-primary-50 flex items-center justify-center">
                  <svg
                    className="w-5 h-5 text-primary-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
                    />
                  </svg>
                </div>
                <div>
                  <p className="font-medium text-surface-900">Manage Drivers</p>
                  <p className="text-sm text-surface-500">
                    Add or edit driver profiles
                  </p>
                </div>
              </Link>
              <Link
                to="/master-sheet"
                className="flex items-center gap-3 p-3 rounded-xl hover:bg-surface-50 transition-colors"
              >
                <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
                  <svg
                    className="w-5 h-5 text-green-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                    />
                  </svg>
                </div>
                <div>
                  <p className="font-medium text-surface-900">Master Sheet</p>
                  <p className="text-sm text-surface-500">
                    Configure rates and budgets
                  </p>
                </div>
              </Link>
              <Link
                to="/performance"
                className="flex items-center gap-3 p-3 rounded-xl hover:bg-surface-50 transition-colors"
              >
                <div className="w-10 h-10 rounded-lg bg-yellow-50 flex items-center justify-center">
                  <svg
                    className="w-5 h-5 text-yellow-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z"
                    />
                  </svg>
                </div>
                <div>
                  <p className="font-medium text-surface-900">Performance</p>
                  <p className="text-sm text-surface-500">
                    Track driver metrics
                  </p>
                </div>
              </Link>
            </div>
          </div>

          {/* Driver Distribution */}
          <div className="bg-white rounded-2xl border border-surface-200 p-6">
            <h2 className="font-semibold text-surface-900 mb-4">
              Driver Distribution
            </h2>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-surface-600">Local Drivers</span>
                  <span className="font-medium text-surface-900">
                    {localDrivers.length}
                  </span>
                </div>
                <div className="h-2 bg-surface-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary-500 rounded-full transition-all"
                    style={{
                      width: `${(localDrivers.length / activeDrivers.length) * 100 || 0}%`,
                    }}
                  />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-surface-600">Export Drivers</span>
                  <span className="font-medium text-surface-900">
                    {exportDrivers.length}
                  </span>
                </div>
                <div className="h-2 bg-surface-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500 rounded-full transition-all"
                    style={{
                      width: `${(exportDrivers.length / activeDrivers.length) * 100 || 0}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
