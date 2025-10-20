// app/api/admin/staff/next-id/route.ts
import { NextResponse, NextRequest } from 'next/server';
import pool from '@/lib/db';
import { verifyAdmin } from '@/lib/adminAuth';

// GET - Get the next available staff ID
export async function GET(request: NextRequest) {
  try {
    const admin = await verifyAdmin(request);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the highest numeric ID from staff table
    const query = `
      SELECT COALESCE(MAX(id), 0) + 1 as next_id
      FROM staff
    `;

    const result = await pool.query(query);
    const nextId = result.rows[0].next_id;

    // Generate employee ID based on next database ID
    const employeeId = `STAFF-${String(nextId).padStart(4, '0')}`;

    return NextResponse.json({
      success: true,
      next_id: nextId,
      employee_id: employeeId
    });
  } catch (error) {
    console.error('[NEXT STAFF ID API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to get next staff ID', details: (error as Error).message },
      { status: 500 }
    );
  }
}
