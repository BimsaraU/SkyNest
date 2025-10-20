import jsPDF from 'jspdf';
import { SkyNestPDFGenerator } from './pdfGenerator';

interface BillData {
  bookingReference: string;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  roomNumber: string;
  roomType: string;
  checkInDate: string;
  checkOutDate: string;
  nights: number;
  basePrice: number;
  taxAmount: number;
  serviceCharge: number;
  totalAmount: number;
  paymentStatus: string;
  paymentMethod?: string;
  branchName: string;
  branchLocation: string;
  branchPhone: string;
  branchEmail: string;
  bookingDate: string;
}

export function generateBill(data: BillData): jsPDF {
  // Use the new SkyNestPDFGenerator for consistent branding
  const generator = new SkyNestPDFGenerator();
  
  // Calculate subtotal (before tax and service charge)
  const roomCharges = data.nights * data.basePrice;
  const subtotal = roomCharges;
  
  // Prepare items for the bill - All prices in USD
  const items = [
    {
      description: 'Room Charges',
      quantity: data.nights,
      rate: data.basePrice,
      amount: `$${roomCharges.toLocaleString()}`
    }
  ];
  
  // Generate the bill using the standardized template - All prices in USD
  const doc = generator.generateBill({
    billNumber: data.bookingReference,
    guestName: data.guestName,
    guestEmail: data.guestEmail,
    guestPhone: data.guestPhone,
    checkIn: new Date(data.checkInDate).toLocaleDateString(),
    checkOut: new Date(data.checkOutDate).toLocaleDateString(),
    roomNumber: data.roomNumber,
    roomType: data.roomType,
    items: items,
    subtotal: `$${subtotal.toLocaleString()}`,
    tax: `$${(data.serviceCharge + data.taxAmount).toLocaleString()}`,
    total: `$${data.totalAmount.toLocaleString()}`,
    paidAmount: data.paymentStatus === 'Completed' ? `$${data.totalAmount.toLocaleString()}` : undefined,
    balance: data.paymentStatus === 'Completed' ? '$0' : `$${data.totalAmount.toLocaleString()}`
  });

  return doc;
}

export function generateBillBlob(data: BillData): Blob {
  const doc = generateBill(data);
  return doc.output('blob');
}

export function downloadBill(data: BillData, filename?: string): void {
  const doc = generateBill(data);
  doc.save(filename || `Sky-Nest-Bill-${data.bookingReference}.pdf`);
}
