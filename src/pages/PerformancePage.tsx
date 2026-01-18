import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useStore } from "../store/useStore";
import
    {
        calculateAchievementPercentage,
        formatCurrency,
        formatNumber,
        formatPercentage,
        generateInitials,
        getAchievementColor,
        getMonthName,
    } from "../utils/formatters";

export default function PerformancePage() {
  const {
    drivers,
    driverPerformance,
    monthlyBudgets,
    kilometerRates,
    selectedYear,
    selectedMonth,
    setSelectedPeriod,
  } = useStore();

  const [sortBy, setSortBy] = useState<"km" | "achievement" | "name">("km");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [typeFilter, setTypeFilter] = useState<"all" | "local" | "export">(
    "all",
  );

  const currentPerformance = useMemo(() => {
    return driverPerformance
      .filter((p) => p.year === selectedYear && p.month === selectedMonth)
      .map((p) => {
        const driver = drivers.find((d) => d.id === p.driver_id);
        const budget = monthlyBudgets.find(
          (b) =>
            b.year === p.year &&
            b.month === p.month &&
            b.driver_type === driver?.driver_type,
        );
        const rate = kilometerRates.find(
          (r) => r.driver_type === driver?.driver_type && r.is_active,
        );
        const target = budget?.budgeted_kilometers || 0;
        const achievement = calculateAchievementPercentage(
          p.actual_kilometers,
          target,
        );
        const estimatedIncentive =
          p.actual_kilometers * (rate?.rate_per_km || 0);

        return {
          ...p,
          driver,
          target,
          achievement,
          estimatedIncentive,
        };
      })
      .filter(
        (p) =>
          p.driver &&
          (typeFilter === "all" || p.driver.driver_type === typeFilter),
      )
      .sort((a, b) => {
        let comparison = 0;
        switch (sortBy) {
          case "km":
            comparison = a.actual_kilometers - b.actual_kilometers;
            break;
          case "achievement":
            comparison = a.achievement - b.achievement;
            break;
          case "name":
            comparison =
              `${a.driver?.first_name} ${a.driver?.last_name}`.localeCompare(
                `${b.driver?.first_name} ${b.driver?.last_name}`,
              );
            break;
        }
        return sortOrder === "desc" ? -comparison : comparison;
      });
  }, [
    driverPerformance,
    drivers,
    monthlyBudgets,
    kilometerRates,
    selectedYear,
    selectedMonth,
    sortBy,
    sortOrder,
    typeFilter,
  ]);

  const stats = useMemo(() => {
    const total = currentPerformance.reduce(
      (sum, p) => sum + p.actual_kilometers,
      0,
    );
    const totalTarget = currentPerformance.reduce(
      (sum, p) => sum + p.target,
      0,
    );
    const totalIncentives = currentPerformance.reduce(
      (sum, p) => sum + p.estimatedIncentive,
      0,
    );
    const avgAchievement =
      currentPerformance.length > 0
        ? currentPerformance.reduce((sum, p) => sum + p.achievement, 0) /
          currentPerformance.length
        : 0;
    const aboveTarget = currentPerformance.filter(
      (p) => p.achievement >= 100,
    ).length;

    return { total, totalTarget, totalIncentives, avgAchievement, aboveTarget };
  }, [currentPerformance]);

  const handleSort = (field: typeof sortBy) => {
    if (sortBy === field) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(field);
      setSortOrder("desc");
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-surface-900">
            Performance
          </h1>
          <p className="text-surface-500 mt-1">
            Track and analyze driver performance metrics
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            className="form-select"
            value={selectedMonth}
            onChange={(e) =>
              setSelectedPeriod(selectedYear, parseInt(e.target.value))
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
              setSelectedPeriod(parseInt(e.target.value), selectedMonth)
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

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white rounded-xl border border-surface-200 p-4">
          <p className="text-sm text-surface-500">Total Kilometers</p>
          <p className="text-2xl font-semibold text-surface-900 mt-1">
            {formatNumber(stats.total)}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-surface-200 p-4">
          <p className="text-sm text-surface-500">Target</p>
          <p className="text-2xl font-semibold text-surface-900 mt-1">
            {formatNumber(stats.totalTarget)}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-surface-200 p-4">
          <p className="text-sm text-surface-500">Avg Achievement</p>
          <p
            className={`text-2xl font-semibold mt-1 ${getAchievementColor(stats.avgAchievement)}`}
          >
            {formatPercentage(stats.avgAchievement)}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-surface-200 p-4">
          <p className="text-sm text-surface-500">Above Target</p>
          <p className="text-2xl font-semibold text-green-600 mt-1">
            {stats.aboveTarget}/{currentPerformance.length}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-surface-200 p-4">
          <p className="text-sm text-surface-500">Est. Incentives</p>
          <p className="text-2xl font-semibold text-primary-600 mt-1">
            {formatCurrency(stats.totalIncentives)}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-surface-200 p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <select
            className="form-select md:w-40"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as typeof typeFilter)}
          >
            <option value="all">All Types</option>
            <option value="local">Local</option>
            <option value="export">Export</option>
          </select>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-surface-500">Sort by:</span>
            <button
              onClick={() => handleSort("km")}
              className={`px-3 py-1.5 rounded-lg ${sortBy === "km" ? "bg-surface-900 text-white" : "bg-surface-100 text-surface-600"}`}
            >
              Kilometers {sortBy === "km" && (sortOrder === "desc" ? "↓" : "↑")}
            </button>
            <button
              onClick={() => handleSort("achievement")}
              className={`px-3 py-1.5 rounded-lg ${sortBy === "achievement" ? "bg-surface-900 text-white" : "bg-surface-100 text-surface-600"}`}
            >
              Achievement{" "}
              {sortBy === "achievement" && (sortOrder === "desc" ? "↓" : "↑")}
            </button>
            <button
              onClick={() => handleSort("name")}
              className={`px-3 py-1.5 rounded-lg ${sortBy === "name" ? "bg-surface-900 text-white" : "bg-surface-100 text-surface-600"}`}
            >
              Name {sortBy === "name" && (sortOrder === "desc" ? "↓" : "↑")}
            </button>
          </div>
        </div>
      </div>

      {/* Performance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {currentPerformance.length > 0 ? (
          currentPerformance.map((item) => (
            <Link
              key={item.id}
              to={`/drivers/${item.driver_id}`}
              className="bg-white rounded-2xl border border-surface-200 p-6 card-hover"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary-100 flex items-center justify-center text-sm font-medium text-primary-700">
                  {generateInitials(
                    item.driver?.first_name || "",
                    item.driver?.last_name || "",
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-surface-900 truncate">
                    {item.driver?.first_name} {item.driver?.last_name}
                  </h3>
                  <p className="text-sm text-surface-500">
                    {item.driver?.employee_id} ·{" "}
                    {item.driver?.driver_type === "local" ? "Local" : "Export"}
                  </p>
                </div>
              </div>

              <div className="mt-6 space-y-4">
                {/* Achievement Bar */}
                <div>
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-surface-500">Target Achievement</span>
                    <span
                      className={`font-semibold ${getAchievementColor(item.achievement)}`}
                    >
                      {formatPercentage(item.achievement)}
                    </span>
                  </div>
                  <div className="h-2 bg-surface-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        item.achievement >= 100
                          ? "bg-green-500"
                          : item.achievement >= 80
                            ? "bg-yellow-500"
                            : "bg-red-500"
                      }`}
                      style={{ width: `${Math.min(item.achievement, 150)}%` }}
                    />
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-4 pt-2">
                  <div>
                    <p className="text-xs text-surface-500">Actual</p>
                    <p className="font-semibold text-surface-900">
                      {formatNumber(item.actual_kilometers)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-surface-500">Target</p>
                    <p className="font-semibold text-surface-900">
                      {formatNumber(item.target)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-surface-500">Trips</p>
                    <p className="font-semibold text-surface-900">
                      {item.trips_completed}
                    </p>
                  </div>
                </div>

                {/* Additional Metrics */}
                <div className="grid grid-cols-3 gap-4 pt-2 border-t border-surface-100">
                  <div>
                    <p className="text-xs text-surface-500">Fuel Eff.</p>
                    <p className="text-sm font-medium text-surface-700">
                      {item.fuel_efficiency
                        ? `${item.fuel_efficiency} km/l`
                        : "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-surface-500">On-Time</p>
                    <p className="text-sm font-medium text-surface-700">
                      {item.on_time_delivery_rate
                        ? formatPercentage(item.on_time_delivery_rate)
                        : "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-surface-500">Safety</p>
                    <p className="text-sm font-medium text-surface-700">
                      {item.safety_score
                        ? formatPercentage(item.safety_score)
                        : "-"}
                    </p>
                  </div>
                </div>

                {/* Estimated Incentive */}
                <div className="pt-2 border-t border-surface-100">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-surface-500">
                      Est. KM Incentive
                    </span>
                    <span className="font-semibold text-green-600">
                      {formatCurrency(item.estimatedIncentive)}
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          ))
        ) : (
          <div className="col-span-full bg-white rounded-2xl border border-surface-200 p-12 text-center">
            <div className="w-16 h-16 rounded-full bg-surface-100 flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-surface-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-surface-900">
              No Performance Data
            </h3>
            <p className="text-surface-500 mt-1">
              No performance records found for {getMonthName(selectedMonth)}{" "}
              {selectedYear}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
