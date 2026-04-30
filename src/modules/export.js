// src/modules/export.js
// Excel (.xlsx) and CSV export using SheetJS

import * as XLSX from 'xlsx';

const LEAD_COLUMNS = [
  { key: 'name', label: 'Full Name' },
  { key: 'title', label: 'Job Title' },
  { key: 'company', label: 'Company' },
  { key: 'industry', label: 'Industry' },
  { key: 'country', label: 'Country' },
  { key: 'email', label: 'Email' },
  { key: 'phone', label: 'Phone' },
  { key: 'website', label: 'Website' },
  { key: 'linkedin', label: 'LinkedIn URL' },
  { key: 'employees', label: 'Employees' },
  { key: 'revenue', label: 'Revenue' },
  { key: 'source', label: 'Data Source' },
  { key: 'type', label: 'Lead Type' },
];

function leadsToRows(leads) {
  return leads.map(lead => {
    const row = {};
    LEAD_COLUMNS.forEach(col => { row[col.label] = lead[col.key] || ''; });
    return row;
  });
}

export function exportToExcel(leads, filename = 'leads') {
  const rows = leadsToRows(leads);
  const ws = XLSX.utils.json_to_sheet(rows);

  // Column widths
  ws['!cols'] = LEAD_COLUMNS.map(col => ({
    wch: Math.max(col.label.length + 2, 18)
  }));

  // Header style (SheetJS CE doesn't support full styles, but set freeze)
  ws['!freeze'] = { xSplit: 0, ySplit: 1 };

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Leads');

  // Add stats sheet
  const statsData = [
    ['Metric', 'Value'],
    ['Total Leads', leads.length],
    ['With Email', leads.filter(l => l.email).length],
    ['With Phone', leads.filter(l => l.phone).length],
    ['Export Date', new Date().toLocaleString()],
    [],
    ['By Source'],
    ...Object.entries(
      leads.reduce((acc, l) => { acc[l.source] = (acc[l.source] || 0) + 1; return acc; }, {})
    ).map(([k, v]) => [k, v])
  ];
  const ws2 = XLSX.utils.aoa_to_sheet(statsData);
  ws2['!cols'] = [{ wch: 20 }, { wch: 15 }];
  XLSX.utils.book_append_sheet(wb, ws2, 'Stats');

  XLSX.writeFile(wb, `${filename}_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

export function exportToCSV(leads, filename = 'leads') {
  const rows = leadsToRows(leads);
  const ws = XLSX.utils.json_to_sheet(rows);
  const csv = XLSX.utils.sheet_to_csv(ws);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportCompetitorReport(competitors, filename = 'competitor_analysis') {
  const wb = XLSX.utils.book_new();

  competitors.forEach((comp, i) => {
    const data = [
      ['Company Name', comp.name || ''],
      ['Domain', comp.domain || ''],
      ['Industry', comp.industry || ''],
      ['Employees', comp.employees || ''],
      ['Revenue', comp.revenue || ''],
      ['Founded', comp.founded || ''],
      ['Country', comp.country || ''],
      ['Description', comp.description || ''],
      [],
      ['Technologies'],
      ...(comp.technologies || []).map(t => [t]),
      [],
      ['Pricing Found'],
      ...(comp.pricing || []).map(p => [p]),
      [],
      ['Social Links'],
      ...(comp.socialLinks || []).map(s => [s]),
    ];
    const ws = XLSX.utils.aoa_to_sheet(data);
    ws['!cols'] = [{ wch: 22 }, { wch: 50 }];
    const sheetName = (comp.name || `Competitor ${i + 1}`).slice(0, 31);
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
  });

  XLSX.writeFile(wb, `${filename}_${new Date().toISOString().slice(0, 10)}.xlsx`);
}
