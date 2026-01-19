/**
 * Export Utilities for PDF and Excel
 * Provides month-on-month incentive reports with fuel bonus
 */

import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import type { Driver, DriverPerformance, IncentiveCalculation } from "../types/database";
import { formatCurrency, formatNumber, getMonthName } from "./formatters";

// Extend jsPDF type to include autoTable
declare module "jspdf" {
  interface jsPDF {
    lastAutoTable: {
      finalY: number;
    };
  }
}

interface MonthlyIncentiveData {
  month: number;
  monthName: string;
  totalKm: number;
  totalIncentive: number;
  totalFuelBonus: number;
  totalCombined: number;
  driverCount: number;
  avgIncentive: number;
  avgFuelBonus: number;
  localKm: number;
  localIncentive: number;
  localFuelBonus: number;
  exportKm: number;
  exportIncentive: number;
  exportFuelBonus: number;
}

interface DriverMonthlyData {
  driverId: string;
  driverName: string;
  driverType: "local" | "export";
  employeeId: string;
  monthlyData: {
    month: number;
    km: number;
    incentive: number;
    fuelBonus: number;
    combined: number;
  }[];
  totalKm: number;
  totalIncentive: number;
  totalFuelBonus: number;
  totalCombined: number;
}

export interface ExportData {
  year: number;
  month?: number | "all"; // Optional month filter - if specified, only export that month
  drivers: Driver[];
  performance: DriverPerformance[];
  calculations: IncentiveCalculation[];
  companyName?: string;
  typeFilter?: "all" | "local" | "export";
}

/**
 * Extract fuel bonus from calculation_details if available
 */
function getFuelBonusFromCalculation(calc: IncentiveCalculation | undefined): number {
  if (!calc?.calculation_details) return 0;
  
  try {
    const details = calc.calculation_details as {
      bonus_breakdown?: {
        fuel_efficiency_bonus?: number;
      };
    };
    return details.bonus_breakdown?.fuel_efficiency_bonus || 0;
  } catch {
    return 0;
  }
}

/**
 * Generate monthly summary data for export including fuel bonus
 */
function generateMonthlySummary(data: ExportData): MonthlyIncentiveData[] {
  const { year, month: selectedMonth, drivers, performance, calculations, typeFilter = "all" } = data;

  const filteredDrivers = drivers.filter(
    (d) => d.status === "active" && (typeFilter === "all" || d.driver_type === typeFilter)
  );
  const driverIds = new Set(filteredDrivers.map((d) => d.id));

  const months: MonthlyIncentiveData[] = [];

  // Determine which months to process
  const monthsToProcess = selectedMonth && selectedMonth !== "all" 
    ? [selectedMonth] 
    : Array.from({ length: 12 }, (_, i) => i + 1);

  for (const month of monthsToProcess) {
    const monthPerf = performance.filter(
      (p) => p.year === year && p.month === month && driverIds.has(p.driver_id)
    );
    const monthCalc = calculations.filter(
      (c) => c.year === year && c.month === month && driverIds.has(c.driver_id)
    );

    // Separate by type
    const localDrivers = filteredDrivers.filter((d) => d.driver_type === "local");
    const exportDrivers = filteredDrivers.filter((d) => d.driver_type === "export");
    const localDriverIds = new Set(localDrivers.map((d) => d.id));
    const exportDriverIds = new Set(exportDrivers.map((d) => d.id));

    // Calculate totals for local drivers
    const localKm = monthPerf
      .filter((p) => localDriverIds.has(p.driver_id))
      .reduce((sum, p) => sum + p.actual_kilometers, 0);
    
    const localIncentive = monthCalc
      .filter((c) => localDriverIds.has(c.driver_id))
      .reduce((sum, c) => sum + (c.total_incentive || 0), 0);
    
    // Get local fuel bonus from stored calculation_details
    const localFuelBonus = monthCalc
      .filter((c) => localDriverIds.has(c.driver_id))
      .reduce((sum, c) => sum + getFuelBonusFromCalculation(c), 0);

    // Calculate totals for export drivers
    const exportKm = monthPerf
      .filter((p) => exportDriverIds.has(p.driver_id))
      .reduce((sum, p) => sum + p.actual_kilometers, 0);
    
    const exportIncentive = monthCalc
      .filter((c) => exportDriverIds.has(c.driver_id))
      .reduce((sum, c) => sum + (c.total_incentive || 0), 0);
    
    // Get export fuel bonus from stored calculation_details
    const exportFuelBonus = monthCalc
      .filter((c) => exportDriverIds.has(c.driver_id))
      .reduce((sum, c) => sum + getFuelBonusFromCalculation(c), 0);

    // Calculate overall totals
    const totalKm = localKm + exportKm;
    const totalIncentive = localIncentive + exportIncentive;
    const totalFuelBonus = localFuelBonus + exportFuelBonus;
    const totalCombined = totalIncentive + totalFuelBonus;
    const driverCount = monthPerf.length;

    months.push({
      month,
      monthName: getMonthName(month),
      totalKm,
      totalIncentive,
      totalFuelBonus,
      totalCombined,
      driverCount,
      avgIncentive: driverCount > 0 ? totalIncentive / driverCount : 0,
      avgFuelBonus: driverCount > 0 ? totalFuelBonus / driverCount : 0,
      localKm,
      localIncentive,
      localFuelBonus,
      exportKm,
      exportIncentive,
      exportFuelBonus,
    });
  }

  return months;
}

/**
 * Generate driver-level monthly data including fuel bonus
 */
function generateDriverMonthlyData(data: ExportData): DriverMonthlyData[] {
  const { year, month: selectedMonth, drivers, performance, calculations, typeFilter = "all" } = data;

  const filteredDrivers = drivers.filter(
    (d) => d.status === "active" && (typeFilter === "all" || d.driver_type === typeFilter)
  );

  // Determine which months to include
  const monthsToInclude = selectedMonth && selectedMonth !== "all" 
    ? [selectedMonth] 
    : Array.from({ length: 12 }, (_, i) => i + 1);

  return filteredDrivers.map((driver) => {
    const driverPerf = performance.filter(
      (p) => p.driver_id === driver.id && p.year === year
    );
    const driverCalc = calculations.filter(
      (c) => c.driver_id === driver.id && c.year === year
    );

    const monthlyData = monthsToInclude.map((month) => {
      const perf = driverPerf.find((p) => p.month === month);
      const calc = driverCalc.find((c) => c.month === month);
      
      const incentive = calc?.total_incentive || 0;
      // Get fuel bonus from the stored calculation_details
      const fuelBonus = getFuelBonusFromCalculation(calc);

      return {
        month,
        km: perf?.actual_kilometers || 0,
        incentive,
        fuelBonus,
        combined: incentive + fuelBonus,
      };
    });

    const totalKm = monthlyData.reduce((sum, m) => sum + m.km, 0);
    const totalIncentive = monthlyData.reduce((sum, m) => sum + m.incentive, 0);
    const totalFuelBonus = monthlyData.reduce((sum, m) => sum + m.fuelBonus, 0);
    const totalCombined = totalIncentive + totalFuelBonus;

    return {
      driverId: driver.id,
      driverName: `${driver.first_name} ${driver.last_name}`,
      driverType: driver.driver_type,
      employeeId: driver.employee_id,
      monthlyData,
      totalKm,
      totalIncentive,
      totalFuelBonus,
      totalCombined,
    };
  });
}

/**
 * Export to PDF with fuel bonus
 */
export function exportToPDF(data: ExportData): void {
  const { year, month: selectedMonth, companyName = "Driver Incentives" } = data;
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const isSingleMonth = selectedMonth && selectedMonth !== "all";

  // Determine period label
  const periodLabel = isSingleMonth 
    ? `${getMonthName(selectedMonth)} ${year}`
    : `Full Year ${year}`;

  // Title
  doc.setFontSize(20);
  doc.setTextColor(33, 37, 41);
  doc.text(`${companyName}`, pageWidth / 2, 20, { align: "center" });

  doc.setFontSize(14);
  doc.setTextColor(108, 117, 125);
  doc.text(`Incentive Summary - ${periodLabel}`, pageWidth / 2, 28, {
    align: "center",
  });

  doc.setFontSize(10);
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, pageWidth / 2, 35, {
    align: "center",
  });

  // Get driver data
  const driverData = generateDriverMonthlyData(data);
  const monthlyData = generateMonthlySummary(data);

  // For single month - show clean summary
  if (isSingleMonth) {
    // Summary totals at top
    const summary = monthlyData[0];
    doc.setFontSize(12);
    doc.setTextColor(33, 37, 41);
    doc.text("Summary", 14, 48);

    autoTable(doc, {
      startY: 52,
      head: [["Description", "Value"]],
      body: [
        ["Total Drivers", summary.driverCount.toString()],
        ["Total KM", formatNumber(summary.totalKm)],
        ["KM Incentive", formatCurrency(summary.totalIncentive)],
        ["Fuel Efficiency Bonus", formatCurrency(summary.totalFuelBonus)],
        ["Grand Total", formatCurrency(summary.totalCombined)],
      ],
      styles: {
        fontSize: 10,
        cellPadding: 4,
      },
      headStyles: {
        fillColor: [59, 130, 246],
        textColor: 255,
        fontStyle: "bold",
      },
      columnStyles: {
        0: { cellWidth: 80 },
        1: { cellWidth: 60, halign: "right" },
      },
    });

    // Driver details
    const lastY = doc.lastAutoTable.finalY + 15;
    doc.text("Driver Details", 14, lastY);

    autoTable(doc, {
      startY: lastY + 4,
      head: [["Driver", "Type", "KM", "KM Incentive", "Fuel Bonus", "Total"]],
      body: driverData.map((d) => [
        d.driverName,
        d.driverType === "local" ? "Local" : "Export",
        formatNumber(d.totalKm),
        formatCurrency(d.totalIncentive),
        formatCurrency(d.totalFuelBonus),
        formatCurrency(d.totalCombined),
      ]),
      foot: [
        [
          "TOTAL",
          "",
          formatNumber(driverData.reduce((s, d) => s + d.totalKm, 0)),
          formatCurrency(driverData.reduce((s, d) => s + d.totalIncentive, 0)),
          formatCurrency(driverData.reduce((s, d) => s + d.totalFuelBonus, 0)),
          formatCurrency(driverData.reduce((s, d) => s + d.totalCombined, 0)),
        ],
      ],
      styles: {
        fontSize: 9,
        cellPadding: 3,
      },
      headStyles: {
        fillColor: [34, 197, 94],
        textColor: 255,
        fontStyle: "bold",
      },
      footStyles: {
        fillColor: [243, 244, 246],
        textColor: [33, 37, 41],
        fontStyle: "bold",
      },
      alternateRowStyles: {
        fillColor: [249, 250, 251],
      },
    });
  } else {
    // Full year - show monthly breakdown
    doc.setFontSize(12);
    doc.setTextColor(33, 37, 41);
    doc.text("Monthly Summary", 14, 48);

    autoTable(doc, {
      startY: 52,
      head: [
        ["Month", "Drivers", "KM", "KM Incentive", "Fuel Bonus", "Total"],
      ],
      body: monthlyData.map((m) => [
        m.monthName,
        m.driverCount.toString(),
        formatNumber(m.totalKm),
        formatCurrency(m.totalIncentive),
        formatCurrency(m.totalFuelBonus),
        formatCurrency(m.totalCombined),
      ]),
      foot: [
        [
          "TOTAL",
          "",
          formatNumber(monthlyData.reduce((s, m) => s + m.totalKm, 0)),
          formatCurrency(monthlyData.reduce((s, m) => s + m.totalIncentive, 0)),
          formatCurrency(monthlyData.reduce((s, m) => s + m.totalFuelBonus, 0)),
          formatCurrency(monthlyData.reduce((s, m) => s + m.totalCombined, 0)),
        ],
      ],
      styles: {
        fontSize: 9,
        cellPadding: 3,
      },
      headStyles: {
        fillColor: [59, 130, 246],
        textColor: 255,
        fontStyle: "bold",
      },
      footStyles: {
        fillColor: [243, 244, 246],
        textColor: [33, 37, 41],
        fontStyle: "bold",
      },
      alternateRowStyles: {
        fillColor: [249, 250, 251],
      },
    });

    // Driver Details (new page for full year)
    doc.addPage();
    doc.setFontSize(12);
    doc.text("Driver Details - Annual Totals", 14, 20);

    autoTable(doc, {
      startY: 24,
      head: [["Driver", "Type", "Total KM", "KM Incentive", "Fuel Bonus", "Total"]],
      body: driverData.map((d) => [
        d.driverName,
        d.driverType === "local" ? "L" : "E",
        formatNumber(d.totalKm),
        formatCurrency(d.totalIncentive),
        formatCurrency(d.totalFuelBonus),
        formatCurrency(d.totalCombined),
      ]),
      styles: {
        fontSize: 8,
        cellPadding: 2,
      },
      headStyles: {
        fillColor: [59, 130, 246],
        textColor: 255,
        fontStyle: "bold",
      },
      alternateRowStyles: {
        fillColor: [249, 250, 251],
      },
    });
  }

  // Generate filename
  const filenamePeriod = isSingleMonth 
    ? `${getMonthName(selectedMonth)}_${year}` 
    : `${year}`;

  // Save
  doc.save(`Incentive_Summary_${filenamePeriod}_${new Date().toISOString().split("T")[0]}.pdf`);
}

/**
 * Export to Excel with fuel bonus
 */
export function exportToExcel(data: ExportData): void {
  const { year, month: selectedMonth, companyName = "Driver Incentives" } = data;
  const workbook = XLSX.utils.book_new();

  // Determine period label
  const isSingleMonth = selectedMonth && selectedMonth !== "all";
  const periodLabel = isSingleMonth 
    ? `${getMonthName(selectedMonth)} ${year}`
    : `Full Year ${year}`;

  // Get data
  const monthlyData = generateMonthlySummary(data);
  const driverData = generateDriverMonthlyData(data);

  if (isSingleMonth) {
    // Single month - clean summary on one sheet
    const summary = monthlyData[0];
    const summaryRows = [
      [`${companyName} - Incentive Summary`],
      [`Period: ${periodLabel}`],
      [`Generated: ${new Date().toLocaleDateString()}`],
      [],
      ["SUMMARY"],
      ["Total Drivers", summary.driverCount],
      ["Total KM", summary.totalKm],
      ["KM Incentive", summary.totalIncentive],
      ["Fuel Efficiency Bonus", summary.totalFuelBonus],
      ["Grand Total", summary.totalCombined],
      [],
      [],
      ["DRIVER DETAILS"],
      ["Employee ID", "Driver Name", "Type", "KM", "KM Incentive", "Fuel Bonus", "Total"],
      ...driverData.map((d) => [
        d.employeeId,
        d.driverName,
        d.driverType === "local" ? "Local" : "Export",
        d.totalKm,
        d.totalIncentive,
        d.totalFuelBonus,
        d.totalCombined,
      ]),
      [],
      ["TOTAL", "", "", 
        driverData.reduce((s, d) => s + d.totalKm, 0),
        driverData.reduce((s, d) => s + d.totalIncentive, 0),
        driverData.reduce((s, d) => s + d.totalFuelBonus, 0),
        driverData.reduce((s, d) => s + d.totalCombined, 0),
      ],
    ];

    const summarySheet = XLSX.utils.aoa_to_sheet(summaryRows);
    summarySheet["!cols"] = [
      { wch: 14 },
      { wch: 22 },
      { wch: 10 },
      { wch: 12 },
      { wch: 14 },
      { wch: 14 },
      { wch: 14 },
    ];

    XLSX.utils.book_append_sheet(workbook, summarySheet, "Summary");
  } else {
    // Full year - multiple sheets
    // Monthly Summary Sheet
    const summaryRows = [
      [`${companyName} - Incentive Report ${periodLabel}`],
      [`Generated: ${new Date().toLocaleDateString()}`],
      [],
      ["Month", "Drivers", "Total KM", "KM Incentive", "Fuel Bonus", "Total Payment"],
      ...monthlyData.map((m) => [
        m.monthName,
        m.driverCount,
        m.totalKm,
        m.totalIncentive,
        m.totalFuelBonus,
        m.totalCombined,
      ]),
      [],
      [
        "TOTAL",
        "",
        monthlyData.reduce((s, m) => s + m.totalKm, 0),
        monthlyData.reduce((s, m) => s + m.totalIncentive, 0),
        monthlyData.reduce((s, m) => s + m.totalFuelBonus, 0),
        monthlyData.reduce((s, m) => s + m.totalCombined, 0),
      ],
    ];

    const summarySheet = XLSX.utils.aoa_to_sheet(summaryRows);
    summarySheet["!cols"] = [
      { wch: 12 },
      { wch: 12 },
      { wch: 14 },
      { wch: 14 },
      { wch: 14 },
      { wch: 16 },
    ];

    XLSX.utils.book_append_sheet(workbook, summarySheet, "Monthly Summary");

    // Driver Details Sheet
    const driverRows = [
      ["Driver Details - Annual Totals"],
      [],
      ["Employee ID", "Driver Name", "Type", "Total KM", "KM Incentive", "Fuel Bonus", "Total Payment"],
      ...driverData.map((d) => [
        d.employeeId,
        d.driverName,
        d.driverType === "local" ? "Local" : "Export",
        d.totalKm,
        d.totalIncentive,
        d.totalFuelBonus,
        d.totalCombined,
      ]),
    ];

    const driverSheet = XLSX.utils.aoa_to_sheet(driverRows);
    driverSheet["!cols"] = [
      { wch: 12 },
      { wch: 22 },
      { wch: 10 },
      { wch: 12 },
      { wch: 14 },
      { wch: 14 },
      { wch: 16 },
    ];

    XLSX.utils.book_append_sheet(workbook, driverSheet, "Driver Totals");
  }

  // Generate filename
  const filenamePeriod = isSingleMonth 
    ? `${getMonthName(selectedMonth)}_${year}` 
    : `${year}`;

  // Save
  XLSX.writeFile(
    workbook,
    `Incentive_Summary_${filenamePeriod}_${new Date().toISOString().split("T")[0]}.xlsx`
  );
}

// Export the helper functions if needed elsewhere
export { generateDriverMonthlyData, generateMonthlySummary };
