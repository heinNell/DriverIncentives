import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import AddDriverModal from "../components/AddDriverModal";
import { useStore } from "../store/useStore";
import {
    formatCurrency,
    formatDate,
    generateInitials,
    getStatusColor,
} from "../utils/formatters";

type FilterStatus = "all" | "active" | "inactive" | "suspended" | "terminated";
type FilterType = "all" | "local" | "export";

export default function DriversPage() {
  const { drivers } = useStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<FilterStatus>("all");
  const [typeFilter, setTypeFilter] = useState<FilterType>("all");
  const [showAddModal, setShowAddModal] = useState(false);

  const filteredDrivers = useMemo(() => {
    return drivers.filter((driver) => {
      // Search filter
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch =
        driver.first_name.toLowerCase().includes(searchLower) ||
        driver.last_name.toLowerCase().includes(searchLower) ||
        driver.employee_id.toLowerCase().includes(searchLower) ||
        driver.license_number.toLowerCase().includes(searchLower);

      // Status filter
      const matchesStatus =
        statusFilter === "all" || driver.status === statusFilter;

      // Type filter
      const matchesType =
        typeFilter === "all" || driver.driver_type === typeFilter;

      return matchesSearch && matchesStatus && matchesType;
    });
  }, [drivers, searchQuery, statusFilter, typeFilter]);

  const stats = useMemo(
    () => ({
      total: drivers.length,
      active: drivers.filter((d) => d.status === "active").length,
      local: drivers.filter(
        (d) => d.driver_type === "local" && d.status === "active",
      ).length,
      export: drivers.filter(
        (d) => d.driver_type === "export" && d.status === "active",
      ).length,
    }),
    [drivers],
  );

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-surface-900">Drivers</h1>
          <p className="text-surface-500 mt-1">
            Manage your fleet drivers and their profiles
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="btn btn-primary"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
          Add Driver
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-surface-200 p-4">
          <p className="text-sm text-surface-500">Total Drivers</p>
          <p className="text-2xl font-semibold text-surface-900 mt-1">
            {stats.total}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-surface-200 p-4">
          <p className="text-sm text-surface-500">Active</p>
          <p className="text-2xl font-semibold text-green-600 mt-1">
            {stats.active}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-surface-200 p-4">
          <p className="text-sm text-surface-500">Local</p>
          <p className="text-2xl font-semibold text-primary-600 mt-1">
            {stats.local}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-surface-200 p-4">
          <p className="text-sm text-surface-500">Export</p>
          <p className="text-2xl font-semibold text-yellow-600 mt-1">
            {stats.export}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-surface-200 p-4">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="text"
              placeholder="Search by name, ID, or license..."
              className="form-input pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Status Filter */}
          <select
            className="form-select md:w-40"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as FilterStatus)}
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="suspended">Suspended</option>
            <option value="terminated">Terminated</option>
          </select>

          {/* Type Filter */}
          <select
            className="form-select md:w-40"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as FilterType)}
          >
            <option value="all">All Types</option>
            <option value="local">Local</option>
            <option value="export">Export</option>
          </select>
        </div>
      </div>

      {/* Drivers Table */}
      <div className="bg-white rounded-xl border border-surface-200 overflow-hidden">
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Driver</th>
                <th>Employee ID</th>
                <th>Type</th>
                <th>License</th>
                <th>Hire Date</th>
                <th>Base Salary</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filteredDrivers.length > 0 ? (
                filteredDrivers.map((driver) => (
                  <tr key={driver.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center text-sm font-medium text-primary-700">
                          {generateInitials(
                            driver.first_name,
                            driver.last_name,
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-surface-900">
                            {driver.first_name} {driver.last_name}
                          </p>
                          <p className="text-xs text-surface-500">
                            {driver.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="font-mono text-sm">{driver.employee_id}</td>
                    <td>
                      <span
                        className={`badge ${driver.driver_type === "local" ? "badge-info" : "badge-warning"}`}
                      >
                        {driver.driver_type === "local" ? "Local" : "Export"}
                      </span>
                    </td>
                    <td>
                      <div>
                        <p className="font-mono text-sm">
                          {driver.license_number}
                        </p>
                        <p className="text-xs text-surface-500">
                          Exp: {formatDate(driver.license_expiry)}
                        </p>
                      </div>
                    </td>
                    <td>{formatDate(driver.hire_date)}</td>
                    <td className="font-medium">
                      {formatCurrency(driver.base_salary)}
                    </td>
                    <td>
                      <span
                        className={`badge ${getStatusColor(driver.status)}`}
                      >
                        {driver.status.charAt(0).toUpperCase() +
                          driver.status.slice(1)}
                      </span>
                    </td>
                    <td>
                      <Link
                        to={`/drivers/${driver.id}`}
                        className="text-primary-600 hover:text-primary-700 font-medium text-sm"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={8}
                    className="text-center py-12 text-surface-500"
                  >
                    {drivers.length === 0
                      ? "No drivers found. Add your first driver to get started."
                      : "No drivers match your search criteria."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Driver Modal */}
      {showAddModal && (
        <AddDriverModal onClose={() => setShowAddModal(false)} />
      )}
    </div>
  );
}
