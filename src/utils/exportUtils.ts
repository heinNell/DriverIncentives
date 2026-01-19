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

// ============================================
// SCORECARD PDF EXPORT
// ============================================

export interface ScorecardExportData {
  employeeName: string;
  employeeId: string;
  roleName: string;
  year: number;
  month: number;
  monthName: string;
  companyName?: string;
  kraScores: {
    kraName: string;
    kraWeighting: number;
    kpiScores: {
      kpiName: string;
      target: number;
      actual: number;
      unit: string | null;
      achievementPercent: number;
      score: number;
      kpiWeighting: number;
      weightedScore: number;
    }[];
    kraWeightedScore: number;
    finalKraScore: number;
  }[];
  totalWeightedScore: number;
  rating: string;
}

/**
 * Export scorecard to PDF
 */
export function exportScorecardToPDF(data: ScorecardExportData): void {
  const { 
    employeeName, 
    employeeId, 
    roleName, 
    year,
    monthName,
    companyName = "Performance Scorecard",
    kraScores,
    totalWeightedScore,
    rating
  } = data;
  
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  // Header with company/title
  doc.setFontSize(18);
  doc.setTextColor(33, 37, 41);
  doc.text(companyName, pageWidth / 2, 18, { align: "center" });

  doc.setFontSize(14);
  doc.setTextColor(59, 130, 246);
  doc.text(`${roleName} Scorecard`, pageWidth / 2, 26, { align: "center" });

  doc.setFontSize(12);
  doc.setTextColor(108, 117, 125);
  doc.text(`${monthName} ${year}`, pageWidth / 2, 33, { align: "center" });

  // Employee Info Box
  doc.setFillColor(249, 250, 251);
  doc.rect(14, 40, pageWidth - 28, 20, "F");
  doc.setDrawColor(229, 231, 235);
  doc.rect(14, 40, pageWidth - 28, 20, "S");

  doc.setFontSize(10);
  doc.setTextColor(55, 65, 81);
  doc.text(`Employee: ${employeeName}`, 20, 48);
  doc.text(`Employee ID: ${employeeId}`, 20, 55);
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, pageWidth - 65, 48);

  // Build table data
  const tableBody: (string | { content: string; colSpan?: number; styles?: object })[][] = [];

  kraScores.forEach((kraScore) => {
    kraScore.kpiScores.forEach((kpiScore, kpiIndex) => {
      if (kpiIndex === 0) {
        // First row with KRA info
        tableBody.push([
          { content: `${kraScore.kraWeighting}%`, styles: { fillColor: [239, 246, 255], fontStyle: "bold" } },
          { content: kraScore.kraName, styles: { fillColor: [239, 246, 255], fontStyle: "bold" } },
          kpiScore.kpiName,
          `${kpiScore.target} ${kpiScore.unit || ""}`.trim(),
          kpiScore.actual.toString(),
          `${kpiScore.achievementPercent.toFixed(1)}%`,
          `${kpiScore.score.toFixed(0)}%`,
          `${kpiScore.kpiWeighting}%`,
          kpiScore.weightedScore.toFixed(2),
        ]);
      } else {
        // Subsequent KPI rows without KRA info
        tableBody.push([
          "",
          "",
          kpiScore.kpiName,
          `${kpiScore.target} ${kpiScore.unit || ""}`.trim(),
          kpiScore.actual.toString(),
          `${kpiScore.achievementPercent.toFixed(1)}%`,
          `${kpiScore.score.toFixed(0)}%`,
          `${kpiScore.kpiWeighting}%`,
          kpiScore.weightedScore.toFixed(2),
        ]);
      }
    });

    // KRA subtotal row
    tableBody.push([
      { content: `${kraScore.kraName} Sub Total`, colSpan: 7, styles: { fillColor: [243, 244, 246], halign: "right", fontStyle: "bold" } },
      { content: "100%", styles: { fillColor: [243, 244, 246], fontStyle: "bold" } },
      { content: kraScore.finalKraScore.toFixed(2), styles: { fillColor: [243, 244, 246], fontStyle: "bold", textColor: [37, 99, 235] } },
    ]);
  });

  // Total row
  tableBody.push([
    { content: "TOTAL SCORE", colSpan: 7, styles: { fillColor: [59, 130, 246], textColor: [255, 255, 255], halign: "right", fontStyle: "bold" } },
    { content: "100%", styles: { fillColor: [59, 130, 246], textColor: [255, 255, 255], fontStyle: "bold" } },
    { content: totalWeightedScore.toFixed(1), styles: { fillColor: [59, 130, 246], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 11 } },
  ]);

  autoTable(doc, {
    startY: 65,
    head: [["Weight", "KRA", "KPI / Deliverable", "Target", "Actual", "Achieve %", "Score", "KPI Wt", "Weighted"]],
    body: tableBody,
    styles: {
      fontSize: 8,
      cellPadding: 3,
    },
    headStyles: {
      fillColor: [31, 41, 55],
      textColor: 255,
      fontStyle: "bold",
      fontSize: 8,
    },
    columnStyles: {
      0: { cellWidth: 14, halign: "center" },
      1: { cellWidth: 28 },
      2: { cellWidth: 42 },
      3: { cellWidth: 20, halign: "right" },
      4: { cellWidth: 18, halign: "right" },
      5: { cellWidth: 20, halign: "right" },
      6: { cellWidth: 16, halign: "right" },
      7: { cellWidth: 14, halign: "right" },
      8: { cellWidth: 18, halign: "right" },
    },
    didParseCell: (hookData) => {
      // Color code achievement percentage
      if (hookData.column.index === 5 && hookData.section === "body") {
        const value = parseFloat(hookData.cell.raw as string);
        if (!isNaN(value)) {
          if (value >= 100) {
            hookData.cell.styles.textColor = [22, 163, 74]; // green
          } else if (value >= 80) {
            hookData.cell.styles.textColor = [37, 99, 235]; // blue
          } else if (value >= 60) {
            hookData.cell.styles.textColor = [202, 138, 4]; // yellow
          } else {
            hookData.cell.styles.textColor = [220, 38, 38]; // red
          }
        }
      }
    },
  });

  // Rating summary box
  const finalY = doc.lastAutoTable.finalY + 10;

  // Get rating color
  let ratingBgColor: [number, number, number] = [243, 244, 246];
  let ratingTextColor: [number, number, number] = [55, 65, 81];
  
  switch (rating) {
    case "Excellent":
      ratingBgColor = [220, 252, 231];
      ratingTextColor = [22, 101, 52];
      break;
    case "Very Good":
      ratingBgColor = [219, 234, 254];
      ratingTextColor = [30, 64, 175];
      break;
    case "Good":
      ratingBgColor = [207, 250, 254];
      ratingTextColor = [14, 116, 144];
      break;
    case "Satisfactory":
      ratingBgColor = [254, 249, 195];
      ratingTextColor = [161, 98, 7];
      break;
    case "Needs Improvement":
      ratingBgColor = [255, 237, 213];
      ratingTextColor = [194, 65, 12];
      break;
    case "Unsatisfactory":
      ratingBgColor = [254, 226, 226];
      ratingTextColor = [153, 27, 27];
      break;
  }

  // Final Rating Box
  doc.setFillColor(...ratingBgColor);
  doc.roundedRect(pageWidth - 80, finalY, 66, 18, 3, 3, "F");
  doc.setFontSize(10);
  doc.setTextColor(108, 117, 125);
  doc.text("Final Rating:", pageWidth - 75, finalY + 7);
  doc.setFontSize(12);
  doc.setTextColor(...ratingTextColor);
  doc.text(rating, pageWidth - 75, finalY + 14);

  // Score Box
  doc.setFillColor(239, 246, 255);
  doc.roundedRect(pageWidth - 150, finalY, 66, 18, 3, 3, "F");
  doc.setFontSize(10);
  doc.setTextColor(108, 117, 125);
  doc.text("Total Score:", pageWidth - 145, finalY + 7);
  doc.setFontSize(14);
  doc.setTextColor(37, 99, 235);
  doc.text(`${totalWeightedScore.toFixed(1)}%`, pageWidth - 145, finalY + 14);

  // Legend
  const legendY = finalY + 28;
  doc.setFontSize(9);
  doc.setTextColor(107, 114, 128);
  doc.text("Performance Rating Scale:", 14, legendY);
  
  const legends = [
    { color: [34, 197, 94] as [number, number, number], text: "Excellent (90-100%)" },
    { color: [59, 130, 246] as [number, number, number], text: "Very Good (80-90%)" },
    { color: [6, 182, 212] as [number, number, number], text: "Good (70-80%)" },
    { color: [234, 179, 8] as [number, number, number], text: "Satisfactory (60-70%)" },
    { color: [249, 115, 22] as [number, number, number], text: "Needs Improvement (50-60%)" },
    { color: [239, 68, 68] as [number, number, number], text: "Unsatisfactory (<50%)" },
  ];

  let legendX = 14;
  doc.setFontSize(7);
  legends.forEach((legend) => {
    doc.setFillColor(...legend.color);
    doc.circle(legendX + 2, legendY + 6, 2, "F");
    doc.setTextColor(75, 85, 99);
    doc.text(legend.text, legendX + 6, legendY + 7);
    legendX += 32;
  });

  // Footer
  doc.setFontSize(8);
  doc.setTextColor(156, 163, 175);
  doc.text(
    "This scorecard is auto-generated. Please verify all data before use.",
    pageWidth / 2,
    doc.internal.pageSize.getHeight() - 10,
    { align: "center" }
  );

  // Save
  const sanitizedName = employeeName.replace(/[^a-zA-Z0-9]/g, "_");
  doc.save(`Scorecard_${sanitizedName}_${monthName}_${year}.pdf`);
}
