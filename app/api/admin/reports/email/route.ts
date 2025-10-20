import { NextResponse, NextRequest } from 'next/server';
import { sendEmail } from '@/lib/email';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { recipientEmail, reportData, pdfAttachment, fileName } = body;

    if (!recipientEmail || !reportData) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get branch name
    const branchName = reportData.branch === 'all' ? 'All Branches' : 
                       reportData.branches?.find((b: any) => b.id === parseInt(reportData.branch))?.name || 
                       'Selected Branch';

    // Format dates
    const startDate = new Date(reportData.startDate).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
    const endDate = new Date(reportData.endDate).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });

    // Create email HTML content with Lora font for heading
    const emailHTML = `
      <!DOCTYPE html>
      <html>
        <head>
          <link rel="preconnect" href="https://fonts.googleapis.com">
          <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
          <link href="https://fonts.googleapis.com/css2?family=Lora:wght@400;700&display=swap" rel="stylesheet">
          <style>
            body { font-family: 'Arial', sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background: #f5f5f5; }
            .container { max-width: 650px; margin: 0 auto; background: white; }
            .header { background: #ffffff; padding: 40px 30px 30px; text-align: center; border-bottom: 2px solid #e5e5e5; }
            .header h1 { font-family: 'Lora', serif; font-size: 32px; font-weight: 700; color: #1a1a1a; margin: 0 0 8px 0; letter-spacing: -0.5px; }
            .header p { font-size: 15px; color: #666; margin: 0; }
            .content { padding: 35px 30px; }
            .greeting { font-size: 15px; color: #333; margin-bottom: 20px; }
            .section-title { font-family: 'Lora', serif; font-size: 20px; font-weight: 600; color: #1a1a1a; margin: 30px 0 15px 0; border-bottom: 1px solid #e5e5e5; padding-bottom: 8px; }
            .metrics { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin: 20px 0; }
            .metric-card { background: #f9f9f9; padding: 18px; border-radius: 6px; border: 1px solid #e5e5e5; }
            .metric-value { font-size: 26px; font-weight: 700; color: #1a1a1a; margin-bottom: 4px; }
            .metric-label { color: #666; font-size: 13px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.5px; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px; }
            th { background: #f5f5f5; color: #333; padding: 12px; text-align: left; font-weight: 600; border-bottom: 2px solid #e0e0e0; }
            td { padding: 12px; border-bottom: 1px solid #f0f0f0; }
            tr:last-child td { border-bottom: none; }
            .report-details { background: #f9f9f9; padding: 20px; border-radius: 6px; margin-top: 25px; font-size: 13px; color: #555; border: 1px solid #e5e5e5; }
            .report-details strong { color: #333; display: block; margin-bottom: 8px; font-size: 14px; }
            .report-details div { margin: 5px 0; }
            .attachment-notice { background: #e8f5e9; border-left: 4px solid #4caf50; padding: 15px; margin: 25px 0; border-radius: 4px; }
            .attachment-notice p { margin: 0; color: #2e7d32; font-size: 14px; }
            .attachment-notice strong { color: #1b5e20; }
            .footer { text-align: center; padding: 25px 30px; color: #888; font-size: 12px; background: #fafafa; border-top: 1px solid #e5e5e5; }
            .footer p { margin: 5px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Sky Nest Hotel</h1>
              <p>Revenue & Performance Report</p>
            </div>
            
            <div class="content">
              <div class="greeting">
                <p>Dear Valued Administrator,</p>
                <p>Please find attached your requested revenue and performance report.</p>
              </div>
              
              <div class="attachment-notice">
                <p><strong>📎 PDF Attachment Included</strong></p>
                <p>A detailed PDF report has been attached to this email for your records.</p>
              </div>
              
              <h2 class="section-title">Executive Summary</h2>
              <div class="metrics">
                <div class="metric-card">
                  <div class="metric-value">$${reportData.stats.totalRevenue.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
                  <div class="metric-label">Total Revenue</div>
                </div>
                <div class="metric-card">
                  <div class="metric-value">${reportData.stats.totalBookings}</div>
                  <div class="metric-label">Total Bookings</div>
                </div>
                <div class="metric-card">
                  <div class="metric-value">${reportData.stats.occupancyRate}%</div>
                  <div class="metric-label">Occupancy Rate</div>
                </div>
                <div class="metric-card">
                  <div class="metric-value">${reportData.stats.avgRating.toFixed(1)} / 5.0</div>
                  <div class="metric-label">Average Rating</div>
                </div>
              </div>
              
              <h2 class="section-title">Revenue Breakdown</h2>
              <table>
                <thead>
                  <tr>
                    <th>Period</th>
                    <th style="text-align: right;">Revenue</th>
                    <th style="text-align: center;">Bookings</th>
                  </tr>
                </thead>
                <tbody>
                  ${reportData.revenueData.slice(0, 10).map((item: any) => `
                    <tr>
                      <td>${item.name}</td>
                      <td style="text-align: right; font-weight: 600; color: #1a1a1a;">$${item.revenue.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                      <td style="text-align: center;">${item.bookings}</td>
                    </tr>
                  `).join('')}
                  ${reportData.revenueData.length > 10 ? `
                    <tr>
                      <td colspan="3" style="text-align: center; color: #888; font-style: italic; padding-top: 15px;">
                        ${reportData.revenueData.length - 10} more periods in attached PDF
                      </td>
                    </tr>
                  ` : ''}
                </tbody>
              </table>
              
              <div class="report-details">
                <strong>Report Information</strong>
                <div><strong>Generated:</strong> ${new Date().toLocaleString('en-US', { dateStyle: 'long', timeStyle: 'short' })}</div>
                <div><strong>Report Period:</strong> ${startDate} - ${endDate}</div>
                <div><strong>Grouping:</strong> ${reportData.period === 'day' ? 'Daily' : reportData.period === 'week' ? 'Weekly' : reportData.period === 'month' ? 'Monthly' : 'Yearly'}</div>
                <div><strong>Branch:</strong> ${branchName}</div>
              </div>
            </div>
            
            <div class="footer">
              <p><strong>Sky Nest Hotel Management System</strong></p>
              <p>This is an automated email. Please do not reply.</p>
              <p>© ${new Date().getFullYear()} Sky Nest Hotel. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    // Prepare attachment if provided
    const attachments = pdfAttachment ? [{
      filename: fileName || `SkyNest-Report-${new Date().toISOString().split('T')[0]}.pdf`,
      content: pdfAttachment,
      encoding: 'base64',
      contentType: 'application/pdf'
    }] : undefined;

    // Send email with attachment
    await sendEmail(
      recipientEmail,
      'Sky Nest Hotel - Revenue & Performance Report',
      emailHTML,
      attachments
    );

    return NextResponse.json({
      success: true,
      message: 'Report sent successfully with PDF attachment'
    });

  } catch (error) {
    console.error('[EMAIL REPORT] Error:', error);
    return NextResponse.json(
      { error: 'Failed to send report', details: (error as Error).message },
      { status: 500 }
    );
  }
}
