import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import AddRecordModal from "../components/AddRecordModal";
import EditDriverModal from "../components/EditDriverModal";
import { useDriverRecords } from "../hooks/useRealtimeData";
import { isSupabaseConfigured, supabase } from "../lib/supabase";
import { useStore } from "../store/useStore";
import {
    calculateAchievementPercentage,
    formatCurrency,
    formatDate,
    formatNumber,
    formatPercentage,
    generateInitials,
    getAchievementColor,
    getDisciplinaryTypeLabel,
    getIncidentTypeLabel,
    getLeaveTypeLabel,
    getMonthName,
    getSeverityColor,
    getStatusColor,
} from "../utils/formatters";

type TabId = "overview" | "performance" | "records" | "incentives";

export default function DriverProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    drivers,
    driverPerformance,
    incentiveCalculations,
    monthlyBudgets,
    kilometerRates,
    showToast,
  } = useStore();
  const {
    accidents,
    incidents,
    disciplinaryRecords,
    leaveRecords,
    loading: recordsLoading,
  } = useDriverRecords(id);

  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddRecordModal, setShowAddRecordModal] = useState<string | null>(
    null,
  );
  const [isDeleting, setIsDeleting] = useState(false);

  const driver = drivers.find((d) => d.id === id);
  const performance = driverPerformance
    .filter((p) => p.driver_id === id)
    .sort((a, b) => {
      if (b.year !== a.year) return b.year - a.year;
      return b.month - a.month;
    });
  const calculations = incentiveCalculations
    .filter((c) => c.driver_id === id)
    .sort((a, b) => {
      if (b.year !== a.year) return b.year - a.year;
      return b.month - a.month;
    });

  if (!driver) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-16 h-16 rounded-full bg-surface-100 flex items-center justify-center mb-4">
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
              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
            />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-surface-900">
          Driver Not Found
        </h2>
        <p className="text-surface-500 mt-1">
          The driver you're looking for doesn't exist or has been removed.
        </p>
        <Link to="/drivers" className="btn btn-primary mt-6">
          Back to Drivers
        </Link>
      </div>
    );
  }

  const currentRate = kilometerRates.find(
    (r) => r.driver_type === driver.driver_type && r.is_active,
  );

  // Calculate summary stats
  const totalKilometers = performance.reduce(
    (sum, p) => sum + p.actual_kilometers,
    0,
  );
  const totalTrips = performance.reduce((sum, p) => sum + p.trips_completed, 0);
  const totalIncentives = calculations.reduce(
    (sum, c) => sum + c.total_incentive,
    0,
  );
  const totalLeaveDays = leaveRecords
    .filter((l) => l.status === "approved")
    .reduce((sum, l) => sum + l.total_days, 0);

  const handleDelete = async () => {
    if (
      !confirm(
        "Are you sure you want to delete this driver? This action cannot be undone.",
      )
    )
      return;

    if (!isSupabaseConfigured()) {
      showToast("Cannot delete in demo mode");
      return;
    }

    setIsDeleting(true);
    try {
      const { error } = await supabase.from("drivers").delete().eq("id", id);
      if (error) throw error;
      showToast("Driver deleted successfully");
      navigate("/drivers");
    } catch (error) {
      console.error("Error deleting driver:", error);
      showToast("Error deleting driver");
    } finally {
      setIsDeleting(false);
    }
  };

  const tabs: { id: TabId; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "performance", label: "Performance" },
    { id: "records", label: "Records" },
    { id: "incentives", label: "Incentives" },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-surface-500">
        <Link to="/drivers" className="hover:text-surface-700">
          Drivers
        </Link>
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
            d="M9 5l7 7-7 7"
          />
        </svg>
        <span className="text-surface-900">
          {driver.first_name} {driver.last_name}
        </span>
      </nav>

      {/* Profile Header */}
      <div className="bg-white rounded-2xl border border-surface-200 p-6">
        <div className="flex flex-col md:flex-row md:items-start gap-6">
          {/* Avatar & Basic Info */}
          <div className="flex items-start gap-4 flex-1">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-2xl font-semibold text-white">
              {generateInitials(driver.first_name, driver.last_name)}
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-surface-900">
                {driver.first_name} {driver.last_name}
              </h1>
              <p className="text-surface-500 mt-1">{driver.employee_id}</p>
              <div className="flex items-center gap-3 mt-3">
                <span className={`badge ${getStatusColor(driver.status)}`}>
                  {driver.status.charAt(0).toUpperCase() +
                    driver.status.slice(1)}
                </span>
                <span
                  className={`badge ${driver.driver_type === "local" ? "badge-info" : "badge-warning"}`}
                >
                  {driver.driver_type === "local"
                    ? "Local Driver"
                    : "Export Driver"}
                </span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowEditModal(true)}
              className="btn btn-secondary"
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
                  d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                />
              </svg>
              Edit
            </button>
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="btn btn-danger"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-surface-100">
          <div>
            <p className="text-sm text-surface-500">Total Kilometers</p>
            <p className="text-xl font-semibold text-surface-900">
              {formatNumber(totalKilometers)}
            </p>
          </div>
          <div>
            <p className="text-sm text-surface-500">Total Trips</p>
            <p className="text-xl font-semibold text-surface-900">
              {formatNumber(totalTrips)}
            </p>
          </div>
          <div>
            <p className="text-sm text-surface-500">Total Incentives</p>
            <p className="text-xl font-semibold text-green-600">
              {formatCurrency(totalIncentives)}
            </p>
          </div>
          <div>
            <p className="text-sm text-surface-500">Leave Days Used</p>
            <p className="text-xl font-semibold text-surface-900">
              {totalLeaveDays}
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tab-list inline-flex">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`tab-item ${activeTab === tab.id ? "active" : ""}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="animate-fade-in">
        {activeTab === "overview" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Personal Information */}
            <div className="bg-white rounded-2xl border border-surface-200 p-6">
              <h2 className="font-semibold text-surface-900 mb-4">
                Personal Information
              </h2>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-surface-500">Email</p>
                    <p className="font-medium text-surface-900">
                      {driver.email || "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-surface-500">Phone</p>
                    <p className="font-medium text-surface-900">
                      {driver.phone || "-"}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-surface-500">Date of Birth</p>
                    <p className="font-medium text-surface-900">
                      {formatDate(driver.date_of_birth)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-surface-500">Hire Date</p>
                    <p className="font-medium text-surface-900">
                      {formatDate(driver.hire_date)}
                    </p>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-surface-500">Address</p>
                  <p className="font-medium text-surface-900">
                    {driver.address || "-"}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-surface-500">
                      Emergency Contact
                    </p>
                    <p className="font-medium text-surface-900">
                      {driver.emergency_contact_name || "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-surface-500">Emergency Phone</p>
                    <p className="font-medium text-surface-900">
                      {driver.emergency_contact_phone || "-"}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* License & Documents */}
            <div className="bg-white rounded-2xl border border-surface-200 p-6">
              <h2 className="font-semibold text-surface-900 mb-4">
                License & Documents
              </h2>
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-surface-50 border border-surface-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-surface-500">License Number</p>
                      <p className="font-mono font-medium text-surface-900">
                        {driver.license_number}
                      </p>
                    </div>
                    <span className="badge badge-info">
                      {driver.license_class || "N/A"}
                    </span>
                  </div>
                  <div className="mt-3 pt-3 border-t border-surface-200">
                    <p className="text-sm text-surface-500">Expires</p>
                    <p className="font-medium text-surface-900">
                      {formatDate(driver.license_expiry)}
                    </p>
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-surface-50 border border-surface-100">
                  <div>
                    <p className="text-sm text-surface-500">Passport Number</p>
                    <p className="font-mono font-medium text-surface-900">
                      {driver.passport_number || "-"}
                    </p>
                  </div>
                  <div className="mt-3 pt-3 border-t border-surface-200">
                    <p className="text-sm text-surface-500">Expires</p>
                    <p className="font-medium text-surface-900">
                      {formatDate(driver.passport_expiry)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Salary Information */}
            <div className="bg-white rounded-2xl border border-surface-200 p-6">
              <h2 className="font-semibold text-surface-900 mb-4">
                Salary Information
              </h2>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-surface-500">Base Salary</p>
                  <p className="text-2xl font-semibold text-surface-900">
                    {formatCurrency(driver.base_salary)}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-surface-500">Driver Type</p>
                    <p className="font-medium text-surface-900">
                      {driver.driver_type === "local" ? "Local" : "Export"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-surface-500">Rate per KM</p>
                    <p className="font-medium text-surface-900">
                      {formatCurrency(currentRate?.rate_per_km || 0)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Notes */}
            <div className="bg-white rounded-2xl border border-surface-200 p-6">
              <h2 className="font-semibold text-surface-900 mb-4">Notes</h2>
              <p className="text-surface-600">
                {driver.notes || "No notes available for this driver."}
              </p>
            </div>
          </div>
        )}

        {activeTab === "performance" && (
          <div className="bg-white rounded-2xl border border-surface-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-surface-100">
              <h2 className="font-semibold text-surface-900">
                Monthly Performance
              </h2>
            </div>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Period</th>
                    <th>Actual KM</th>
                    <th>Target KM</th>
                    <th>Achievement</th>
                    <th>Trips</th>
                    <th>Fuel Efficiency</th>
                    <th>On-Time Rate</th>
                    <th>Safety Score</th>
                  </tr>
                </thead>
                <tbody>
                  {performance.length > 0 ? (
                    performance.map((p) => {
                      const budget = monthlyBudgets.find(
                        (b) =>
                          b.year === p.year &&
                          b.month === p.month &&
                          b.driver_type === driver.driver_type,
                      );
                      const target = budget?.budgeted_kilometers || 0;
                      const achievement = calculateAchievementPercentage(
                        p.actual_kilometers,
                        target,
                      );

                      return (
                        <tr key={p.id}>
                          <td className="font-medium">
                            {getMonthName(p.month)} {p.year}
                          </td>
                          <td>{formatNumber(p.actual_kilometers)}</td>
                          <td>{formatNumber(target)}</td>
                          <td>
                            <span
                              className={`font-medium ${getAchievementColor(achievement)}`}
                            >
                              {formatPercentage(achievement)}
                            </span>
                          </td>
                          <td>{p.trips_completed}</td>
                          <td>
                            {p.fuel_efficiency
                              ? `${p.fuel_efficiency} km/l`
                              : "-"}
                          </td>
                          <td>
                            {p.on_time_delivery_rate
                              ? formatPercentage(p.on_time_delivery_rate)
                              : "-"}
                          </td>
                          <td>
                            {p.safety_score
                              ? formatPercentage(p.safety_score)
                              : "-"}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td
                        colSpan={8}
                        className="text-center py-12 text-surface-500"
                      >
                        No performance data available
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === "records" && (
          <div className="space-y-6">
            {/* Accidents */}
            <div className="bg-white rounded-2xl border border-surface-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-surface-100 flex items-center justify-between">
                <div>
                  <h2 className="font-semibold text-surface-900">Accidents</h2>
                  <p className="text-sm text-surface-500">
                    {accidents.length} records
                  </p>
                </div>
                <button
                  onClick={() => setShowAddRecordModal("accident")}
                  className="btn btn-secondary text-sm"
                >
                  Add Record
                </button>
              </div>
              {recordsLoading ? (
                <div className="p-6 space-y-3">
                  <div className="skeleton h-12 w-full" />
                  <div className="skeleton h-12 w-full" />
                </div>
              ) : accidents.length > 0 ? (
                <div className="divide-y divide-surface-100">
                  {accidents.map((accident) => (
                    <div key={accident.id} className="px-6 py-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span
                              className={`badge ${getSeverityColor(accident.incident_type)}`}
                            >
                              {accident.incident_type.charAt(0).toUpperCase() +
                                accident.incident_type.slice(1)}
                            </span>
                            {accident.at_fault && (
                              <span className="badge badge-danger">
                                At Fault
                              </span>
                            )}
                          </div>
                          <p className="mt-2 text-surface-900">
                            {accident.description}
                          </p>
                          <p className="mt-1 text-sm text-surface-500">
                            {accident.location && `${accident.location} · `}
                            {formatDate(accident.incident_date)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium text-surface-900">
                            {formatCurrency(
                              accident.vehicle_damage_cost +
                                accident.third_party_cost,
                            )}
                          </p>
                          <p className="text-sm text-surface-500">Total Cost</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="px-6 py-12 text-center text-surface-500">
                  No accident records
                </div>
              )}
            </div>

            {/* Incidents */}
            <div className="bg-white rounded-2xl border border-surface-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-surface-100 flex items-center justify-between">
                <div>
                  <h2 className="font-semibold text-surface-900">Incidents</h2>
                  <p className="text-sm text-surface-500">
                    {incidents.length} records
                  </p>
                </div>
                <button
                  onClick={() => setShowAddRecordModal("incident")}
                  className="btn btn-secondary text-sm"
                >
                  Add Record
                </button>
              </div>
              {recordsLoading ? (
                <div className="p-6 space-y-3">
                  <div className="skeleton h-12 w-full" />
                  <div className="skeleton h-12 w-full" />
                </div>
              ) : incidents.length > 0 ? (
                <div className="divide-y divide-surface-100">
                  {incidents.map((incident) => (
                    <div key={incident.id} className="px-6 py-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span
                              className={`badge ${getSeverityColor(incident.severity)}`}
                            >
                              {incident.severity.charAt(0).toUpperCase() +
                                incident.severity.slice(1)}
                            </span>
                            <span className="badge badge-neutral">
                              {getIncidentTypeLabel(incident.incident_type)}
                            </span>
                          </div>
                          <p className="mt-2 text-surface-900">
                            {incident.description}
                          </p>
                          <p className="mt-1 text-sm text-surface-500">
                            {formatDate(incident.incident_date)}
                          </p>
                        </div>
                        {incident.fine_amount > 0 && (
                          <div className="text-right">
                            <p className="font-medium text-red-600">
                              {formatCurrency(incident.fine_amount)}
                            </p>
                            <p className="text-sm text-surface-500">Fine</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="px-6 py-12 text-center text-surface-500">
                  No incident records
                </div>
              )}
            </div>

            {/* Disciplinary Records */}
            <div className="bg-white rounded-2xl border border-surface-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-surface-100 flex items-center justify-between">
                <div>
                  <h2 className="font-semibold text-surface-900">
                    Disciplinary Records
                  </h2>
                  <p className="text-sm text-surface-500">
                    {disciplinaryRecords.length} records
                  </p>
                </div>
                <button
                  onClick={() => setShowAddRecordModal("disciplinary")}
                  className="btn btn-secondary text-sm"
                >
                  Add Record
                </button>
              </div>
              {recordsLoading ? (
                <div className="p-6 space-y-3">
                  <div className="skeleton h-12 w-full" />
                </div>
              ) : disciplinaryRecords.length > 0 ? (
                <div className="divide-y divide-surface-100">
                  {disciplinaryRecords.map((record) => (
                    <div key={record.id} className="px-6 py-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <span
                            className={`badge ${
                              record.record_type === "verbal_warning"
                                ? "badge-info"
                                : record.record_type === "written_warning"
                                  ? "badge-warning"
                                  : "badge-danger"
                            }`}
                          >
                            {getDisciplinaryTypeLabel(record.record_type)}
                          </span>
                          <p className="mt-2 text-surface-900">
                            {record.reason}
                          </p>
                          {record.description && (
                            <p className="mt-1 text-sm text-surface-600">
                              {record.description}
                            </p>
                          )}
                          <p className="mt-1 text-sm text-surface-500">
                            {formatDate(record.record_date)}
                            {record.issued_by &&
                              ` · Issued by ${record.issued_by}`}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="px-6 py-12 text-center text-surface-500">
                  No disciplinary records
                </div>
              )}
            </div>

            {/* Leave Records */}
            <div className="bg-white rounded-2xl border border-surface-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-surface-100 flex items-center justify-between">
                <div>
                  <h2 className="font-semibold text-surface-900">
                    Leave Records
                  </h2>
                  <p className="text-sm text-surface-500">
                    {leaveRecords.length} records
                  </p>
                </div>
                <button
                  onClick={() => setShowAddRecordModal("leave")}
                  className="btn btn-secondary text-sm"
                >
                  Add Record
                </button>
              </div>
              {recordsLoading ? (
                <div className="p-6 space-y-3">
                  <div className="skeleton h-12 w-full" />
                </div>
              ) : leaveRecords.length > 0 ? (
                <div className="divide-y divide-surface-100">
                  {leaveRecords.map((leave) => (
                    <div key={leave.id} className="px-6 py-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="badge badge-info">
                              {getLeaveTypeLabel(leave.leave_type)}
                            </span>
                            <span
                              className={`badge ${getStatusColor(leave.status)}`}
                            >
                              {leave.status.charAt(0).toUpperCase() +
                                leave.status.slice(1)}
                            </span>
                          </div>
                          <p className="mt-2 text-surface-900">
                            {formatDate(leave.start_date)} -{" "}
                            {formatDate(leave.end_date)}
                          </p>
                          {leave.reason && (
                            <p className="mt-1 text-sm text-surface-600">
                              {leave.reason}
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="font-medium text-surface-900">
                            {leave.total_days} days
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="px-6 py-12 text-center text-surface-500">
                  No leave records
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "incentives" && (
          <div className="bg-white rounded-2xl border border-surface-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-surface-100">
              <h2 className="font-semibold text-surface-900">
                Incentive History
              </h2>
            </div>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Period</th>
                    <th>Base Salary</th>
                    <th>KM Incentive</th>
                    <th>Performance Bonus</th>
                    <th>Safety Bonus</th>
                    <th>Deductions</th>
                    <th>Total Incentive</th>
                    <th>Total Earnings</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {calculations.length > 0 ? (
                    calculations.map((calc) => (
                      <tr key={calc.id}>
                        <td className="font-medium">
                          {getMonthName(calc.month)} {calc.year}
                        </td>
                        <td>{formatCurrency(calc.base_salary)}</td>
                        <td className="text-green-600">
                          {formatCurrency(calc.km_incentive)}
                        </td>
                        <td className="text-green-600">
                          {formatCurrency(calc.performance_bonus)}
                        </td>
                        <td className="text-green-600">
                          {formatCurrency(calc.safety_bonus)}
                        </td>
                        <td className="text-red-600">
                          -{formatCurrency(calc.deductions)}
                        </td>
                        <td className="font-medium text-primary-600">
                          {formatCurrency(calc.total_incentive)}
                        </td>
                        <td className="font-semibold">
                          {formatCurrency(calc.total_earnings)}
                        </td>
                        <td>
                          <span
                            className={`badge ${getStatusColor(calc.status)}`}
                          >
                            {calc.status
                              .replace("_", " ")
                              .charAt(0)
                              .toUpperCase() +
                              calc.status.replace("_", " ").slice(1)}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={9}
                        className="text-center py-12 text-surface-500"
                      >
                        No incentive calculations available
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {showEditModal && (
        <EditDriverModal
          driver={driver}
          onClose={() => setShowEditModal(false)}
        />
      )}

      {showAddRecordModal && (
        <AddRecordModal
          driverId={driver.id}
          recordType={showAddRecordModal}
          onClose={() => setShowAddRecordModal(null)}
        />
      )}
    </div>
  );
}
