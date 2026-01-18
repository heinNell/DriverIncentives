import { useState } from "react";
import { isSupabaseConfigured, supabase } from "../lib/supabase";
import { useStore } from "../store/useStore";
import
    {
        formatCurrency,
        formatNumber,
        getMonthName,
        getMonthShortName,
    } from "../utils/formatters";

type TabId = "rates" | "budgets" | "formulas";

export default function MasterSheet() {
  const { kilometerRates, monthlyBudgets, customFormulas, showToast } =
    useStore();

  const [activeTab, setActiveTab] = useState<TabId>("rates");
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [isEditing, setIsEditing] = useState(false);
  const [editingRates, setEditingRates] = useState<{
    local: string;
    export: string;
  }>({ local: "", export: "" });
  const [editingBudgets, setEditingBudgets] = useState<Record<string, string>>(
    {},
  );
  const [showFormulaModal, setShowFormulaModal] = useState(false);

  const localRate = kilometerRates.find(
    (r) => r.driver_type === "local" && r.is_active,
  );
  const exportRate = kilometerRates.find(
    (r) => r.driver_type === "export" && r.is_active,
  );

  const yearBudgets = monthlyBudgets.filter((b) => b.year === selectedYear);

  const tabs: { id: TabId; label: string }[] = [
    { id: "rates", label: "Kilometer Rates" },
    { id: "budgets", label: "Monthly Budgets" },
    { id: "formulas", label: "Custom Formulas" },
  ];

  const handleStartEditRates = () => {
    setEditingRates({
      local: localRate?.rate_per_km.toString() || "",
      export: exportRate?.rate_per_km.toString() || "",
    });
    setIsEditing(true);
  };

  const handleSaveRates = async () => {
    if (!isSupabaseConfigured()) {
      showToast("Cannot save in demo mode");
      return;
    }

    try {
      const localValue = parseFloat(editingRates.local);
      const exportValue = parseFloat(editingRates.export);

      if (isNaN(localValue) || isNaN(exportValue)) {
        showToast("Please enter valid numbers");
        return;
      }

      // Update local rate
      if (localRate) {
        await supabase
          .from("kilometer_rates")
          .update({ rate_per_km: localValue })
          .eq("id", localRate.id);
      }

      // Update export rate
      if (exportRate) {
        await supabase
          .from("kilometer_rates")
          .update({ rate_per_km: exportValue })
          .eq("id", exportRate.id);
      }

      showToast("Rates updated successfully");
      setIsEditing(false);
    } catch (error) {
      console.error("Error saving rates:", error);
      showToast("Error saving rates");
    }
  };

  const handleStartEditBudgets = () => {
    const budgetMap: Record<string, string> = {};
    yearBudgets.forEach((b) => {
      budgetMap[`${b.driver_type}_${b.month}`] =
        b.budgeted_kilometers.toString();
    });
    setEditingBudgets(budgetMap);
    setIsEditing(true);
  };

  const handleSaveBudgets = async () => {
    if (!isSupabaseConfigured()) {
      showToast("Cannot save in demo mode");
      return;
    }

    try {
      for (const [key, value] of Object.entries(editingBudgets)) {
        const [driverType, monthStr] = key.split("_");
        const month = parseInt(monthStr);
        const km = parseFloat(value);

        if (isNaN(km)) continue;

        const existing = yearBudgets.find(
          (b) => b.driver_type === driverType && b.month === month,
        );

        if (existing) {
          await supabase
            .from("monthly_budgets")
            .update({ budgeted_kilometers: km })
            .eq("id", existing.id);
        } else {
          await supabase.from("monthly_budgets").insert({
            year: selectedYear,
            month,
            driver_type: driverType as "local" | "export",
            budgeted_kilometers: km,
          });
        }
      }

      showToast("Budgets updated successfully");
      setIsEditing(false);
    } catch (error) {
      console.error("Error saving budgets:", error);
      showToast("Error saving budgets");
    }
  };

  const handleToggleFormula = async (formulaId: string, isActive: boolean) => {
    if (!isSupabaseConfigured()) {
      showToast("Cannot update in demo mode");
      return;
    }

    try {
      await supabase
        .from("custom_formulas")
        .update({ is_active: !isActive })
        .eq("id", formulaId);
      showToast("Formula updated");
    } catch (error) {
      console.error("Error updating formula:", error);
      showToast("Error updating formula");
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-semibold text-surface-900">
          Master Sheet
        </h1>
        <p className="text-surface-500 mt-1">
          Configure kilometer rates, monthly budgets, and incentive formulas
        </p>
      </div>

      {/* Tabs */}
      <div className="tab-list inline-flex">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id);
              setIsEditing(false);
            }}
            className={`tab-item ${activeTab === tab.id ? "active" : ""}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="animate-fade-in">
        {activeTab === "rates" && (
          <div className="bg-white rounded-2xl border border-surface-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-surface-100 flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-surface-900">
                  Kilometer Rates
                </h2>
                <p className="text-sm text-surface-500">
                  Set the per-kilometer rate for each driver type
                </p>
              </div>
              {!isEditing ? (
                <button
                  onClick={handleStartEditRates}
                  className="btn btn-primary"
                >
                  Edit Rates
                </button>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={() => setIsEditing(false)}
                    className="btn btn-secondary"
                  >
                    Cancel
                  </button>
                  <button onClick={handleSaveRates} className="btn btn-primary">
                    Save Changes
                  </button>
                </div>
              )}
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Local Rate */}
                <div className="p-6 rounded-xl bg-primary-50 border border-primary-100">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-lg bg-primary-100 flex items-center justify-center">
                      <svg
                        className="w-6 h-6 text-primary-600"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-semibold text-surface-900">
                        Local Drivers
                      </h3>
                      <p className="text-sm text-surface-500">
                        City and regional deliveries
                      </p>
                    </div>
                  </div>
                  {isEditing ? (
                    <div>
                      <label className="form-label">
                        Rate per Kilometer (R)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        className="form-input"
                        value={editingRates.local}
                        onChange={(e) =>
                          setEditingRates((prev) => ({
                            ...prev,
                            local: e.target.value,
                          }))
                        }
                      />
                    </div>
                  ) : (
                    <div>
                      <p className="text-3xl font-bold text-surface-900">
                        {formatCurrency(localRate?.rate_per_km || 0)}
                      </p>
                      <p className="text-sm text-surface-500 mt-1">
                        per kilometer
                      </p>
                    </div>
                  )}
                </div>

                {/* Export Rate */}
                <div className="p-6 rounded-xl bg-yellow-50 border border-yellow-100">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-lg bg-yellow-100 flex items-center justify-center">
                      <svg
                        className="w-6 h-6 text-yellow-600"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-semibold text-surface-900">
                        Export Drivers
                      </h3>
                      <p className="text-sm text-surface-500">
                        Cross-border and long-haul
                      </p>
                    </div>
                  </div>
                  {isEditing ? (
                    <div>
                      <label className="form-label">
                        Rate per Kilometer (R)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        className="form-input"
                        value={editingRates.export}
                        onChange={(e) =>
                          setEditingRates((prev) => ({
                            ...prev,
                            export: e.target.value,
                          }))
                        }
                      />
                    </div>
                  ) : (
                    <div>
                      <p className="text-3xl font-bold text-surface-900">
                        {formatCurrency(exportRate?.rate_per_km || 0)}
                      </p>
                      <p className="text-sm text-surface-500 mt-1">
                        per kilometer
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Rate Comparison */}
              <div className="mt-6 p-4 rounded-xl bg-surface-50 border border-surface-100">
                <h4 className="font-medium text-surface-900 mb-3">
                  Rate Comparison
                </h4>
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-surface-600">Local</span>
                      <span className="font-medium">
                        {formatCurrency(localRate?.rate_per_km || 0)}
                      </span>
                    </div>
                    <div className="h-3 bg-surface-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary-500 rounded-full"
                        style={{
                          width: `${((localRate?.rate_per_km || 0) / Math.max(localRate?.rate_per_km || 1, exportRate?.rate_per_km || 1)) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-surface-600">Export</span>
                      <span className="font-medium">
                        {formatCurrency(exportRate?.rate_per_km || 0)}
                      </span>
                    </div>
                    <div className="h-3 bg-surface-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-yellow-500 rounded-full"
                        style={{
                          width: `${((exportRate?.rate_per_km || 0) / Math.max(localRate?.rate_per_km || 1, exportRate?.rate_per_km || 1)) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "budgets" && (
          <div className="bg-white rounded-2xl border border-surface-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-surface-100 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div>
                  <h2 className="font-semibold text-surface-900">
                    Monthly Budgets
                  </h2>
                  <p className="text-sm text-surface-500">
                    Set target kilometers for each month
                  </p>
                </div>
                <select
                  className="form-select w-32"
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                >
                  {[2024, 2025, 2026, 2027].map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </div>
              {!isEditing ? (
                <button
                  onClick={handleStartEditBudgets}
                  className="btn btn-primary"
                >
                  Edit Budgets
                </button>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={() => setIsEditing(false)}
                    className="btn btn-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveBudgets}
                    className="btn btn-primary"
                  >
                    Save Changes
                  </button>
                </div>
              )}
            </div>
            <div className="p-6">
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Month</th>
                      <th>Local Target (km)</th>
                      <th>Export Target (km)</th>
                      <th>Total Budget</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map(
                      (month) => {
                        const localBudget = yearBudgets.find(
                          (b) => b.month === month && b.driver_type === "local",
                        );
                        const exportBudget = yearBudgets.find(
                          (b) =>
                            b.month === month && b.driver_type === "export",
                        );
                        const localKm = localBudget?.budgeted_kilometers || 0;
                        const exportKm = exportBudget?.budgeted_kilometers || 0;

                        return (
                          <tr key={month}>
                            <td className="font-medium">
                              {getMonthName(month)}
                            </td>
                            <td>
                              {isEditing ? (
                                <input
                                  type="number"
                                  className="form-input w-32"
                                  value={editingBudgets[`local_${month}`] || ""}
                                  onChange={(e) =>
                                    setEditingBudgets((prev) => ({
                                      ...prev,
                                      [`local_${month}`]: e.target.value,
                                    }))
                                  }
                                  placeholder="0"
                                />
                              ) : (
                                formatNumber(localKm)
                              )}
                            </td>
                            <td>
                              {isEditing ? (
                                <input
                                  type="number"
                                  className="form-input w-32"
                                  value={
                                    editingBudgets[`export_${month}`] || ""
                                  }
                                  onChange={(e) =>
                                    setEditingBudgets((prev) => ({
                                      ...prev,
                                      [`export_${month}`]: e.target.value,
                                    }))
                                  }
                                  placeholder="0"
                                />
                              ) : (
                                formatNumber(exportKm)
                              )}
                            </td>
                            <td className="font-medium">
                              {formatNumber(localKm + exportKm)}
                            </td>
                          </tr>
                        );
                      },
                    )}
                  </tbody>
                  <tfoot>
                    <tr className="bg-surface-50 font-semibold">
                      <td>Annual Total</td>
                      <td>
                        {formatNumber(
                          yearBudgets
                            .filter((b) => b.driver_type === "local")
                            .reduce((sum, b) => sum + b.budgeted_kilometers, 0),
                        )}
                      </td>
                      <td>
                        {formatNumber(
                          yearBudgets
                            .filter((b) => b.driver_type === "export")
                            .reduce((sum, b) => sum + b.budgeted_kilometers, 0),
                        )}
                      </td>
                      <td>
                        {formatNumber(
                          yearBudgets.reduce(
                            (sum, b) => sum + b.budgeted_kilometers,
                            0,
                          ),
                        )}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Budget Chart */}
              <div className="mt-6 p-4 rounded-xl bg-surface-50 border border-surface-100">
                <h4 className="font-medium text-surface-900 mb-4">
                  Budget Distribution
                </h4>
                <div className="flex items-end gap-2 h-40">
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => {
                    const localBudget = yearBudgets.find(
                      (b) => b.month === month && b.driver_type === "local",
                    );
                    const exportBudget = yearBudgets.find(
                      (b) => b.month === month && b.driver_type === "export",
                    );
                    const total =
                      (localBudget?.budgeted_kilometers || 0) +
                      (exportBudget?.budgeted_kilometers || 0);
                    const maxTotal = Math.max(
                      ...Array.from({ length: 12 }, (_, i) => {
                        const l = yearBudgets.find(
                          (b) => b.month === i + 1 && b.driver_type === "local",
                        );
                        const e = yearBudgets.find(
                          (b) =>
                            b.month === i + 1 && b.driver_type === "export",
                        );
                        return (
                          (l?.budgeted_kilometers || 0) +
                          (e?.budgeted_kilometers || 0)
                        );
                      }),
                    );
                    const height = maxTotal > 0 ? (total / maxTotal) * 100 : 0;

                    return (
                      <div
                        key={month}
                        className="flex-1 flex flex-col items-center"
                      >
                        <div
                          className="w-full bg-gradient-to-t from-primary-500 to-primary-400 rounded-t transition-all"
                          style={{ height: `${height}%` }}
                        />
                        <span className="text-xs text-surface-500 mt-2">
                          {getMonthShortName(month)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "formulas" && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-surface-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-surface-100 flex items-center justify-between">
                <div>
                  <h2 className="font-semibold text-surface-900">
                    Custom Formulas
                  </h2>
                  <p className="text-sm text-surface-500">
                    Configure incentive calculation formulas
                  </p>
                </div>
                <button
                  onClick={() => setShowFormulaModal(true)}
                  className="btn btn-primary"
                >
                  Add Formula
                </button>
              </div>
              <div className="divide-y divide-surface-100">
                {customFormulas.length > 0 ? (
                  customFormulas.map((formula) => (
                    <div key={formula.id} className="px-6 py-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <h3 className="font-medium text-surface-900">
                              {formula.formula_name}
                            </h3>
                            <span
                              className={`badge ${
                                formula.applies_to === "all"
                                  ? "badge-neutral"
                                  : formula.applies_to === "local"
                                    ? "badge-info"
                                    : "badge-warning"
                              }`}
                            >
                              {formula.applies_to === "all"
                                ? "All Drivers"
                                : formula.applies_to === "local"
                                  ? "Local Only"
                                  : "Export Only"}
                            </span>
                            <span
                              className={`badge ${formula.is_active ? "badge-success" : "badge-neutral"}`}
                            >
                              {formula.is_active ? "Active" : "Inactive"}
                            </span>
                          </div>
                          <p className="text-sm text-surface-500 mt-1">
                            {formula.description}
                          </p>
                          <div className="mt-3 p-3 rounded-lg bg-surface-50 font-mono text-sm text-surface-700">
                            {formula.formula_expression}
                          </div>
                          {formula.variables && (
                            <div className="mt-3">
                              <p className="text-xs font-medium text-surface-500 mb-2">
                                Variables:
                              </p>
                              <div className="flex flex-wrap gap-2">
                                {Object.entries(
                                  formula.variables as Record<string, string>,
                                ).map(([key, desc]) => (
                                  <span
                                    key={key}
                                    className="px-2 py-1 rounded bg-surface-100 text-xs text-surface-600"
                                  >
                                    {key}: {desc}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                          <button
                            onClick={() =>
                              handleToggleFormula(formula.id, formula.is_active)
                            }
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                              formula.is_active
                                ? "bg-red-50 text-red-600 hover:bg-red-100"
                                : "bg-green-50 text-green-600 hover:bg-green-100"
                            }`}
                          >
                            {formula.is_active ? "Disable" : "Enable"}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="px-6 py-12 text-center text-surface-500">
                    No custom formulas configured
                  </div>
                )}
              </div>
            </div>

            {/* Formula Help */}
            <div className="bg-white rounded-2xl border border-surface-200 p-6">
              <h3 className="font-semibold text-surface-900 mb-4">
                How Formulas Work
              </h3>
              <div className="space-y-4 text-sm text-surface-600">
                <p>
                  Formulas are evaluated in order of priority (lowest first).
                  Each formula can use variables from the driver's performance
                  data and previous formula results.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-surface-50">
                    <h4 className="font-medium text-surface-900 mb-2">
                      Available Variables
                    </h4>
                    <ul className="space-y-1 text-surface-600">
                      <li>
                        <code className="text-primary-600">actual_km</code> -
                        Kilometers driven
                      </li>
                      <li>
                        <code className="text-primary-600">target_km</code> -
                        Monthly target
                      </li>
                      <li>
                        <code className="text-primary-600">rate_per_km</code> -
                        Per-km rate
                      </li>
                      <li>
                        <code className="text-primary-600">base_salary</code> -
                        Driver's base salary
                      </li>
                      <li>
                        <code className="text-primary-600">accident_count</code>{" "}
                        - Monthly accidents
                      </li>
                      <li>
                        <code className="text-primary-600">incident_count</code>{" "}
                        - Monthly incidents
                      </li>
                    </ul>
                  </div>
                  <div className="p-4 rounded-xl bg-surface-50">
                    <h4 className="font-medium text-surface-900 mb-2">
                      Example Formulas
                    </h4>
                    <ul className="space-y-2 text-surface-600">
                      <li>
                        <code className="text-xs bg-surface-200 px-1 rounded">
                          actual_km * rate_per_km
                        </code>
                        <span className="text-xs ml-2">Base incentive</span>
                      </li>
                      <li>
                        <code className="text-xs bg-surface-200 px-1 rounded">
                          base_salary * 0.05
                        </code>
                        <span className="text-xs ml-2">5% safety bonus</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Add Formula Modal */}
      {showFormulaModal && (
        <AddFormulaModal onClose={() => setShowFormulaModal(false)} />
      )}
    </div>
  );
}

function AddFormulaModal({ onClose }: { onClose: () => void }) {
  const { showToast } = useStore();
  const [formData, setFormData] = useState({
    formula_name: "",
    formula_key: "",
    formula_expression: "",
    description: "",
    applies_to: "all" as "all" | "local" | "export",
    priority: 10,
  });
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isSupabaseConfigured()) {
      showToast("Cannot save in demo mode");
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase.from("custom_formulas").insert({
        ...formData,
        is_active: true,
      });

      if (error) throw error;
      showToast("Formula added successfully");
      onClose();
    } catch (error) {
      console.error("Error adding formula:", error);
      showToast("Error adding formula");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content max-w-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-surface-100">
          <h2 className="text-lg font-semibold text-surface-900">
            Add Custom Formula
          </h2>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="form-label">Formula Name</label>
            <input
              type="text"
              className="form-input"
              value={formData.formula_name}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  formula_name: e.target.value,
                }))
              }
              required
            />
          </div>
          <div>
            <label className="form-label">
              Formula Key (unique identifier)
            </label>
            <input
              type="text"
              className="form-input font-mono"
              value={formData.formula_key}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  formula_key: e.target.value.toLowerCase().replace(/\s/g, "_"),
                }))
              }
              required
            />
          </div>
          <div>
            <label className="form-label">Expression</label>
            <textarea
              className="form-input font-mono"
              rows={3}
              value={formData.formula_expression}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  formula_expression: e.target.value,
                }))
              }
              placeholder="actual_km * rate_per_km"
              required
            />
          </div>
          <div>
            <label className="form-label">Description</label>
            <input
              type="text"
              className="form-input"
              value={formData.description}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  description: e.target.value,
                }))
              }
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Applies To</label>
              <select
                className="form-select"
                value={formData.applies_to}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    applies_to: e.target.value as "all" | "local" | "export",
                  }))
                }
              >
                <option value="all">All Drivers</option>
                <option value="local">Local Only</option>
                <option value="export">Export Only</option>
              </select>
            </div>
            <div>
              <label className="form-label">Priority</label>
              <input
                type="number"
                className="form-input"
                value={formData.priority}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    priority: parseInt(e.target.value),
                  }))
                }
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSaving}
            >
              {isSaving ? "Saving..." : "Add Formula"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
