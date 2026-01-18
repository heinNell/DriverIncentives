import { format, parseISO } from "date-fns";

export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return "-";
  const d = typeof date === "string" ? parseISO(date) : date;
  return format(d, "dd MMM yyyy");
}

export function formatDateTime(date: string | Date | null | undefined): string {
  if (!date) return "-";
  const d = typeof date === "string" ? parseISO(date) : date;
  return format(d, "dd MMM yyyy, HH:mm");
}

export function formatCurrency(
  amount: number | null | undefined,
  currency = "$",
): string {
  if (amount === null || amount === undefined) return `${currency}0.00`;
  return `${currency}${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatNumber(
  num: number | null | undefined,
  decimals = 0,
): string {
  if (num === null || num === undefined) return "0";
  return num.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function formatPercentage(value: number | null | undefined): string {
  if (value === null || value === undefined) return "0%";
  return `${value.toFixed(1)}%`;
}

export function getMonthName(month: number): string {
  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  return months[month - 1] || "";
}

export function getMonthShortName(month: number): string {
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  return months[month - 1] || "";
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    active: "badge-success",
    inactive: "badge-neutral",
    suspended: "badge-warning",
    terminated: "badge-danger",
    pending: "badge-warning",
    approved: "badge-success",
    rejected: "badge-danger",
    paid: "badge-success",
    draft: "badge-neutral",
    pending_approval: "badge-warning",
    settled: "badge-info",
    cancelled: "badge-neutral",
  };
  return colors[status] || "badge-neutral";
}

export function getDriverTypeLabel(type: "local" | "export"): string {
  return type === "local" ? "Local" : "Export";
}

export function calculateAchievementPercentage(
  actual: number,
  target: number,
): number {
  if (target <= 0) return 0;
  return (actual / target) * 100;
}

export function getAchievementColor(percentage: number): string {
  if (percentage >= 120) return "text-green-600";
  if (percentage >= 100) return "text-green-500";
  if (percentage >= 80) return "text-yellow-600";
  return "text-red-500";
}

export function generateInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

export function getSeverityColor(severity: string): string {
  const colors: Record<string, string> = {
    low: "badge-info",
    medium: "badge-warning",
    high: "badge-danger",
    critical: "badge-danger",
    minor: "badge-info",
    moderate: "badge-warning",
    severe: "badge-danger",
    fatal: "badge-danger",
  };
  return colors[severity] || "badge-neutral";
}

export function getIncidentTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    traffic_violation: "Traffic Violation",
    customer_complaint: "Customer Complaint",
    vehicle_misuse: "Vehicle Misuse",
    safety_violation: "Safety Violation",
    policy_violation: "Policy Violation",
    other: "Other",
  };
  return labels[type] || type;
}

export function getLeaveTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    annual: "Annual Leave",
    sick: "Sick Leave",
    unpaid: "Unpaid Leave",
    maternity: "Maternity Leave",
    paternity: "Paternity Leave",
    compassionate: "Compassionate Leave",
    other: "Other",
  };
  return labels[type] || type;
}

export function getDisciplinaryTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    verbal_warning: "Verbal Warning",
    written_warning: "Written Warning",
    final_warning: "Final Warning",
    suspension: "Suspension",
    termination: "Termination",
    other: "Other",
  };
  return labels[type] || type;
}
