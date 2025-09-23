import * as XLSX from 'xlsx';
import { format } from 'date-fns';

export interface ExportData {
  leads?: any[];
  opportunities?: any[];
  attendance?: any[];
  companies?: any[];
  projects?: any[];
  activities?: any[];
  immediateSales?: any[];
  pendingQuotations?: any[];
  pipelines?: any[];
  analytics?: any;
  forecast?: any;
  // Detailed report sections
  salesReport?: {
    totalRevenue: number;
    totalDeals: number;
    conversionRate: number;
    averageDealSize: number;
    pipelineStages: Array<{ stage: string; count: number; value: number }>;
    monthlyTrends: Array<{ month: string; revenue: number; deals: number }>;
  };
  attendanceReport?: {
    totalEmployees: number;
    presentToday: number;
    absentToday: number;
    lateSubmissions: number;
    monthlyAttendance: Array<{ date: string; present: number; absent: number }>;
  };
  quotationReport?: {
    totalQuotations: number;
    pendingQuotations: number;
    acceptedQuotations: number;
    rejectedQuotations: number;
    overdueQuotations: number;
    totalValue: number;
    averageResponseTime: number;
    topClients: Array<{ name: string; quotations: number; value: number }>;
  };
}

export class ExcelExportService {
  private createWorksheet(data: any[], sheetName: string, headers: string[]) {
    // Add numbering column to headers for non-summary sheets
    const enhancedHeaders = sheetName === 'Summary' ? headers : ['No.', ...headers];

    // Add row numbers to data
    const enhancedData = data.map((row, index) => ({
      ...(sheetName !== 'Summary' && { 'No.': index + 1 }),
      ...row
    }));

    const worksheet = XLSX.utils.json_to_sheet(enhancedData);
    XLSX.utils.sheet_add_aoa(worksheet, [enhancedHeaders], { origin: 'A1' });

    // Enhanced column auto-sizing with better width calculations and max limits
    const colWidths = enhancedHeaders.map((header, index) => {
      const maxDataWidth = enhancedData.reduce((max, row) => {
        const cellValue = row[Object.keys(row)[index]] || '';
        const valueLength = String(cellValue).length;
        // Special handling for long text fields
        if (header.toLowerCase().includes('description') || header.toLowerCase().includes('notes')) {
          return Math.min(valueLength, 50); // Cap description/notes columns
        }
        return Math.max(max, valueLength);
      }, 0);
      
      // Set appropriate widths based on content type
      let idealWidth = Math.max(header.length, maxDataWidth, 10);
      
      // Apply specific width rules
      if (header.toLowerCase().includes('id')) {
        idealWidth = Math.min(idealWidth, 15);
      } else if (header.toLowerCase().includes('email')) {
        idealWidth = Math.min(idealWidth, 30);
      } else if (header.toLowerCase().includes('date')) {
        idealWidth = Math.max(idealWidth, 20);
      } else if (header.toLowerCase().includes('value') || header.toLowerCase().includes('amount')) {
        idealWidth = Math.max(idealWidth, 15);
      }
      
      return { wch: Math.min(idealWidth, 60) }; // Max width cap at 60
    });
    worksheet['!cols'] = colWidths;

    // Add professional styling with sheet name
    this.applyProfessionalStyling(worksheet, enhancedHeaders.length, enhancedData.length, sheetName);

    return worksheet;
  }

  private applyProfessionalStyling(worksheet: XLSX.WorkSheet, colCount: number, rowCount: number, sheetName?: string) {
    // Enhanced header styling with Apple-inspired colors
    const headerStyle: any = {
      font: { bold: true, sz: 12, color: { rgb: "FFFFFF" }, name: "SF Pro Display" },
      fill: { fgColor: { rgb: "1F2937" } }, // Dark gray header (Apple-inspired)
      alignment: { horizontal: "center", vertical: "center", wrapText: true },
      border: {
        top: { style: "medium", color: { rgb: "FFFFFF" } },
        bottom: { style: "medium", color: { rgb: "FFFFFF" } },
        left: { style: "thin", color: { rgb: "FFFFFF" } },
        right: { style: "thin", color: { rgb: "FFFFFF" } }
      }
    };

    // Base data styling
    const dataStyle: any = {
      font: { sz: 11, name: "SF Pro Text" },
      alignment: { vertical: "center", wrapText: true },
      border: {
        top: { style: "thin", color: { rgb: "E5E7EB" } },
        bottom: { style: "thin", color: { rgb: "E5E7EB" } },
        left: { style: "thin", color: { rgb: "E5E7EB" } },
        right: { style: "thin", color: { rgb: "E5E7EB" } }
      }
    };

    // Enhanced styling based on sheet type
    const getRowStyle = (rowIndex: number, isImportant: boolean = false) => {
      const rowStyle: any = { ...dataStyle };

      // Alternating row colors with subtle Apple-inspired gradients
      if (rowIndex % 2 === 0) {
        rowStyle.fill = { fgColor: { rgb: "F9FAFB" } }; // Very light gray
      } else {
        rowStyle.fill = { fgColor: { rgb: "FFFFFF" } }; // Pure white
      }

      // Highlight important data
      if (isImportant) {
        rowStyle.fill = { fgColor: { rgb: "FEF3C7" } }; // Light yellow for important data
        rowStyle.font = { ...rowStyle.font, bold: true };
      }

      return rowStyle;
    };

    // Apply enhanced header styling
    for (let col = 0; col < colCount; col++) {
      const cellRef = XLSX.utils.encode_cell({ r: 0, c: col });
      const wsAny: any = worksheet as any;
      if (!wsAny[cellRef]) wsAny[cellRef] = {};
      wsAny[cellRef].s = headerStyle;

      // Add row numbering if this is the first column
      if (col === 0 && sheetName !== 'Summary') {
        worksheet[cellRef].v = 'No.';
        worksheet[cellRef].t = 'str';
      }
    }

    // Apply enhanced data styling with intelligent highlighting
    for (let row = 1; row <= rowCount; row++) {
      let isImportant = false;

      // Check if this row contains important data
      for (let col = 0; col < colCount; col++) {
        const cellRef = XLSX.utils.encode_cell({ r: row, c: col });
        if (worksheet[cellRef]) {
          const cellValue = worksheet[cellRef].v?.toString() || '';

          // Highlight critical statuses, high values, or overdue items
          if (cellValue.includes('OVERDUE') ||
              cellValue.includes('CRITICAL') ||
              cellValue.includes('HIGH') ||
              cellValue.includes('LOST') ||
              cellValue.includes('CLOSED_LOST') ||
              parseFloat(cellValue.replace(/[^\d.-]/g, '')) > 1000000) {
            isImportant = true;
            break;
          }
        }
      }

      // Add row numbering
      if (sheetName !== 'Summary') {
        const numberCellRef = XLSX.utils.encode_cell({ r: row, c: 0 });
        const wsAny: any = worksheet as any;
        if (!wsAny[numberCellRef]) wsAny[numberCellRef] = {};
        wsAny[numberCellRef].v = row;
        wsAny[numberCellRef].t = 'n';
        wsAny[numberCellRef].s = getRowStyle(row, isImportant);
      }

      // Apply styling to all cells in the row
      for (let col = 0; col < colCount; col++) {
        const cellRef = XLSX.utils.encode_cell({ r: row, c: col });
        const wsAny: any = worksheet as any;
        if (wsAny[cellRef]) {
          wsAny[cellRef].s = getRowStyle(row, isImportant);
        }
    }
  }

    // Enhanced freeze panes and navigation
    worksheet['!freeze'] = { xSplit: 1, ySplit: 1 }; // Freeze first column and header row

    // Professional print settings
    worksheet['!printHeader'] = [{
      h: `${sheetName || 'CRM Report'} - Generated by CRM System`,
      l: "",
      r: "",
      c: ""
    }];
    worksheet['!margins'] = { left: 0.7, right: 0.7, top: 0.75, bottom: 0.75 };

    // Add data validation and auto-filter
    (worksheet as any)['!autofilter'] = { ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: 0, c: colCount - 1 } }) };
  }

  private formatDate(date: Date | string | null): string {
    if (!date) return '';
    try {
      const dateObj = typeof date === 'string' ? new Date(date) : date;
      return format(dateObj, 'yyyy-MM-dd HH:mm:ss');
    } catch {
      return String(date);
    }
  }
  
  private formatIndianCurrency(value: number): string {
    if (!value) return '0';
    if (value >= 10000000) {
      return `${(value / 10000000).toFixed(2)} Cr`;
    } else if (value >= 100000) {
      return `${(value / 100000).toFixed(2)} L`;
    } else {
      return value.toLocaleString('en-IN');
    }
  }

  exportLeads(leads: any[]): XLSX.WorkSheet {
    const formattedData = leads.map(lead => ({
      'Lead ID': lead.id || '',
      'Name': lead.name || '',
      'Email': lead.email || '',
      'Phone': lead.phone || '',
      'Source': lead.source || '',
      'Status': lead.status || '',
      'Owner': lead.owner?.name || '',
      'Value': lead.value || 0,
      'Probability': lead.probability || 0,
      'Created Date': this.formatDate(lead.createdDate),
      'Updated Date': this.formatDate(lead.updatedAt),
    }));

    const headers = [
      'Lead ID', 'Name', 'Email', 'Phone', 'Source',
      'Status', 'Owner', 'Value', 'Probability', 'Created Date', 'Updated Date'
    ];

    return this.createWorksheet(formattedData, 'Leads', headers);
  }

  exportOpportunities(opportunities: any[]): XLSX.WorkSheet {
    const formattedData = opportunities.map(opp => ({
      'Opportunity ID': opp.id || '',
      'Name': opp.name || '',
      'Stage': opp.stage || '',
      'Deal Size': opp.dealSize || 0,
      'Probability': opp.probability || 0,
      'Expected Close Date': this.formatDate(opp.expectedCloseDate),
      'Next Follow-up': this.formatDate(opp.nextFollowupDate),
      'Company': opp.company?.name || opp.companies?.name || '',
      'Lead': opp.lead?.name || opp.leads?.name || '',
      'Owner': opp.owner?.name || opp.users?.name || '',
      'Classification': opp.classification || '',
      'Created Date': this.formatDate(opp.createdDate),
      'Updated Date': this.formatDate(opp.updatedAt),
    }));

    const headers = [
      'Opportunity ID', 'Name', 'Stage', 'Deal Size', 'Probability',
      'Expected Close Date', 'Next Follow-up', 'Company', 'Lead',
      'Owner', 'Classification', 'Created Date', 'Updated Date'
    ];

    return this.createWorksheet(formattedData, 'Opportunities', headers);
  }

  exportAttendance(attendance: any[]): XLSX.WorkSheet {
    const formattedData = attendance.map(record => ({
      'Record ID': record.id || '',
      'User': record.user?.name || record.users_attendances_userIdTousers?.name || '',
      'Employee Code': record.user?.employeeCode || record.users_attendances_userIdTousers?.employeeCode || '',
      'Date': record.date ? format(new Date(record.date), 'yyyy-MM-dd') : '',
      'Status': record.status || '',
      'Visit Report': record.visitReport || '',
      'Timeline URL': record.timelineUrl || '',
      'Photo URL': record.photoUrl || '',
      'Submitted At': this.formatDate(record.submittedAt || record.submittedAtUTC),
      'Reviewed At': this.formatDate(record.reviewedAt || record.reviewedAtUTC),
    }));

    const headers = [
      'Record ID', 'User', 'Employee Code', 'Date', 'Status',
      'Visit Report', 'Timeline URL', 'Photo URL', 'Submitted At', 'Reviewed At'
    ];

    return this.createWorksheet(formattedData, 'Attendance', headers);
  }

  exportCompanies(companies: any[]): XLSX.WorkSheet {
    const formattedData = companies.map(company => ({
      'Company ID': company.id || '',
      'Name': company.name || '',
      'Region': company.region || '',
      'Type': company.type || '',
      'Address': company.address || '',
      'Website': company.website || '',
      'Total Opportunities': company.opportunities?.length || 0,
      'Open Deals': company.opportunities?.filter((opp: any) =>
        opp.stage !== 'CLOSED_WON' && opp.stage !== 'CLOSED_LOST'
      ).length || 0,
      'Total Value': company.opportunities?.reduce((sum: number, opp: any) =>
        sum + (opp.dealSize || 0), 0) || 0,
      'Created Date': this.formatDate(company.createdDate),
      'Updated Date': this.formatDate(company.updatedAt),
    }));

    const headers = [
      'Company ID', 'Name', 'Region', 'Type', 'Address', 'Website',
      'Total Opportunities', 'Open Deals', 'Total Value', 'Created Date', 'Updated Date'
    ];

    return this.createWorksheet(formattedData, 'Companies', headers);
  }

  exportProjects(projects: any[]): XLSX.WorkSheet {
    const formattedData = projects.map(project => ({
      'Project ID': project.id || '',
      'Name': project.name || '',
      'Description': project.description || '',
      'Status': project.status || '',
      'Priority': project.priority || '',
      'Start Date': this.formatDate(project.startDate),
      'End Date': this.formatDate(project.endDate),
      'Budget': project.budget || 0,
      'Owner': project.owner?.name || '',
      'Assigned Admin': project.assignedAdmin?.name || '',
      'Progress': project.progress || 0,
      'Created Date': this.formatDate(project.createdDate),
      'Updated Date': this.formatDate(project.updatedAt),
    }));

    const headers = [
      'Project ID', 'Name', 'Description', 'Status', 'Priority',
      'Start Date', 'End Date', 'Budget', 'Owner', 'Assigned Admin',
      'Progress', 'Created Date', 'Updated Date'
    ];

    return this.createWorksheet(formattedData, 'Projects', headers);
  }

  exportActivities(activities: any[]): XLSX.WorkSheet {
    const formattedData = activities.map(activity => ({
      'Activity ID': activity.id || '',
      'Type': activity.type || '',
      'Subject': activity.subject || activity.actionDescription || '',
      'Duration (min)': activity.duration || 0,
      'Occurred At': this.formatDate(activity.occurredAt || activity.occurredAtUTC),
      'User': activity.user?.name || activity.users?.name || '',
      'Lead': activity.lead?.name || activity.leads?.name || '',
      'Evidence URL': activity.evidenceUrl || '',
      'Created Date': this.formatDate(activity.createdAt),
    }));

    const headers = [
      'Activity ID', 'Type', 'Subject', 'Duration (min)', 'Occurred At',
      'User', 'Lead', 'Evidence URL', 'Created Date'
    ];

    return this.createWorksheet(formattedData, 'Activities', headers);
  }

  exportImmediateSales(immediateSales: any[]): XLSX.WorkSheet {
    const formattedData = immediateSales.map(sale => ({
      'Sale ID': sale.id || '',
      'Project': sale.projects?.name || '',
      'Contractor': sale.contractor || '',
      'Size Class': sale.sizeClass || '',
      'KM': sale.km || 0,
      'MT': sale.mt || 0,
      'Order Value': sale.valueOfOrder || 0,
      'Status': sale.status || '',
      'Quotation Date': this.formatDate(sale.quotationDate),
      'PIC': sale.pic || '',
      'Created Date': this.formatDate(sale.createdAt),
      'Updated Date': this.formatDate(sale.updatedAt),
    }));

    const headers = [
      'Sale ID', 'Project', 'Contractor', 'Size Class', 'KM', 'MT',
      'Order Value', 'Status', 'Quotation Date', 'PIC', 'Created Date', 'Updated Date'
    ];

    return this.createWorksheet(formattedData, 'Immediate Sales', headers);
  }

  exportPipelines(pipelines: any[]): XLSX.WorkSheet {
    const extractFromNotes = (notes?: string, key?: string): string => {
      if (!notes || !key) return '';
      const regex = new RegExp(`${key}[:\s]+([^|\n]+)`, 'i');
      const match = notes.match(regex);
      return match ? match[1].trim() : '';
    };

    const formattedData = pipelines.map((p: any) => ({
      'Customer Name': p.companies?.name || '',
      'Class': p.classLabel || extractFromNotes(p.notes, 'Class') || '',
      'Diameter': p.diameter || '',
      'NR': p.nrLabel || extractFromNotes(p.notes, 'NR') || '',
      'Order Value (Cr)': p.orderValue ? (p.orderValue / 10000000).toFixed(2) : '0.00',
      'Quantity (MT)': p.quantity ?? '',
      'Specification': p.specification || '',
      'Challenges': p.challenges || '',
      'Expected Order Date': this.formatDate(p.expectedDeliveryDate || p.orderDate),
      'Owner': p.users?.name || ''
    }));

    const headers = [
      'Customer Name', 'Class', 'Diameter', 'NR', 'Order Value (Cr)',
      'Quantity (MT)', 'Specification', 'Challenges', 'Expected Order Date', 'Owner'
    ];

    return this.createWorksheet(formattedData, 'Pipelines', headers);
  }

  exportPendingQuotations(pendingQuotations: any[]): XLSX.WorkSheet {
    const formattedData = pendingQuotations.map(quotation => ({
      'Quotation ID': quotation.id || '',
      'Project/Client': quotation.projectOrClientName || '',
      'Order Value': quotation.orderValue || 0,
      'Status': quotation.status || '',
      'Pending Since': this.formatDate(quotation.quotationPendingSince),
      'Deadline': this.formatDate(quotation.quotationDeadline),
      'Contact Person': quotation.contactPerson || '',
      'Contact Email': quotation.contactEmail || '',
      'Days Pending': quotation.daysPending || 0,
      'Days to Deadline': quotation.daysToDeadline || 0,
      'Is Overdue': quotation.isOverdue ? 'Yes' : 'No',
      'Created Date': this.formatDate(quotation.createdAt),
      'Updated Date': this.formatDate(quotation.updatedAt),
    }));

    const headers = [
      'Quotation ID', 'Project/Client', 'Order Value', 'Status', 'Pending Since',
      'Deadline', 'Contact Person', 'Contact Email', 'Days Pending', 'Days to Deadline',
      'Is Overdue', 'Created Date', 'Updated Date'
    ];

    return this.createWorksheet(formattedData, 'Pending Quotations', headers);
  }

  async exportAll(data: ExportData): Promise<Buffer> {
    const workbook = XLSX.utils.book_new();

    // Create summary sheet first
    const summarySheet = this.createSummarySheet(data);
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

    // Add data worksheets
    if (data.leads?.length) {
      const leadsSheet = this.exportLeads(data.leads);
      XLSX.utils.book_append_sheet(workbook, leadsSheet, 'Leads');
    }

    if (data.opportunities?.length) {
      const opportunitiesSheet = this.exportOpportunities(data.opportunities);
      XLSX.utils.book_append_sheet(workbook, opportunitiesSheet, 'Opportunities');
    }
    // Detailed Sales report sheets (metrics, trends, pipeline)
    if (data.salesReport) {
      const salesSummary = this.exportSalesReportSheet(data.salesReport);
      XLSX.utils.book_append_sheet(workbook, salesSummary, 'Sales Report');
      const salesTrends = this.exportSalesTrendsSheet(data.salesReport.monthlyTrends);
      XLSX.utils.book_append_sheet(workbook, salesTrends, 'Revenue Trends');
      const pipelineStages = this.exportPipelineStagesSheet(data.salesReport.pipelineStages);
      XLSX.utils.book_append_sheet(workbook, pipelineStages, 'Pipeline Stages');
    }

    if (data.attendance?.length) {
      const attendanceSheet = this.exportAttendance(data.attendance);
      XLSX.utils.book_append_sheet(workbook, attendanceSheet, 'Attendance');
    }
    // Detailed Attendance report sheets
    if (data.attendanceReport) {
      const attSummary = this.exportAttendanceReportSheet(data.attendanceReport);
      XLSX.utils.book_append_sheet(workbook, attSummary, 'Attendance Report');
      const attTrends = this.exportAttendanceTrendsSheet(data.attendanceReport.monthlyAttendance);
      XLSX.utils.book_append_sheet(workbook, attTrends, 'Attendance Trends');
    }

    if (data.companies?.length) {
      const companiesSheet = this.exportCompanies(data.companies);
      XLSX.utils.book_append_sheet(workbook, companiesSheet, 'Companies');
    }

    if (data.projects?.length) {
      const projectsSheet = this.exportProjects(data.projects);
      XLSX.utils.book_append_sheet(workbook, projectsSheet, 'Projects');
    }

    if (data.activities?.length) {
      const activitiesSheet = this.exportActivities(data.activities);
      XLSX.utils.book_append_sheet(workbook, activitiesSheet, 'Activities');
    }

    if (data.immediateSales?.length) {
      const immediateSalesSheet = this.exportImmediateSales(data.immediateSales);
      XLSX.utils.book_append_sheet(workbook, immediateSalesSheet, 'Immediate Sales');
    }

    if (data.pendingQuotations?.length) {
      const pendingQuotationsSheet = this.exportPendingQuotations(data.pendingQuotations);
      XLSX.utils.book_append_sheet(workbook, pendingQuotationsSheet, 'Pending Quotations');
    }
    // Detailed Quotation report sheet
    if (data.quotationReport) {
      const quoSummary = this.exportQuotationReportSheet(data.quotationReport);
      XLSX.utils.book_append_sheet(workbook, quoSummary, 'Quotation Report');
    }

    if (data.pipelines?.length) {
      const pipelinesSheet = this.exportPipelines(data.pipelines);
      XLSX.utils.book_append_sheet(workbook, pipelinesSheet, 'Pipelines');
    }

    // Add workbook properties
    workbook.Props = {
      Title: "CRM Export Report",
      Subject: "Business Intelligence Report",
      Author: "CRM System",
      CreatedDate: new Date(),
      Company: "CRM Company"
    };

    // Generate buffer with compatible options (removing unsupported XML elements)
    const buffer = XLSX.write(workbook, {
      type: 'buffer',
      bookType: 'xlsx',
      Props: workbook.Props
    });
    return buffer;
  }

  // ===== Detailed Report Sheets =====
  private exportSalesReportSheet(report: NonNullable<ExportData['salesReport']>): XLSX.WorkSheet {
    const rows = [
      { Metric: 'Total Revenue', Value: report.totalRevenue },
      { Metric: 'Total Deals', Value: report.totalDeals },
      { Metric: 'Conversion Rate (%)', Value: report.conversionRate },
      { Metric: 'Average Deal Size', Value: report.averageDealSize },
    ];
    const headers = ['Metric', 'Value'];
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.sheet_add_aoa(ws, [headers], { origin: 'A1' });
    (ws as any)['!cols'] = [{ wch: 28 }, { wch: 20 }];
    this.applySummaryStyling(ws, rows.length);
    return ws;
  }

  private exportSalesTrendsSheet(trends: Array<{ month: string; revenue: number; deals: number }>): XLSX.WorkSheet {
    const headers = ['Period', 'Revenue', 'Deals'];
    const rows = trends.map(t => ({ Period: t.month, Revenue: t.revenue, Deals: t.deals }));
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.sheet_add_aoa(ws, [headers], { origin: 'A1' });
    (ws as any)['!cols'] = [{ wch: 18 }, { wch: 16 }, { wch: 12 }];
    this.applyProfessionalStyling(ws, headers.length, rows.length, 'Revenue Trends');
    return ws;
  }

  private exportPipelineStagesSheet(stages: Array<{ stage: string; count: number; value: number }>): XLSX.WorkSheet {
    const headers = ['Stage', 'Count', 'Value'];
    const rows = stages.map(s => ({ Stage: s.stage, Count: s.count, Value: s.value }));
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.sheet_add_aoa(ws, [headers], { origin: 'A1' });
    (ws as any)['!cols'] = [{ wch: 18 }, { wch: 12 }, { wch: 16 }];
    this.applyProfessionalStyling(ws, headers.length, rows.length, 'Pipeline Stages');
    return ws;
  }

  private exportAttendanceReportSheet(report: NonNullable<ExportData['attendanceReport']>): XLSX.WorkSheet {
    const rows = [
      { Metric: 'Total Employees', Value: report.totalEmployees },
      { Metric: 'Present Today', Value: report.presentToday },
      { Metric: 'Absent Today', Value: report.absentToday },
      { Metric: 'Late Submissions', Value: report.lateSubmissions },
      { Metric: 'Attendance Rate (%)', Value: report.totalEmployees > 0 ? (report.presentToday / report.totalEmployees) * 100 : 0 },
    ];
    const headers = ['Metric', 'Value'];
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.sheet_add_aoa(ws, [headers], { origin: 'A1' });
    (ws as any)['!cols'] = [{ wch: 28 }, { wch: 20 }];
    this.applySummaryStyling(ws, rows.length);
    return ws;
  }

  private exportAttendanceTrendsSheet(trend: Array<{ date: string; present: number; absent: number }>): XLSX.WorkSheet {
    const headers = ['Date', 'Present', 'Absent'];
    const rows = trend.map(d => ({ Date: d.date, Present: d.present, Absent: d.absent }));
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.sheet_add_aoa(ws, [headers], { origin: 'A1' });
    (ws as any)['!cols'] = [{ wch: 16 }, { wch: 12 }, { wch: 12 }];
    this.applyProfessionalStyling(ws, headers.length, rows.length, 'Attendance Trends');
    return ws;
  }

  private exportQuotationReportSheet(report: NonNullable<ExportData['quotationReport']>): XLSX.WorkSheet {
    const rows = [
      { Metric: 'Total Quotations', Value: report.totalQuotations },
      { Metric: 'Pending', Value: report.pendingQuotations },
      { Metric: 'Accepted', Value: report.acceptedQuotations },
      { Metric: 'Rejected', Value: report.rejectedQuotations },
      { Metric: 'Overdue', Value: report.overdueQuotations },
      { Metric: 'Total Value', Value: report.totalValue },
      { Metric: 'Avg Response Time (days)', Value: report.averageResponseTime }
    ];
    const headers = ['Metric', 'Value'];
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.sheet_add_aoa(ws, [headers], { origin: 'A1' });
    (ws as any)['!cols'] = [{ wch: 28 }, { wch: 20 }];
    this.applySummaryStyling(ws, rows.length);
    return ws;
  }

  private createSummarySheet(data: ExportData): XLSX.WorkSheet {
    const totalRevenue = data.salesReport?.totalRevenue || data.opportunities?.reduce((sum, opp) => sum + (opp.dealSize || 0), 0) || 0;
    const overdueQuotations = data.quotationReport?.overdueQuotations || data.pendingQuotations?.filter(q => q.isOverdue)?.length || 0;
    const closedWonOpps = data.opportunities?.filter(opp => opp.stage === 'CLOSED_WON').length || 0;
    const totalQuotationValue = data.quotationReport?.totalValue || data.pendingQuotations?.reduce((sum, q) => sum + (q.orderValue || 0), 0) || 0;
    const totalImmediateSalesValue = data.immediateSales?.reduce((sum, s) => sum + (s.valueOfOrder || 0), 0) || 0;

    const summaryData = [
      { Metric: '📊 DATA OVERVIEW', Value: '', Status: 'Section', Priority: '' },
      { Metric: 'Total Leads', Value: data.leads?.length || 0, Status: 'Active', Priority: 'Normal' },
      { Metric: 'Total Opportunities', Value: data.opportunities?.length || 0, Status: 'Active', Priority: 'Normal' },
      { Metric: 'Closed Won Deals', Value: closedWonOpps, Status: closedWonOpps > 0 ? 'Excellent' : 'Normal', Priority: 'Normal' },
      { Metric: 'Total Companies', Value: data.companies?.length || 0, Status: 'Active', Priority: 'Normal' },
      { Metric: 'Total Projects', Value: data.projects?.length || 0, Status: 'Active', Priority: 'Normal' },
      { Metric: '', Value: '', Status: '', Priority: '' },
      { Metric: '💰 FINANCIAL METRICS', Value: '', Status: 'Section', Priority: '' },
      { Metric: 'Total Revenue', Value: `$${totalRevenue.toLocaleString()}`, Status: totalRevenue > 1000000 ? 'Excellent' : 'Active', Priority: totalRevenue > 5000000 ? 'High' : 'Normal' },
      { Metric: 'Average Deal Size', Value: data.salesReport ? `$${data.salesReport.averageDealSize.toLocaleString()}` : 'N/A', Status: 'Active', Priority: 'Normal' },
      { Metric: 'Conversion Rate', Value: data.salesReport ? `${data.salesReport.conversionRate}%` : 'N/A', Status: (data.salesReport?.conversionRate || 0) > 30 ? 'Excellent' : 'Active', Priority: 'Normal' },
      { Metric: 'Immediate Sales Value', Value: `$${totalImmediateSalesValue.toLocaleString()}`, Status: 'Active', Priority: 'Normal' },
      { Metric: '', Value: '', Status: '', Priority: '' },
      { Metric: '📋 QUOTATIONS', Value: '', Status: 'Section', Priority: '' },
      { Metric: 'Total Quotations', Value: data.quotationReport?.totalQuotations || data.pendingQuotations?.length || 0, Status: 'Active', Priority: 'Normal' },
      { Metric: 'Pending Quotations', Value: data.quotationReport?.pendingQuotations || 0, Status: 'Active', Priority: 'Normal' },
      { Metric: 'Overdue Quotations', Value: overdueQuotations, Status: overdueQuotations > 0 ? 'Critical' : 'Normal', Priority: overdueQuotations > 0 ? 'High' : 'Normal' },
      { Metric: 'Total Quotation Value', Value: `$${totalQuotationValue.toLocaleString()}`, Status: 'Active', Priority: 'Normal' },
      { Metric: '', Value: '', Status: '', Priority: '' },
      { Metric: '👥 ATTENDANCE', Value: '', Status: 'Section', Priority: '' },
      { Metric: 'Total Employees', Value: data.attendanceReport?.totalEmployees || 0, Status: 'Active', Priority: 'Normal' },
      { Metric: 'Present Today', Value: data.attendanceReport?.presentToday || 0, Status: 'Active', Priority: 'Normal' },
      { Metric: 'Absent Today', Value: data.attendanceReport?.absentToday || 0, Status: (data.attendanceReport?.absentToday || 0) > 5 ? 'Warning' : 'Normal', Priority: 'Normal' },
      { Metric: 'Attendance Records', Value: data.attendance?.length || 0, Status: 'Active', Priority: 'Normal' },
      { Metric: '', Value: '', Status: '', Priority: '' },
      { Metric: 'Report Generated', Value: this.formatDate(new Date()), Status: 'Info', Priority: 'Normal' }
    ];

    const headers = ['Metric', 'Value', 'Status', 'Priority'];
    const worksheet = XLSX.utils.json_to_sheet(summaryData);
    XLSX.utils.sheet_add_aoa(worksheet, [headers], { origin: 'A1' });

    // Enhanced summary styling
    const colWidths = [
      { wch: 30 }, // Metric
      { wch: 20 }, // Value
      { wch: 12 }, // Status
      { wch: 12 }  // Priority
    ];
    worksheet['!cols'] = colWidths;

    // Apply summary-specific styling
    this.applySummaryStyling(worksheet, summaryData.length);

    return worksheet;
  }

  private applySummaryStyling(worksheet: XLSX.WorkSheet, rowCount: number) {
    // Enhanced header styling with Apple-inspired design
    const headerStyle: any = {
      font: { bold: true, sz: 14, color: { rgb: "FFFFFF" }, name: "SF Pro Display" },
      fill: { fgColor: { rgb: "1F2937" } }, // Dark gray header (Apple-inspired)
      alignment: { horizontal: "center", vertical: "center" },
      border: {
        top: { style: "medium", color: { rgb: "FFFFFF" } },
        bottom: { style: "medium", color: { rgb: "FFFFFF" } },
        left: { style: "thin", color: { rgb: "FFFFFF" } },
        right: { style: "thin", color: { rgb: "FFFFFF" } }
      }
    };

    // Apply header styling for all 4 columns
    for (let col = 0; col < 4; col++) {
      const cellRef = XLSX.utils.encode_cell({ r: 0, c: col });
      const wsAny: any = worksheet as any;
      if (!wsAny[cellRef]) wsAny[cellRef] = {};
      wsAny[cellRef].s = headerStyle;
    }

    // Enhanced data styling with status and priority-based colors
    for (let row = 1; row <= rowCount; row++) {
      const statusCell = worksheet[XLSX.utils.encode_cell({ r: row, c: 2 })]?.v;
      const priorityCell = worksheet[XLSX.utils.encode_cell({ r: row, c: 3 })]?.v;
      const metricCell = worksheet[XLSX.utils.encode_cell({ r: row, c: 0 })]?.v;

      const rowStyle: any = {
        font: { sz: 12, name: "SF Pro Text" },
        alignment: { vertical: "center" },
        border: {
          top: { style: "thin", color: { rgb: "E5E7EB" } },
          bottom: { style: "thin", color: { rgb: "E5E7EB" } },
          left: { style: "thin", color: { rgb: "E5E7EB" } },
          right: { style: "thin", color: { rgb: "E5E7EB" } }
        }
      };

      // Section headers - special styling
      if (statusCell === 'Section') {
        rowStyle.fill = { fgColor: { rgb: "374151" } }; // Dark gray background
        rowStyle.font = { sz: 13, bold: true, color: { rgb: "FFFFFF" }, name: "SF Pro Display" };
        rowStyle.alignment = { horizontal: "left", vertical: "center" };
      } 
      // Empty rows (spacers)
      else if (metricCell === '' && statusCell === '') {
        rowStyle.fill = { fgColor: { rgb: "FFFFFF" } };
        rowStyle.border = {
          top: { style: "none" },
          bottom: { style: "none" },
          left: { style: "none" },
          right: { style: "none" }
        };
      }
      // Enhanced status-based styling with Apple-inspired colors
      else if (statusCell === 'Critical') {
        rowStyle.fill = { fgColor: { rgb: "FEF2F2" } }; // Light red
        rowStyle.font.color = { rgb: "DC2626" };
        rowStyle.font.bold = true;
      } else if (statusCell === 'Excellent') {
        rowStyle.fill = { fgColor: { rgb: "F0FDF4" } }; // Light green
        rowStyle.font.color = { rgb: "16A34A" };
        rowStyle.font.bold = true;
      } else if (statusCell === 'Warning') {
        rowStyle.fill = { fgColor: { rgb: "FEF3C7" } }; // Light yellow
        rowStyle.font.color = { rgb: "D97706" };
      } else if (statusCell === 'Active') {
        rowStyle.fill = { fgColor: { rgb: "F0F9FF" } }; // Light blue
        rowStyle.font.color = { rgb: "0284C7" };
      } else if (statusCell === 'Info') {
        rowStyle.fill = { fgColor: { rgb: "F8FAFC" } }; // Very light gray
        rowStyle.font.color = { rgb: "64748B" };
      }

      // Priority-based enhancements
      if (priorityCell === 'High') {
        rowStyle.font.bold = true;
        if (!rowStyle.fill) {
          rowStyle.fill = { fgColor: { rgb: "FFFBEB" } }; // Light yellow for high priority
        }
      }

      // Apply styling to all cells in the row
      for (let col = 0; col < 4; col++) {
        const cellRef = XLSX.utils.encode_cell({ r: row, c: col });
        const wsAny: any = worksheet as any;
        if (wsAny[cellRef]) {
          wsAny[cellRef].s = { ...(wsAny[cellRef].s || {}), ...rowStyle };
        }
      }
    }

    // Enhanced freeze panes and navigation
    (worksheet as any)['!freeze'] = { xSplit: 0, ySplit: 1 };

    // Professional print settings for summary
    (worksheet as any)['!printHeader'] = [{
      h: "CRM Summary Report - Executive Overview",
      l: "",
      r: "",
      c: ""
    }];
    (worksheet as any)['!margins'] = { left: 0.7, right: 0.7, top: 0.75, bottom: 0.75 };
  }

  generateFileName(prefix: string = 'crm-export'): string {
    const timestamp = this.formatDate(new Date()).replace(/\s|:/g, '-');
    return `${prefix}-${timestamp}.xlsx`;
  }
}

export const excelExportService = new ExcelExportService();
