// app/admin/reports/page.tsx

'use client'

import { useState, useEffect } from 'react'
// No longer need to import AdminSidebar here
import { ArrowUpRight, Download, BarChart as BarChartIcon, LineChart as LineChartIcon, Mail } from 'lucide-react'
import { Area, AreaChart, Bar, BarChart, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Line, ComposedChart } from 'recharts'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select'
import { DatePicker } from '@/components/ui/date-picker'

// --- Reusable Themed Components (No changes needed here) ---
const Card = ({ children, className }: { children: React.ReactNode, className?: string }) => (
  <div className={`bg-[#181d28] border border-gray-800 rounded-xl ${className}`}>{children}</div>
);
const CardHeader = ({ children, className }: { children: React.ReactNode, className?: string }) => <div className={`p-6 border-b border-gray-800 ${className}`}>{children}</div>;
const CardContent = ({ children, className }: { children: React.ReactNode, className?: string }) => <div className={`p-6 ${className}`}>{children}</div>;
const ToggleGroup = ({ children, className }: any) => <div className={`flex space-x-1 bg-[#10141c] p-1 rounded-md ${className}`}>{children}</div>
const ToggleGroupItem = ({ children, value, active, onClick, className }: any) => <button onClick={onClick} className={`px-2 py-1.5 rounded-sm transition-colors text-xs ${active ? 'bg-amber-400 text-black' : 'text-gray-400 hover:bg-gray-800 hover:text-white'} ${className}`}>{children}</button>

// --- Glowing Chart Component ---
const RevenueChart = ({ data }: { data: any[] }) => {
  const [chartType, setChartType] = useState<'area' | 'bar'>('bar');

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#0c0f14] p-3 border border-gray-700 rounded-lg shadow-lg">
          <p className="text-sm text-gray-400 mb-2">{label}</p>
          <p className="font-bold text-amber-400">Revenue: ${Number(payload[0].value).toLocaleString()}</p>
          {payload[0].payload.bookings !== undefined && (
            <p className="text-sm text-gray-300 mt-1">Bookings: {payload[0].payload.bookings}</p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="select-none">
      <div className="flex justify-end mb-4">
        <ToggleGroup>
          <ToggleGroupItem value="area" active={chartType === 'area'} onClick={() => setChartType('area')}><LineChartIcon className="h-4 w-4" /></ToggleGroupItem>
          <ToggleGroupItem value="bar" active={chartType === 'bar'} onClick={() => setChartType('bar')}><BarChartIcon className="h-4 w-4" /></ToggleGroupItem>
        </ToggleGroup>
      </div>
      <ResponsiveContainer width="100%" height={320}>
        {chartType === 'area' ? (
          <AreaChart data={data} margin={{ top: 10, right: 30, left: 10, bottom: 20 }}>
            <defs>
              <linearGradient id="colorRevenueArea" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#fbbf24" stopOpacity={0.4}/><stop offset="95%" stopColor="#fbbf24" stopOpacity={0}/></linearGradient>
              <filter id="glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="4" result="coloredBlur"/><feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis 
              dataKey="name" 
              stroke="#9ca3af" 
              fontSize={11} 
              tickLine={false} 
              axisLine={false}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis 
              stroke="#9ca3af" 
              fontSize={12} 
              tickLine={false} 
              axisLine={false} 
              tickFormatter={(value) => value === 0 ? '0' : `$${(value/1000).toFixed(1)}k`}
              domain={[0, 'auto']}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#fbbf24', strokeWidth: 1, strokeDasharray: '3 3' }} />
            <Area 
              type="monotone" 
              dataKey="revenue" 
              stroke="#fbbf24" 
              strokeWidth={2} 
              fill="url(#colorRevenueArea)" 
              filter="url(#glow)"
              connectNulls={false}
            />
          </AreaChart>
        ) : (
          <BarChart data={data} margin={{ top: 10, right: 30, left: 10, bottom: 20 }}>
             <defs>
              <linearGradient id="colorRevenueBar" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#fbbf24" stopOpacity={0.8}/><stop offset="95%" stopColor="#fbbf24" stopOpacity={0.2}/></linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis 
              dataKey="name" 
              stroke="#9ca3af" 
              fontSize={11} 
              tickLine={false} 
              axisLine={false}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis 
              stroke="#9ca3af" 
              fontSize={12} 
              tickLine={false} 
              axisLine={false} 
              tickFormatter={(value) => value === 0 ? '0' : `$${(value/1000).toFixed(1)}k`}
              domain={[0, 'auto']}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'transparent' }} />
            <Bar 
              dataKey="revenue" 
              fill="url(#colorRevenueBar)" 
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  );
};

// --- Main Page Component ---
export default function AdminReportsPage() {
  const [selectedReport, setSelectedReport] = useState('overview');
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const [selectedBranch, setSelectedBranch] = useState('all');
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    return date.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [loading, setLoading] = useState(true);
  const [branches, setBranches] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalBookings: 0,
    occupancyRate: 0,
    avgRating: 0
  });
  const [revenueData, setRevenueData] = useState<any[]>([]);
  const [occupancyData, setOccupancyData] = useState<any[]>([]);
  const [billingData, setBillingData] = useState<any[]>([]);
  const [serviceUsageData, setServiceUsageData] = useState<any[]>([]);
  const [topServicesData, setTopServicesData] = useState<any[]>([]);
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);

  const reportTypes = [
    { id: 'overview', name: 'Business Overview' },
    { id: 'revenue', name: 'Revenue Report' },
    { id: 'occupancy', name: 'Room Occupancy Report' },
    { id: 'billing', name: 'Guest Billing Report' },
    { id: 'service-usage', name: 'Service Usage Report' },
    { id: 'top-services', name: 'Top Services Report' },
  ];

  // Fetch branches on mount
  useEffect(() => {
    const fetchBranches = async () => {
      try {
        const response = await fetch('/api/branches');
        const data = await response.json();
        if (response.ok && data.branches) {
          setBranches(data.branches);
        }
      } catch (error) {
        console.error('[REPORTS] Error fetching branches:', error);
      }
    };
    fetchBranches();
  }, []);

  // Fill in missing dates/periods with zero revenue
  const fillMissingPeriods = (data: any[], startDate: string, endDate: string, period: string) => {
    if (data.length === 0) return [];
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    const filledData: any[] = [];
    
    if (period === 'day') {
      // Fill daily data
      const current = new Date(start);
      while (current <= end) {
        const dateStr = current.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const existing = data.find(d => d.name === dateStr);
        filledData.push(existing || { name: dateStr, revenue: 0, bookings: 0 });
        current.setDate(current.getDate() + 1);
      }
    } else if (period === 'week') {
      // Fill weekly data
      const current = new Date(start);
      while (current <= end) {
        const weekStart = new Date(current);
        weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Start of week
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);
        
        const dateStr = `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
        const existing = data.find(d => d.name.includes(weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).split(',')[0]));
        filledData.push(existing || { name: dateStr, revenue: 0, bookings: 0 });
        current.setDate(current.getDate() + 7);
      }
    } else if (period === 'month' || period === 'year') {
      // Fill monthly data
      const current = new Date(start.getFullYear(), start.getMonth(), 1);
      const endMonth = new Date(end.getFullYear(), end.getMonth(), 1);
      
      while (current <= endMonth) {
        const dateStr = current.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        const existing = data.find(d => d.name === dateStr);
        filledData.push(existing || { name: dateStr, revenue: 0, bookings: 0 });
        current.setMonth(current.getMonth() + 1);
      }
    }
    
    return filledData;
  };

  // Fetch data from API
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Handle new report types with dedicated endpoints
        if (selectedReport === 'occupancy') {
          const response = await fetch(`/api/admin/reports/occupancy?startDate=${startDate}&endDate=${endDate}&branchId=${selectedBranch !== 'all' ? selectedBranch : ''}`);
          const data = await response.json();
          if (response.ok) {
            setOccupancyData(data.data || []);
          }
        } else if (selectedReport === 'billing') {
          const response = await fetch(`/api/admin/reports/billing?includeHistory=true&branchId=${selectedBranch !== 'all' ? selectedBranch : ''}`);
          const data = await response.json();
          if (response.ok) {
            setBillingData(data.data || []);
          }
        } else if (selectedReport === 'service-usage') {
          const response = await fetch(`/api/admin/reports/service-usage?startDate=${startDate}&endDate=${endDate}`);
          const data = await response.json();
          if (response.ok) {
            setServiceUsageData(data.data || []);
          }
        } else if (selectedReport === 'top-services') {
          const response = await fetch(`/api/admin/reports/top-services?startDate=${startDate}&endDate=${endDate}&limit=10`);
          const data = await response.json();
          if (response.ok) {
            setTopServicesData(data.data || []);
          }
        } else {
          // Original overview/revenue logic
          const url = `/api/admin/reports?type=${selectedReport}&period=${selectedPeriod}&branchId=${selectedBranch}&startDate=${startDate}&endDate=${endDate}`;
          console.log('[REPORTS PAGE] Fetching data with URL:', url);
          
          const response = await fetch(url);
          const data = await response.json();

          console.log('[REPORTS PAGE] API Response:', data);

          if (response.ok && data.stats) {
            // Update stats from API response with proper number conversion
            const newStats = {
              totalRevenue: Number(data.stats.totalRevenue) || 0,
              totalBookings: Number(data.stats.totalBookings) || 0,
              occupancyRate: Number(data.stats.occupancyRate) || 0,
              avgRating: Number(data.stats.avgRating) || 0
            };
            
            console.log('[REPORTS PAGE] Setting stats:', newStats);
            setStats(newStats);

            // Transform revenue data for chart and fill missing periods
            if (data.revenueData && Array.isArray(data.revenueData)) {
              const chartData = data.revenueData.map((item: any) => ({
                name: item.name,
                revenue: Number(item.revenue) || 0,
                bookings: Number(item.bookings) || 0
              }));
              
              // Fill in missing periods with zero values
              const filledData = fillMissingPeriods(chartData, startDate, endDate, selectedPeriod);
              setRevenueData(filledData);
            } else {
              setRevenueData([]);
            }
          } else {
            console.error('[REPORTS] Error in response:', data.error || 'Unknown error');
          }
        }
      } catch (error) {
        console.error('[REPORTS] Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedReport, selectedPeriod, selectedBranch, startDate, endDate]);

  // Comprehensive PDF Export Function - Includes all 5 reports
  const exportToPDF = async (returnBlob = false) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    
    const leftMargin = 14;
    const rightMargin = 14;
    const contentWidth = pageWidth - leftMargin - rightMargin;
    let currentPage = 1;
    
    const reportDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const branchName = selectedBranch === 'all' ? 'All Branches' : branches.find(b => b.id === parseInt(selectedBranch))?.name || 'Selected Branch';
    
    // Disclaimer text
    const disclaimer = "This report is confidential and intended solely for internal use. The information contained herein is proprietary to Sky Nest Hotel Management and should not be distributed without authorization. All financial data is subject to verification and final audit.";
    
    // Helper function to add page footer (no disclaimer)
    const addFooter = (pageNum: number) => {
      const footerY = pageHeight - 15;
      doc.setFont('times', 'italic');
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.text('Sky Nest Hotel Management System - Confidential Report', pageWidth / 2, footerY, { align: 'center' });
      doc.setFont('times', 'normal');
      doc.setFontSize(8);
      doc.text(`Page ${pageNum}`, pageWidth / 2, footerY + 4, { align: 'center' });
    };
    
    // Fetch all report data if not already loaded
    let allOccupancyData = occupancyData;
    let allBillingData = billingData;
    let allServiceUsageData = serviceUsageData;
    let allTopServicesData = topServicesData;
    
    try {
      // Fetch all reports in parallel
      const [occupancyRes, billingRes, serviceUsageRes, topServicesRes] = await Promise.all([
        fetch(`/api/admin/reports/occupancy?startDate=${startDate}&endDate=${endDate}&branchId=${selectedBranch !== 'all' ? selectedBranch : ''}`),
        fetch(`/api/admin/reports/billing?includeHistory=true&branchId=${selectedBranch !== 'all' ? selectedBranch : ''}`),
        fetch(`/api/admin/reports/service-usage?startDate=${startDate}&endDate=${endDate}`),
        fetch(`/api/admin/reports/top-services?startDate=${startDate}&endDate=${endDate}&limit=10`)
      ]);
      
      const [occupancyJson, billingJson, serviceUsageJson, topServicesJson] = await Promise.all([
        occupancyRes.json(),
        billingRes.json(),
        serviceUsageRes.json(),
        topServicesRes.json()
      ]);
      
      allOccupancyData = occupancyJson.data || [];
      allBillingData = billingJson.data || [];
      allServiceUsageData = serviceUsageJson.data || [];
      allTopServicesData = topServicesJson.data || [];
    } catch (error) {
      console.error('[PDF] Error fetching report data:', error);
    }
    
    // ==================== COVER PAGE ====================
    const img = new Image();
    img.src = '/SkyadB.png';
    const logoHeight = 35;
    const logoWidth = logoHeight * 3;
    const logoX = (pageWidth - logoWidth) / 2;
    
    // Add logo centered at top
    doc.addImage(img, 'PNG', logoX, 50, logoWidth, logoHeight, undefined, 'FAST');
    
    doc.setFont('times', 'bold');
    doc.setFontSize(28);
    doc.setTextColor(0, 0, 0);
    doc.text('COMPREHENSIVE', pageWidth / 2, 95, { align: 'center' });
    doc.text('MANAGEMENT REPORT', pageWidth / 2, 107, { align: 'center' });
    
    // Subtitle
    doc.setFont('times', 'italic');
    doc.setFontSize(12);
    doc.setTextColor(60, 60, 60);
    doc.text('Sky Nest Hotel Management System', pageWidth / 2, 120, { align: 'center' });
    
    // Report period
    doc.setFont('times', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(80, 80, 80);
    const periodText = `${new Date(startDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} - ${new Date(endDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`;
    doc.text(`Report Period: ${periodText}`, pageWidth / 2, 135, { align: 'center' });
    doc.text(`Branch: ${branchName}`, pageWidth / 2, 143, { align: 'center' });
    doc.text(`Generated: ${reportDate}`, pageWidth / 2, 151, { align: 'center' });
    
    // Disclaimer box
    doc.setFillColor(250, 250, 250);
    doc.setDrawColor(180, 180, 180);
    doc.setLineWidth(0.5);
    doc.roundedRect(25, 170, pageWidth - 50, 35, 3, 3, 'FD');
    
    doc.setFont('times', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text('CONFIDENTIAL DISCLAIMER', pageWidth / 2, 180, { align: 'center' });
    
    doc.setFont('times', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(40, 40, 40);
    const disclaimerLines = doc.splitTextToSize(disclaimer, pageWidth - 60);
    doc.text(disclaimerLines, pageWidth / 2, 188, { align: 'center', maxWidth: pageWidth - 60 });
    
    // Add page number to cover
    addFooter(currentPage);
    currentPage++;
    
    // ==================== PAGE 2: Executive Summary + Revenue ====================
    doc.addPage();
    
    // Logo on top (smaller)
    // const smallLogoHeight = 20;
    // const smallLogoWidth = smallLogoHeight * 3;
    // const smallLogoX = (pageWidth - smallLogoWidth) / 2;
    // doc.addImage(img, 'PNG', smallLogoX, 8, smallLogoWidth, smallLogoHeight, undefined, 'FAST');
    
    // doc.setDrawColor(200, 200, 200);
    // doc.setLineWidth(0.3);
    // doc.line(leftMargin, 28, pageWidth - rightMargin, 28);
    
    doc.setFont('times', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(0, 0, 0);
    doc.text('Comprehensive Hotel Management Report', pageWidth / 2, 37, { align: 'center' });
    
    doc.setFont('times', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(80, 80, 80);
    doc.text(`Report Date: ${reportDate}  |  Period: ${new Date(startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} - ${new Date(endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}  |  Branch: ${branchName}`, pageWidth / 2, 46, { align: 'center' });
    
    // Executive Summary
    doc.setFont('times', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text('Executive Summary', leftMargin, 58);
    
    const metricsData = [
      ['Total Revenue', `$${stats.totalRevenue.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`],
      ['Total Bookings', stats.totalBookings.toString()],
      ['Occupancy Rate', `${stats.occupancyRate}%`],
      ['Average Rating', `${stats.avgRating.toFixed(1)} / 5.0`]
    ];
    
    autoTable(doc, {
      startY: 62,
      head: [['Metric', 'Value']],
      body: metricsData,
      theme: 'grid',
      headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold', halign: 'center', fontSize: 9 },
      styles: { fontSize: 8, font: 'times', cellPadding: 3, lineColor: [200, 200, 200], lineWidth: 0.1, halign: 'center' },
      columnStyles: { 
        0: { fontStyle: 'bold', cellWidth: 80, halign: 'left' },
        1: { halign: 'right', fontStyle: 'normal' }
      },
      alternateRowStyles: { fillColor: [250, 250, 250] },
      margin: { left: leftMargin, right: rightMargin },
      tableWidth: 'auto'
    });
    
    // Revenue Breakdown
    let finalY = (doc as any).lastAutoTable.finalY || 95;
    doc.setFont('times', 'bold');
    doc.setFontSize(11);
    doc.text('1. Revenue Report', leftMargin, finalY + 10);
    
    const revenueTableData = revenueData.slice(0, 10).map(item => [
      item.name,
      `$${item.revenue.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`,
      item.bookings.toString()
    ]);
    
    autoTable(doc, {
      startY: finalY + 14,
      head: [['Period', 'Revenue', 'Bookings']],
      body: revenueTableData,
      theme: 'grid',
      headStyles: { fillColor: [235, 235, 235], textColor: [0, 0, 0], fontStyle: 'bold', fontSize: 8, halign: 'center' },
      styles: { fontSize: 7, font: 'times', cellPadding: 2.5, lineColor: [200, 200, 200], lineWidth: 0.1, halign: 'center' },
      columnStyles: {
        0: { fontStyle: 'normal', cellWidth: 55, halign: 'left' },
        1: { halign: 'right', fontStyle: 'normal', cellWidth: 65 },
        2: { halign: 'center', fontStyle: 'normal', cellWidth: 45 }
      },
      alternateRowStyles: { fillColor: [250, 250, 250] },
      margin: { left: leftMargin, right: rightMargin },
      tableWidth: 'auto'
    });
    
    addFooter(currentPage++);
    
    // PAGE 2: Room Occupancy Report
    doc.addPage();
    doc.setFont('times', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text('2. Room Occupancy Report', leftMargin, 20);
    
    if (allOccupancyData.length > 0) {
      const occupancyTableData = allOccupancyData.slice(0, 25).map((row: any) => [
        row.branch_name,
        row.room_number,
        row.room_type,
        row.total_days,
        row.occupied_days,
        `${parseFloat(row.occupancy_rate).toFixed(1)}%`,
        `$${parseFloat(row.total_revenue).toLocaleString()}`
      ]);
      
      autoTable(doc, {
        startY: 25,
        head: [['Branch', 'Room', 'Type', 'Total Days', 'Occupied', 'Rate', 'Revenue']],
        body: occupancyTableData,
        theme: 'grid',
        headStyles: { fillColor: [235, 235, 235], textColor: [0, 0, 0], fontStyle: 'bold', fontSize: 7, halign: 'center' },
        styles: { fontSize: 6.5, font: 'times', cellPadding: 2, lineColor: [200, 200, 200], lineWidth: 0.1, halign: 'center' },
        columnStyles: {
          0: { cellWidth: 30, halign: 'left' },
          1: { cellWidth: 20, halign: 'center' },
          2: { cellWidth: 25, halign: 'left' },
          3: { cellWidth: 20, halign: 'center' },
          4: { cellWidth: 20, halign: 'center' },
          5: { cellWidth: 20, halign: 'center' },
          6: { cellWidth: 30, halign: 'right' }
        },
        alternateRowStyles: { fillColor: [250, 250, 250] },
        margin: { left: leftMargin, right: rightMargin },
        tableWidth: 'auto'
      });
    } else {
      doc.setFont('times', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      doc.text('No occupancy data available for this period.', leftMargin, 35);
    }
    
    addFooter(currentPage++);
    
    // PAGE 3: Guest Billing Report
    doc.addPage();
    doc.setFont('times', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text('3. Guest Billing Report', leftMargin, 20);
    
    if (allBillingData.length > 0) {
      const billingTableData = allBillingData.slice(0, 20).map((row: any) => [
        row.guest_name,
        row.room_number,
        new Date(row.check_in_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        `$${parseFloat(row.room_charges).toLocaleString()}`,
        `$${parseFloat(row.service_charges).toLocaleString()}`,
        `$${parseFloat(row.total_amount).toLocaleString()}`,
        row.payment_status
      ]);
      
      autoTable(doc, {
        startY: 25,
        head: [['Guest', 'Room', 'Check-in', 'Room Charges', 'Service', 'Total', 'Status']],
        body: billingTableData,
        theme: 'grid',
        headStyles: { fillColor: [235, 235, 235], textColor: [0, 0, 0], fontStyle: 'bold', fontSize: 7, halign: 'center' },
        styles: { fontSize: 6.5, font: 'times', cellPadding: 2, lineColor: [200, 200, 200], lineWidth: 0.1, halign: 'center' },
        columnStyles: {
          0: { cellWidth: 30, halign: 'left' },
          1: { cellWidth: 18, halign: 'center' },
          2: { cellWidth: 22, halign: 'center' },
          3: { cellWidth: 25, halign: 'right' },
          4: { cellWidth: 20, halign: 'right' },
          5: { cellWidth: 25, halign: 'right', fontStyle: 'bold' },
          6: { cellWidth: 20, halign: 'center' }
        },
        alternateRowStyles: { fillColor: [250, 250, 250] },
        margin: { left: leftMargin, right: rightMargin },
        tableWidth: 'auto'
      });
    } else {
      doc.setFont('times', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      doc.text('No billing data available.', leftMargin, 35);
    }
    
    addFooter(currentPage++);
    
    // PAGE 4: Service Usage Report
    doc.addPage();
    doc.setFont('times', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text('4. Service Usage Report (Completed Requests)', leftMargin, 20);
    
    if (allServiceUsageData.length > 0) {
      // Summary Section
      const totalRevenue = allServiceUsageData.reduce((sum, row) => sum + parseFloat(row.total_price || 0), 0);
      const uniqueGuests = new Set(allServiceUsageData.map((row: any) => row.guest_name)).size;
      const avgPerRequest = totalRevenue / allServiceUsageData.length;
      
      doc.setFont('times', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(60, 60, 60);
      let summaryY = 28;
      doc.text(`Total Requests: ${allServiceUsageData.length}`, leftMargin, summaryY);
      doc.text(`Total Revenue: $${totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, leftMargin + 50, summaryY);
      doc.text(`Unique Guests: ${uniqueGuests}`, leftMargin + 110, summaryY);
      doc.text(`Avg/Request: $${avgPerRequest.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, leftMargin + 150, summaryY);
      
      const serviceUsageTableData = allServiceUsageData.slice(0, 30).map((row: any) => [
        row.usage_date ? new Date(row.usage_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '-',
        (row.request_reference || '').substring(0, 10),
        row.guest_name || '-',
        (row.service_name || row.request_type || '-').substring(0, 20),
        (row.category || 'General').substring(0, 12),
        (row.branch_name || '-').substring(0, 15),
        row.room_number || '-',
        (row.priority || 'Normal').substring(0, 6),
        `$${parseFloat(row.total_price || 0).toFixed(2)}`
      ]);
      
      autoTable(doc, {
        startY: summaryY + 5,
        head: [['Date', 'Reference', 'Guest', 'Service', 'Category', 'Branch', 'Room', 'Priority', 'Price']],
        body: serviceUsageTableData,
        foot: [[
          { content: 'TOTAL', colSpan: 8, styles: { halign: 'right', fontStyle: 'bold' } },
          { content: `$${totalRevenue.toFixed(2)}`, styles: { fontStyle: 'bold', halign: 'right' } }
        ]],
        theme: 'grid',
        headStyles: { fillColor: [235, 235, 235], textColor: [0, 0, 0], fontStyle: 'bold', fontSize: 7, halign: 'center' },
        footStyles: { fillColor: [245, 245, 245], textColor: [0, 0, 0], fontStyle: 'bold', fontSize: 7 },
        styles: { fontSize: 6, font: 'times', cellPadding: 1.5, lineColor: [200, 200, 200], lineWidth: 0.1, halign: 'center' },
        columnStyles: {
          0: { cellWidth: 18, halign: 'center' }, 
          1: { cellWidth: 20, halign: 'center' }, 
          2: { cellWidth: 22, halign: 'left' },
          3: { cellWidth: 25, halign: 'left' }, 
          4: { cellWidth: 18, halign: 'left' },
          5: { cellWidth: 22, halign: 'left' }, 
          6: { cellWidth: 12, halign: 'center' }, 
          7: { cellWidth: 15, halign: 'center' },
          8: { cellWidth: 18, halign: 'right' }
        },
        alternateRowStyles: { fillColor: [250, 250, 250] },
        margin: { left: leftMargin, right: rightMargin },
        tableWidth: 'auto'
      });
    } else {
      doc.setFont('times', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      doc.text('No service usage data for this period.', leftMargin, 35);
    }
    
    addFooter(currentPage++);
    
    // PAGE 5: Top Services Report
    doc.addPage();
    doc.setFont('times', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text('5. Top Services Report', leftMargin, 20);
    
    if (allTopServicesData.length > 0) {
      const topServicesTableData = allTopServicesData.map((row: any, idx: number) => [
        `#${idx + 1}`,
        row.service_name,
        row.category,
        (row.usage_count || 0).toString(),
        (row.total_quantity || 0).toString(),
        `$${parseFloat(row.total_revenue || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      ]);
      
      autoTable(doc, {
        startY: 25,
        head: [['Rank', 'Service', 'Category', 'Usage Count', 'Total Qty', 'Total Revenue']],
        body: topServicesTableData,
        theme: 'grid',
        headStyles: { fillColor: [235, 235, 235], textColor: [0, 0, 0], fontStyle: 'bold', fontSize: 8, halign: 'center' },
        styles: { fontSize: 7, font: 'times', cellPadding: 2.5, lineColor: [200, 200, 200], lineWidth: 0.1, halign: 'center' },
        columnStyles: {
          0: { cellWidth: 20, halign: 'center', fontStyle: 'bold' },
          1: { cellWidth: 50, halign: 'left' },
          2: { cellWidth: 35, halign: 'left' },
          3: { cellWidth: 25, halign: 'center' },
          4: { cellWidth: 25, halign: 'center' },
          5: { cellWidth: 35, halign: 'right', fontStyle: 'bold' }
        },
        alternateRowStyles: { fillColor: [250, 250, 250] },
        margin: { left: leftMargin, right: rightMargin },
        tableWidth: 'auto'
      });
    } else {
      doc.setFont('times', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      doc.text('No service data for this period.', leftMargin, 35);
    }
    
    addFooter(currentPage);
    
    // Return blob for email attachment or save to file
    if (returnBlob) {
      return doc.output('blob');
    } else {
      doc.save(`SkyNest-Report-${new Date().toISOString().split('T')[0]}.pdf`);
    }
  };

  // Email Report Function
  const emailReport = async () => {
    if (!recipientEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipientEmail)) {
      alert('Please enter a valid email address');
      return;
    }

    try {
      setSendingEmail(true);
      
      // Generate PDF as blob for attachment
      const pdfBlob = await exportToPDF(true) as Blob;
      
      // Convert blob to base64
      const reader = new FileReader();
      reader.readAsDataURL(pdfBlob);
      
      reader.onloadend = async () => {
        const base64data = reader.result as string;
        const base64Content = base64data.split(',')[1]; // Remove data:application/pdf;base64, prefix
        
        const response = await fetch('/api/admin/reports/email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            recipientEmail,
            reportData: {
              stats,
              revenueData,
              period: selectedPeriod,
              branch: selectedBranch,
              startDate,
              endDate,
              branches
            },
            pdfAttachment: base64Content,
            fileName: `SkyNest-Report-${new Date().toISOString().split('T')[0]}.pdf`
          })
        });

        const data = await response.json();

        if (response.ok) {
          alert('Report sent successfully with PDF attachment!');
          setShowEmailDialog(false);
          setRecipientEmail('');
        } else {
          alert(`Failed to send report: ${data.error}`);
        }
        
        setSendingEmail(false);
      };
      
      reader.onerror = () => {
        alert('Failed to process PDF for email attachment.');
        setSendingEmail(false);
      };
    } catch (error) {
      console.error('[EMAIL REPORT] Error:', error);
      alert('Failed to send report. Please try again.');
      setSendingEmail(false);
    }
  };

  // The return statement is simplified.
  // We return only the content for the page, not the entire layout structure.
  return (
    <div className="max-w-7xl mx-auto text-gray-300">
      {/* Header */}
      <header className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">Reports & Analytics</h1>
          <p className="text-gray-400">Comprehensive business insights and performance metrics.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => exportToPDF()}
            className="flex items-center space-x-2 px-4 py-2 bg-amber-400 text-black font-semibold rounded-md hover:bg-amber-500 transition-colors"
          >
            <Download size={16} />
            <span>Export PDF</span>
          </button>
          <button 
            onClick={() => setShowEmailDialog(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white font-semibold rounded-md hover:bg-blue-600 transition-colors"
          >
            <Mail size={16} />
            <span>Email Report</span>
          </button>
        </div>
      </header>

      {/* Email Dialog */}
      {showEmailDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowEmailDialog(false)}>
          <div className="bg-[#181d28] border border-gray-800 rounded-xl p-6 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-white mb-4">Email Report</h3>
            <p className="text-gray-400 text-sm mb-4">Enter the recipient's email address to send this report.</p>
            <input
              type="email"
              value={recipientEmail}
              onChange={(e) => setRecipientEmail(e.target.value)}
              placeholder="recipient@example.com"
              className="w-full p-3 bg-[#10141c] border border-gray-700 rounded-md text-gray-300 mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowEmailDialog(false)}
                className="px-4 py-2 bg-gray-700 text-gray-300 rounded-md hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={emailReport}
                disabled={sendingEmail}
                className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {sendingEmail ? 'Sending...' : 'Send Report'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <Card className="mb-8">
        <CardContent className="grid md:grid-cols-2 lg:grid-cols-5 gap-4 p-6">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Report Type</label>
            <Select value={selectedReport} onValueChange={setSelectedReport}>
              <SelectTrigger className="w-full bg-[#10141c] border-gray-700 text-gray-300">
                <SelectValue placeholder="Select report type" />
              </SelectTrigger>
              <SelectContent>
                {reportTypes.map(type => (
                  <SelectItem key={type.id} value={type.id}>{type.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Grouping</label>
            <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
              <SelectTrigger className="w-full bg-[#10141c] border-gray-700 text-gray-300">
                <SelectValue placeholder="Select grouping" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="day">Daily</SelectItem>
                <SelectItem value="week">Weekly</SelectItem>
                <SelectItem value="month">Monthly</SelectItem>
                <SelectItem value="year">Yearly</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Start Date</label>
            <DatePicker
              date={startDate ? new Date(startDate) : undefined}
              onDateChange={(date) => setStartDate(date ? date.toISOString().split('T')[0] : '')}
              disabled={(date) => {
                const maxDate = endDate ? new Date(endDate) : new Date();
                return date > maxDate;
              }}
              placeholder="Select start date"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">End Date</label>
            <DatePicker
              date={endDate ? new Date(endDate) : undefined}
              onDateChange={(date) => setEndDate(date ? date.toISOString().split('T')[0] : '')}
              disabled={(date) => {
                const minDate = startDate ? new Date(startDate) : new Date(0);
                const maxDate = new Date();
                return date < minDate || date > maxDate;
              }}
              placeholder="Select end date"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Branch</label>
            <Select value={selectedBranch} onValueChange={setSelectedBranch}>
              <SelectTrigger className="w-full bg-[#10141c] border-gray-700 text-gray-300">
                <SelectValue placeholder="Select branch" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Branches</SelectItem>
                {branches.map(branch => (
                  <SelectItem key={branch.id} value={branch.id.toString()}>
                    {branch.name} - {branch.location}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Key Metrics - Only show for overview/revenue reports */}
      {(selectedReport === 'overview' || selectedReport === 'revenue') && (
      <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent>
              <div className="flex justify-between items-start mb-2">
                <div>
                  <p className="text-sm text-gray-400">Total Revenue</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {new Date(startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {new Date(endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </p>
                </div>
                <span className="text-xs text-green-400 flex items-center"><ArrowUpRight size={12} className="mr-1"/>+12.5%</span>
              </div>
              {loading ? (
                <div className="h-9 w-32 bg-gray-700 animate-pulse rounded"></div>
              ) : (
                <p className="text-3xl font-bold text-white">${Number(stats.totalRevenue).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <div className="flex justify-between items-start mb-2">
                <div>
                  <p className="text-sm text-gray-400">Total Bookings</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {new Date(startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {new Date(endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </p>
                </div>
                <span className="text-xs text-green-400 flex items-center"><ArrowUpRight size={12} className="mr-1"/>+8.3%</span>
              </div>
              {loading ? (
                <div className="h-9 w-24 bg-gray-700 animate-pulse rounded"></div>
              ) : (
                <p className="text-3xl font-bold text-white">{stats.totalBookings}</p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <div className="flex justify-between items-start mb-2">
                <div>
                  <p className="text-sm text-gray-400">Occupancy Rate</p>
                  <p className="text-xs text-gray-500 mt-0.5">Current</p>
                </div>
                <span className="text-xs text-green-400 flex items-center"><ArrowUpRight size={12} className="mr-1"/>+5.2%</span>
              </div>
              {loading ? (
                <div className="h-9 w-20 bg-gray-700 animate-pulse rounded"></div>
              ) : (
                <p className="text-3xl font-bold text-white">{Number(stats.occupancyRate).toFixed(0)}%</p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <div className="flex justify-between items-start mb-2">
                <div>
                  <p className="text-sm text-gray-400">Average Rating</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {new Date(startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {new Date(endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </p>
                </div>
                <span className="text-xs text-green-400 flex items-center"><ArrowUpRight size={12} className="mr-1"/>+0.3</span>
              </div>
              {loading ? (
                <div className="h-9 w-16 bg-gray-700 animate-pulse rounded"></div>
              ) : (
                <p className="text-3xl font-bold text-white">{Number(stats.avgRating).toFixed(1)}</p>
              )}
            </CardContent>
          </Card>
      </div>
      )}
      
      {/* Main Chart - Only for overview/revenue reports */}
      {(selectedReport === 'overview' || selectedReport === 'revenue') && (
      <div className="lg:col-span-2">
        <Card>
          <CardHeader>
            <h2 className="text-xl font-bold text-white">Revenue Trend</h2>
            <p className="text-sm text-gray-400 mt-1">
              {new Date(startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} - {new Date(endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              {selectedBranch !== 'all' && ` • ${branches.find(b => b.id === parseInt(selectedBranch))?.name || 'Selected Branch'}`}
              {` • ${selectedPeriod === 'day' ? 'Daily' : selectedPeriod === 'week' ? 'Weekly' : selectedPeriod === 'month' ? 'Monthly' : 'Yearly'} View`}
            </p>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center h-80">
                <div className="text-gray-400">Loading chart data...</div>
              </div>
            ) : revenueData.length === 0 ? (
              <div className="flex items-center justify-center h-80">
                <div className="text-center">
                  <p className="text-gray-400 text-lg mb-2">No revenue data available</p>
                  <p className="text-gray-500 text-sm">Try selecting a different time period or branch</p>
                </div>
              </div>
            ) : (
              <RevenueChart data={revenueData} />
            )}
          </CardContent>
        </Card>
      </div>
      )}

      {/* Room Occupancy Report */}
      {selectedReport === 'occupancy' && (
        <Card className="mt-6">
          <CardHeader>
            <h2 className="text-xl font-bold text-white">Room Occupancy Report</h2>
            <p className="text-sm text-gray-400 mt-1">
              {new Date(startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} - {new Date(endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </p>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-gray-400 text-center py-8">Loading occupancy data...</div>
            ) : occupancyData.length === 0 ? (
              <div className="text-gray-400 text-center py-8">No occupancy data available for this period</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-gray-400 uppercase bg-gray-800">
                    <tr>
                      <th className="px-6 py-3">Branch</th>
                      <th className="px-6 py-3">Room</th>
                      <th className="px-6 py-3">Type</th>
                      <th className="px-6 py-3">Total Days</th>
                      <th className="px-6 py-3">Occupied Days</th>
                      <th className="px-6 py-3">Occupancy Rate</th>
                      <th className="px-6 py-3">Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {occupancyData.map((row: any, idx: number) => (
                      <tr key={idx} className="border-b border-gray-800 hover:bg-gray-800/50">
                        <td className="px-6 py-4 text-white">{row.branch_name}</td>
                        <td className="px-6 py-4 text-white">{row.room_number}</td>
                        <td className="px-6 py-4 text-gray-300">{row.room_type}</td>
                        <td className="px-6 py-4 text-gray-300">{row.total_days}</td>
                        <td className="px-6 py-4 text-gray-300">{row.occupied_days}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded text-xs font-semibold ${
                            parseFloat(row.occupancy_rate) >= 80 ? 'bg-green-500/20 text-green-400' :
                            parseFloat(row.occupancy_rate) >= 50 ? 'bg-yellow-500/20 text-yellow-400' :
                            'bg-red-500/20 text-red-400'
                          }`}>
                            {parseFloat(row.occupancy_rate).toFixed(1)}%
                          </span>
                        </td>
                        <td className="px-6 py-4 text-white font-semibold">${parseFloat(row.total_revenue).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Guest Billing Report */}
      {selectedReport === 'billing' && (
        <Card className="mt-6">
          <CardHeader>
            <h2 className="text-xl font-bold text-white">Guest Billing Report</h2>
            <p className="text-sm text-gray-400 mt-1">Active bookings with billing details</p>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-gray-400 text-center py-8">Loading billing data...</div>
            ) : billingData.length === 0 ? (
              <div className="text-gray-400 text-center py-8">No billing data available</div>
            ) : (
              <>
                {/* Summary Cards */}
                <div className="grid grid-cols-4 gap-4 mb-6">
                  <div className="bg-[#10141c] p-4 rounded-lg border border-gray-800">
                    <p className="text-xs text-gray-400 uppercase">Total Bookings</p>
                    <p className="text-2xl font-bold text-white mt-1">{billingData.length}</p>
                  </div>
                  <div className="bg-[#10141c] p-4 rounded-lg border border-gray-800">
                    <p className="text-xs text-gray-400 uppercase">Total Revenue</p>
                    <p className="text-2xl font-bold text-green-400 mt-1">
                      ${billingData.reduce((sum, row) => sum + parseFloat(row.total_amount || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div className="bg-[#10141c] p-4 rounded-lg border border-gray-800">
                    <p className="text-xs text-gray-400 uppercase">Paid Amount</p>
                    <p className="text-2xl font-bold text-blue-400 mt-1">
                      ${billingData.reduce((sum, row) => sum + parseFloat(row.paid_amount || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div className="bg-[#10141c] p-4 rounded-lg border border-gray-800">
                    <p className="text-xs text-gray-400 uppercase">Outstanding</p>
                    <p className="text-2xl font-bold text-red-400 mt-1">
                      ${billingData.reduce((sum, row) => sum + parseFloat(row.outstanding_balance || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>

                {/* Detailed Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs text-gray-400 uppercase bg-gray-800">
                      <tr>
                        <th className="px-6 py-3">Guest</th>
                        <th className="px-6 py-3">Booking Ref</th>
                        <th className="px-6 py-3">Branch</th>
                        <th className="px-6 py-3">Room</th>
                        <th className="px-6 py-3">Check-in</th>
                        <th className="px-6 py-3">Check-out</th>
                        <th className="px-6 py-3 text-right">Room Charges</th>
                        <th className="px-6 py-3 text-right">Service Charges</th>
                        <th className="px-6 py-3 text-right">Total</th>
                        <th className="px-6 py-3 text-right">Paid</th>
                        <th className="px-6 py-3 text-right">Outstanding</th>
                        <th className="px-6 py-3">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {billingData.map((row: any, idx: number) => (
                        <tr key={idx} className="border-b border-gray-800 hover:bg-gray-800/50">
                          <td className="px-6 py-4 text-white">{row.guest_name || '-'}</td>
                          <td className="px-6 py-4 text-gray-300 font-mono text-xs">{row.booking_reference || '-'}</td>
                          <td className="px-6 py-4 text-gray-300">{row.branch_name || '-'}</td>
                          <td className="px-6 py-4 text-gray-300">{row.room_number || '-'}</td>
                          <td className="px-6 py-4 text-gray-300">{new Date(row.check_in_date).toLocaleDateString()}</td>
                          <td className="px-6 py-4 text-gray-300">{new Date(row.check_out_date).toLocaleDateString()}</td>
                          <td className="px-6 py-4 text-white text-right">${parseFloat(row.room_charges || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                          <td className="px-6 py-4 text-white text-right">${parseFloat(row.service_charges || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                          <td className="px-6 py-4 text-white font-semibold text-right">${parseFloat(row.total_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                          <td className="px-6 py-4 text-blue-400 text-right">${parseFloat(row.paid_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                          <td className="px-6 py-4 text-red-400 font-semibold text-right">${parseFloat(row.outstanding_balance || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-1 rounded text-xs font-semibold ${
                              row.payment_status === 'Paid' ? 'bg-green-500/20 text-green-400' :
                              'bg-red-500/20 text-red-400'
                            }`}>
                              {row.payment_status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-gray-800/50">
                      <tr className="font-bold">
                        <td colSpan={6} className="px-6 py-4 text-right text-white">TOTALS:</td>
                        <td className="px-6 py-4 text-white text-right">
                          ${billingData.reduce((sum, row) => sum + parseFloat(row.room_charges || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="px-6 py-4 text-white text-right">
                          ${billingData.reduce((sum, row) => sum + parseFloat(row.service_charges || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="px-6 py-4 text-green-400 text-right">
                          ${billingData.reduce((sum, row) => sum + parseFloat(row.total_amount || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="px-6 py-4 text-blue-400 text-right">
                          ${billingData.reduce((sum, row) => sum + parseFloat(row.paid_amount || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="px-6 py-4 text-red-400 text-right">
                          ${billingData.reduce((sum, row) => sum + parseFloat(row.outstanding_balance || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Service Usage Report */}
      {selectedReport === 'service-usage' && (
        <Card className="mt-6">
          <CardHeader>
            <h2 className="text-xl font-bold text-white">Service Usage Report (Completed Requests)</h2>
            <p className="text-sm text-gray-400 mt-1">
              {new Date(startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} - {new Date(endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </p>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-gray-400 text-center py-8">Loading service usage data...</div>
            ) : serviceUsageData.length === 0 ? (
              <div className="text-gray-400 text-center py-8">No service usage data for this period</div>
            ) : (
              <>
                {/* Summary Cards */}
                <div className="grid grid-cols-4 gap-4 mb-6">
                  <div className="bg-[#10141c] p-4 rounded-lg border border-gray-800">
                    <p className="text-xs text-gray-400 uppercase">Total Requests</p>
                    <p className="text-2xl font-bold text-white mt-1">{serviceUsageData.length}</p>
                  </div>
                  <div className="bg-[#10141c] p-4 rounded-lg border border-gray-800">
                    <p className="text-xs text-gray-400 uppercase">Total Revenue</p>
                    <p className="text-2xl font-bold text-green-400 mt-1">
                      ${serviceUsageData.reduce((sum, row) => sum + parseFloat(row.total_price || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div className="bg-[#10141c] p-4 rounded-lg border border-gray-800">
                    <p className="text-xs text-gray-400 uppercase">Unique Guests</p>
                    <p className="text-2xl font-bold text-white mt-1">
                      {new Set(serviceUsageData.map((row: any) => row.guest_name)).size}
                    </p>
                  </div>
                  <div className="bg-[#10141c] p-4 rounded-lg border border-gray-800">
                    <p className="text-xs text-gray-400 uppercase">Avg per Request</p>
                    <p className="text-2xl font-bold text-amber-400 mt-1">
                      ${(serviceUsageData.reduce((sum, row) => sum + parseFloat(row.total_price || 0), 0) / serviceUsageData.length).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>

                {/* Detailed Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs text-gray-400 uppercase bg-gray-800">
                      <tr>
                        <th className="px-6 py-3">Date</th>
                        <th className="px-6 py-3">Reference</th>
                        <th className="px-6 py-3">Guest</th>
                        <th className="px-6 py-3">Service</th>
                        <th className="px-6 py-3">Category</th>
                        <th className="px-6 py-3">Branch</th>
                        <th className="px-6 py-3">Room</th>
                        <th className="px-6 py-3">Staff</th>
                        <th className="px-6 py-3">Priority</th>
                        <th className="px-6 py-3 text-right">Price</th>
                      </tr>
                    </thead>
                    <tbody>
                      {serviceUsageData.map((row: any, idx: number) => (
                        <tr key={idx} className="border-b border-gray-800 hover:bg-gray-800/50">
                          <td className="px-6 py-4 text-gray-300">
                            {row.usage_date ? new Date(row.usage_date).toLocaleDateString() : '-'}
                          </td>
                          <td className="px-6 py-4 text-gray-400 font-mono text-xs">
                            {row.request_reference || '-'}
                          </td>
                          <td className="px-6 py-4 text-white">{row.guest_name || '-'}</td>
                          <td className="px-6 py-4 text-white">{row.service_name || row.request_type || '-'}</td>
                          <td className="px-6 py-4 text-gray-300">{row.category || 'General'}</td>
                          <td className="px-6 py-4 text-gray-300">{row.branch_name || '-'}</td>
                          <td className="px-6 py-4 text-gray-300">{row.room_number || '-'}</td>
                          <td className="px-6 py-4 text-gray-300">{row.staff_name || 'Unassigned'}</td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-1 rounded text-xs font-semibold ${
                              row.priority === 'Urgent' ? 'bg-red-500/20 text-red-400' :
                              row.priority === 'High' ? 'bg-orange-500/20 text-orange-400' :
                              row.priority === 'Normal' ? 'bg-blue-500/20 text-blue-400' :
                              'bg-gray-500/20 text-gray-400'
                            }`}>
                              {row.priority || 'Normal'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-green-400 font-semibold text-right">
                            ${parseFloat(row.total_price || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-gray-800/50">
                      <tr>
                        <td colSpan={9} className="px-6 py-4 text-right font-bold text-white">
                          TOTAL:
                        </td>
                        <td className="px-6 py-4 text-green-400 font-bold text-right">
                          ${serviceUsageData.reduce((sum, row) => sum + parseFloat(row.total_price || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Top Services Report */}
      {selectedReport === 'top-services' && (
        <Card className="mt-6">
          <CardHeader>
            <h2 className="text-xl font-bold text-white">Top Services Report</h2>
            <p className="text-sm text-gray-400 mt-1">
              Most popular services by usage ({new Date(startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {new Date(endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})
            </p>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-gray-400 text-center py-8">Loading top services...</div>
            ) : topServicesData.length === 0 ? (
              <div className="text-gray-400 text-center py-8">No service data for this period</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-gray-400 uppercase bg-gray-800">
                    <tr>
                      <th className="px-6 py-3">Rank</th>
                      <th className="px-6 py-3">Service</th>
                      <th className="px-6 py-3">Category</th>
                      <th className="px-6 py-3">Usage Count</th>
                      <th className="px-6 py-3">Total Quantity</th>
                      <th className="px-6 py-3">Total Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topServicesData.map((row: any, idx: number) => (
                      <tr key={idx} className="border-b border-gray-800 hover:bg-gray-800/50">
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 rounded font-bold ${
                            idx === 0 ? 'bg-yellow-500/20 text-yellow-400' :
                            idx === 1 ? 'bg-gray-400/20 text-gray-300' :
                            idx === 2 ? 'bg-orange-500/20 text-orange-400' :
                            'bg-gray-800 text-gray-400'
                          }`}>
                            #{idx + 1}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-white font-semibold">{row.service_name}</td>
                        <td className="px-6 py-4 text-gray-300">{row.category}</td>
                        <td className="px-6 py-4 text-center text-white">{row.usage_count || 0}</td>
                        <td className="px-6 py-4 text-center text-gray-300">{row.total_quantity || 0}</td>
                        <td className="px-6 py-4 text-right text-white font-semibold">
                          ${parseFloat(row.total_revenue || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
      
    </div>
  )
}