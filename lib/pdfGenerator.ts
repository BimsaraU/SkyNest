import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

/**
 * Enhanced PDF Generator for Sky Nest Hotel
 * Supports custom styling, logos, and different document types
 */

export interface PDFOptions {
  type: 'report' | 'bill' | 'invoice';
  title: string;
  subtitle?: string;
  data?: any;
  stats?: any;
  tableData?: {
    headers: string[];
    rows: any[][];
  };
}

export class SkyNestPDFGenerator {
  private doc: jsPDF;
  private pageWidth: number;
  private pageHeight: number;
  private margin = 20;
  private currentY = 20;

  // Colors
  private colors = {
    primary: [251, 191, 36] as [number, number, number], // Amber
    secondary: [31, 41, 55] as [number, number, number], // Dark gray
    text: [0, 0, 0] as [number, number, number],
    lightText: [100, 100, 100] as [number, number, number],
    white: [255, 255, 255] as [number, number, number],
  };

  constructor() {
    this.doc = new jsPDF();
    this.pageWidth = this.doc.internal.pageSize.getWidth();
    this.pageHeight = this.doc.internal.pageSize.getHeight();
  }

  /**
   * Add company logo to PDF (using SND.png for everything)
   */
  private addLogo() {
    try {
      // Use SND.png logo image for all document types
      const logoPath = '/SND.png';
      
      // Calculate centered position for logo
      const logoWidth = 60;
      const logoHeight = 25;
      const xPos = (this.pageWidth - logoWidth) / 2;
      
      // Add logo image
      this.doc.addImage(logoPath, 'PNG', xPos, this.currentY, logoWidth, logoHeight);
      
      this.currentY += logoHeight + 5;
    } catch (error) {
      console.error('Error adding logo:', error);
      // Fallback to text if logo fails to load
      this.doc.setFont('helvetica', 'bold');
      this.doc.setFontSize(20);
      this.doc.setTextColor(...this.colors.primary);
      this.doc.text('SKY NEST HOTELS', this.pageWidth / 2, this.currentY, { align: 'center' });
      this.currentY += 10;
    }
  }

  /**
   * Add header with company info
   */
  private addHeader(type: 'report' | 'bill' | 'invoice', title: string, subtitle?: string) {
    // Company name
    this.doc.setFont('times', 'bold');
    this.doc.setFontSize(24);
    this.doc.setTextColor(...this.colors.secondary);
    this.doc.text('Sky Nest Hotels', this.pageWidth / 2, this.currentY, { align: 'center' });
    
    this.currentY += 8;
    
    // Company tagline
    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(10);
    this.doc.setTextColor(...this.colors.lightText);
    this.doc.text('Luxury Accommodation Across Sri Lanka', this.pageWidth / 2, this.currentY, { align: 'center' });
    
    this.currentY += 15;
    
    // Document title
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(18);
    this.doc.setTextColor(...this.colors.primary);
    this.doc.text(title, this.pageWidth / 2, this.currentY, { align: 'center' });
    
    this.currentY += 8;
    
    // Subtitle if provided
    if (subtitle) {
      this.doc.setFont('helvetica', 'normal');
      this.doc.setFontSize(12);
      this.doc.setTextColor(...this.colors.lightText);
      this.doc.text(subtitle, this.pageWidth / 2, this.currentY, { align: 'center' });
      this.currentY += 8;
    }
    
    // Divider line
    this.doc.setDrawColor(...this.colors.primary);
    this.doc.setLineWidth(0.5);
    this.doc.line(this.margin, this.currentY, this.pageWidth - this.margin, this.currentY);
    
    this.currentY += 10;
  }

  /**
   * Add metadata section
   */
  private addMetadata(metadata: { [key: string]: string }) {
    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(10);
    this.doc.setTextColor(...this.colors.text);
    
    Object.entries(metadata).forEach(([key, value]) => {
      this.doc.setFont('helvetica', 'bold');
      this.doc.text(`${key}:`, this.margin, this.currentY);
      
      this.doc.setFont('helvetica', 'normal');
      this.doc.setTextColor(...this.colors.lightText);
      this.doc.text(value, this.margin + 40, this.currentY);
      
      this.doc.setTextColor(...this.colors.text);
      this.currentY += 6;
    });
    
    this.currentY += 5;
  }

  /**
   * Add statistics cards
   */
  private addStatsCards(stats: { label: string; value: string }[]) {
    const cardWidth = (this.pageWidth - this.margin * 2 - 10) / 2;
    const cardHeight = 20;
    let xPos = this.margin;
    let yPos = this.currentY;
    
    stats.forEach((stat, index) => {
      if (index > 0 && index % 2 === 0) {
        yPos += cardHeight + 5;
        xPos = this.margin;
      }
      
      // Card background
      this.doc.setFillColor(248, 250, 252); // Light gray
      this.doc.roundedRect(xPos, yPos, cardWidth, cardHeight, 2, 2, 'F');
      
      // Card border
      this.doc.setDrawColor(...this.colors.primary);
      this.doc.setLineWidth(0.3);
      this.doc.roundedRect(xPos, yPos, cardWidth, cardHeight, 2, 2, 'S');
      
      // Label
      this.doc.setFont('helvetica', 'normal');
      this.doc.setFontSize(9);
      this.doc.setTextColor(...this.colors.lightText);
      this.doc.text(stat.label, xPos + 5, yPos + 8);
      
      // Value
      this.doc.setFont('helvetica', 'bold');
      this.doc.setFontSize(14);
      this.doc.setTextColor(...this.colors.secondary);
      this.doc.text(stat.value, xPos + 5, yPos + 16);
      
      xPos += cardWidth + 10;
    });
    
    this.currentY = yPos + cardHeight + 10;
  }

  /**
   * Add a styled table
   */
  private addTable(headers: string[], rows: any[][], title?: string) {
    if (title) {
      this.doc.setFont('helvetica', 'bold');
      this.doc.setFontSize(14);
      this.doc.setTextColor(...this.colors.secondary);
      this.doc.text(title, this.margin, this.currentY);
      this.currentY += 8;
    }
    
    autoTable(this.doc, {
      startY: this.currentY,
      head: [headers],
      body: rows,
      theme: 'grid',
      headStyles: {
        fillColor: this.colors.primary,
        textColor: this.colors.secondary,
        fontStyle: 'bold',
        fontSize: 10,
        halign: 'left'
      },
      styles: {
        fontSize: 9,
        cellPadding: 5,
      },
      alternateRowStyles: {
        fillColor: [249, 250, 251]
      },
      margin: { left: this.margin, right: this.margin },
    });
    
    this.currentY = (this.doc as any).lastAutoTable.finalY + 10;
  }

  /**
   * Add footer to all pages
   */
  private addFooter() {
    const pageCount = (this.doc as any).internal.getNumberOfPages();
    
    for (let i = 1; i <= pageCount; i++) {
      this.doc.setPage(i);
      
      // Footer line
      this.doc.setDrawColor(...this.colors.lightText);
      this.doc.setLineWidth(0.3);
      this.doc.line(this.margin, this.pageHeight - 20, this.pageWidth - this.margin, this.pageHeight - 20);
      
      // Footer text
      this.doc.setFont('helvetica', 'normal');
      this.doc.setFontSize(8);
      this.doc.setTextColor(...this.colors.lightText);
      
      this.doc.text(
        'Sky Nest Hotels | www.skynest.lk | info@skynest.lk | +94 11 234 5678',
        this.pageWidth / 2,
        this.pageHeight - 12,
        { align: 'center' }
      );
      
      // Page number
      this.doc.text(
        `Page ${i} of ${pageCount}`,
        this.pageWidth - this.margin,
        this.pageHeight - 12,
        { align: 'right' }
      );
      
      // Generated timestamp
      this.doc.text(
        `Generated: ${new Date().toLocaleString()}`,
        this.margin,
        this.pageHeight - 12
      );
    }
  }

  /**
   * Generate Report PDF
   */
  generateReport(options: {
    title: string;
    period: string;
    branch: string;
    stats: { label: string; value: string }[];
    tableData: { headers: string[]; rows: any[][] };
  }) {
    this.currentY = this.margin;
    
    // Add logo
    this.addLogo();
    
    // Add header
    this.addHeader('report', options.title, 'Administrative Revenue & Analytics Report');
    
    // Add metadata
    this.addMetadata({
      'Report Date': new Date().toLocaleDateString(),
      'Period': options.period,
      'Branch': options.branch === 'all' ? 'All Branches' : options.branch,
      'Report ID': `RPT-${Date.now().toString().slice(-8)}`
    });
    
    // Add stats cards
    this.addStatsCards(options.stats);
    
    // Add data table
    this.addTable(options.tableData.headers, options.tableData.rows, 'Revenue Breakdown');
    
    // Add footer
    this.addFooter();
    
    return this.doc;
  }

  /**
   * Generate Bill/Invoice PDF
   */
  generateBill(options: {
    billNumber: string;
    guestName: string;
    guestEmail?: string;
    guestPhone?: string;
    checkIn: string;
    checkOut: string;
    roomNumber?: string;
    roomType?: string;
    items: { description: string; quantity?: number; rate?: number; amount: string }[];
    subtotal?: string;
    tax?: string;
    total: string;
    paidAmount?: string;
    balance?: string;
  }) {
    this.currentY = this.margin;
    
    // Add logo
    this.addLogo();
    
    // Add header with INVOICE title
    this.addHeader('invoice', 'INVOICE', 'Sky Nest Hotels - Premium Accommodation');
    
    // Two column layout for invoice details
    const leftColX = this.margin;
    const rightColX = this.pageWidth / 2 + 10;
    
    // Left column - Guest details
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(11);
    this.doc.setTextColor(...this.colors.secondary);
    this.doc.text('BILL TO:', leftColX, this.currentY);
    
    this.currentY += 7;
    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(10);
    this.doc.setTextColor(...this.colors.text);
    this.doc.text(options.guestName, leftColX, this.currentY);
    
    if (options.guestEmail) {
      this.currentY += 5;
      this.doc.setTextColor(...this.colors.lightText);
      this.doc.text(options.guestEmail, leftColX, this.currentY);
    }
    
    if (options.guestPhone) {
      this.currentY += 5;
      this.doc.text(options.guestPhone, leftColX, this.currentY);
    }
    
    // Right column - Invoice details
    const rightColY = this.currentY - (options.guestEmail ? 17 : 12);
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(10);
    this.doc.setTextColor(...this.colors.secondary);
    this.doc.text('Invoice #:', rightColX, rightColY);
    this.doc.setFont('helvetica', 'normal');
    this.doc.setTextColor(...this.colors.text);
    this.doc.text(options.billNumber, rightColX + 25, rightColY);
    
    this.doc.setFont('helvetica', 'bold');
    this.doc.setTextColor(...this.colors.secondary);
    this.doc.text('Date:', rightColX, rightColY + 5);
    this.doc.setFont('helvetica', 'normal');
    this.doc.setTextColor(...this.colors.text);
    this.doc.text(new Date().toLocaleDateString(), rightColX + 25, rightColY + 5);
    
    if (options.roomNumber) {
      this.doc.setFont('helvetica', 'bold');
      this.doc.setTextColor(...this.colors.secondary);
      this.doc.text('Room:', rightColX, rightColY + 10);
      this.doc.setFont('helvetica', 'normal');
      this.doc.setTextColor(...this.colors.text);
      this.doc.text(`${options.roomNumber} - ${options.roomType || ''}`, rightColX + 25, rightColY + 10);
    }
    
    this.doc.setFont('helvetica', 'bold');
    this.doc.setTextColor(...this.colors.secondary);
    this.doc.text('Check-in:', rightColX, rightColY + 15);
    this.doc.setFont('helvetica', 'normal');
    this.doc.setTextColor(...this.colors.text);
    this.doc.text(options.checkIn, rightColX + 25, rightColY + 15);
    
    this.doc.setFont('helvetica', 'bold');
    this.doc.setTextColor(...this.colors.secondary);
    this.doc.text('Check-out:', rightColX, rightColY + 20);
    this.doc.setFont('helvetica', 'normal');
    this.doc.setTextColor(...this.colors.text);
    this.doc.text(options.checkOut, rightColX + 25, rightColY + 20);
    
    this.currentY += 25;
    
    // Add items table with better columns
    const tableHeaders = options.items[0]?.quantity !== undefined 
      ? ['Description', 'Qty', 'Rate', 'Amount']
      : ['Description', 'Amount'];
      
    const tableRows = options.items.map(item => {
      if (item.quantity !== undefined && item.rate !== undefined) {
        return [item.description, item.quantity.toString(), `$${item.rate}`, item.amount];
      }
      return [item.description, item.amount];
    });
    
    this.addTable(tableHeaders, tableRows, 'CHARGES');
    
    // Add totals section
    const totalsX = this.pageWidth - this.margin - 60;
    this.currentY += 5;
    
    if (options.subtotal) {
      this.doc.setFont('helvetica', 'normal');
      this.doc.setFontSize(10);
      this.doc.setTextColor(...this.colors.text);
      this.doc.text('Subtotal:', totalsX, this.currentY);
      this.doc.text(options.subtotal, this.pageWidth - this.margin, this.currentY, { align: 'right' });
      this.currentY += 6;
    }
    
    if (options.tax) {
      this.doc.text('Tax:', totalsX, this.currentY);
      this.doc.text(options.tax, this.pageWidth - this.margin, this.currentY, { align: 'right' });
      this.currentY += 6;
    }
    
    // Draw line before total
    this.doc.setDrawColor(...this.colors.lightText);
    this.doc.setLineWidth(0.5);
    this.doc.line(totalsX, this.currentY, this.pageWidth - this.margin, this.currentY);
    this.currentY += 8;
    
    // Total amount - with proper spacing between label and value
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(12);
    this.doc.setTextColor(...this.colors.secondary);
    this.doc.text('TOTAL:', totalsX, this.currentY);
    this.doc.setFontSize(14);
    this.doc.setTextColor(...this.colors.primary);
    // Increased gap by using totalsX + 45 instead of just aligning right from the label
    this.doc.text(options.total, this.pageWidth - this.margin, this.currentY, { align: 'right' });
    
    this.currentY += 10;
    
    if (options.paidAmount) {
      this.doc.setFont('helvetica', 'normal');
      this.doc.setFontSize(10);
      this.doc.setTextColor(...this.colors.text);
      this.doc.text('Paid:', totalsX, this.currentY);
      this.doc.text(options.paidAmount, this.pageWidth - this.margin, this.currentY, { align: 'right' });
      this.currentY += 7;
    }
    
    if (options.balance) {
      this.doc.setFont('helvetica', 'bold');
      this.doc.setFontSize(11);
      const balanceAmount = parseFloat(options.balance.replace(/[^0-9.-]/g, ''));
      this.doc.setTextColor(balanceAmount > 0 ? 220 : 34, balanceAmount > 0 ? 38 : 197, balanceAmount > 0 ? 38 : 94);
      this.doc.text('Balance:', totalsX, this.currentY);
      this.doc.text(options.balance, this.pageWidth - this.margin, this.currentY, { align: 'right' });
      this.currentY += 12;
    }
    
    // Add payment terms
    this.currentY += 10;
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(10);
    this.doc.setTextColor(...this.colors.secondary);
    this.doc.text('PAYMENT TERMS', this.margin, this.currentY);
    this.currentY += 6;
    
    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(9);
    this.doc.setTextColor(...this.colors.lightText);
    this.doc.text('• Payment can be made via cash, credit card, or bank transfer', this.margin, this.currentY);
    this.currentY += 5;
    this.doc.text('• Check-out time is 12:00 PM. Late check-out charges may apply', this.margin, this.currentY);
    this.currentY += 5;
    this.doc.text('• All prices are in US Dollars (USD)', this.margin, this.currentY);
    
    this.currentY += 15;
    
    // Thank you note
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(11);
    this.doc.setTextColor(...this.colors.primary);
    this.doc.text('Thank you for choosing Sky Nest Hotels!', this.pageWidth / 2, this.currentY, { align: 'center' });
    
    // Add footer
    this.addFooter();
    
    return this.doc;
  }

  /**
   * Save the PDF
   */
  save(filename: string) {
    this.doc.save(filename);
  }

  /**
   * Get PDF as blob for email
   */
  getBlob(): Blob {
    return this.doc.output('blob');
  }

  /**
   * Get PDF as base64 string
   */
  getBase64(): string {
    return this.doc.output('dataurlstring');
  }
}
