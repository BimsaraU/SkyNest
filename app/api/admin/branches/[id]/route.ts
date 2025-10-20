import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { verifyAdmin } from '@/lib/adminAuth';

// GET single branch
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await verifyAdmin(request);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const params = await context.params;
    const branchId = parseInt(params.id);

    if (isNaN(branchId)) {
      return NextResponse.json({ error: 'Invalid branch ID' }, { status: 400 });
    }

    const result = await pool.query(
      'SELECT * FROM branches WHERE id = $1',
      [branchId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Branch not found' }, { status: 404 });
    }

    return NextResponse.json({ branch: result.rows[0] });
  } catch (error: any) {
    console.error('Error fetching branch:', error);
    return NextResponse.json(
      { error: 'Failed to fetch branch', details: error.message },
      { status: 500 }
    );
  }
}

// PUT - Update branch
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await verifyAdmin(request);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const params = await context.params;
    const branchId = parseInt(params.id);

    if (isNaN(branchId)) {
      return NextResponse.json({ error: 'Invalid branch ID' }, { status: 400 });
    }

    const body = await request.json();
    const { name, location, address, phone, email, description, manager_name, is_active } = body;

    // Validation
    if (!name || !location) {
      return NextResponse.json(
        { error: 'Name and location are required' },
        { status: 400 }
      );
    }

    // Check for duplicate email if provided (exclude current branch)
    if (email) {
      const existingEmail = await pool.query(
        'SELECT id FROM branches WHERE email = $1 AND id != $2',
        [email, branchId]
      );

      if (existingEmail.rows.length > 0) {
        return NextResponse.json(
          { error: 'A branch with this email already exists' },
          { status: 400 }
        );
      }
    }

    // Update branch
    const result = await pool.query(
      `UPDATE branches 
       SET name = $1, 
           location = $2, 
           address = $3, 
           phone = $4, 
           email = $5, 
           description = $6, 
           manager_name = $7, 
           is_active = $8,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $9
       RETURNING *`,
      [name, location, address, phone, email, description, manager_name, is_active !== false, branchId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Branch not found' }, { status: 404 });
    }

    console.log('Branch updated successfully:', result.rows[0]);

    return NextResponse.json({ 
      branch: result.rows[0],
      message: 'Branch updated successfully'
    });
  } catch (error: any) {
    console.error('Error updating branch:', error);
    return NextResponse.json(
      { error: 'Failed to update branch', details: error.message },
      { status: 500 }
    );
  }
}

// DELETE - Delete branch
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await verifyAdmin(request);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const params = await context.params;
    const branchId = parseInt(params.id);

    if (isNaN(branchId)) {
      return NextResponse.json({ error: 'Invalid branch ID' }, { status: 400 });
    }

    // Check if branch has rooms
    const roomsCheck = await pool.query(
      'SELECT COUNT(*) as count FROM rooms WHERE branch_id = $1',
      [branchId]
    );

    const roomCount = parseInt(roomsCheck.rows[0].count);

    if (roomCount > 0) {
      return NextResponse.json(
        { error: `Cannot delete branch with ${roomCount} rooms. Please remove or reassign rooms first.` },
        { status: 400 }
      );
    }

    // Check if branch has bookings
    const bookingsCheck = await pool.query(
      'SELECT COUNT(*) as count FROM bookings WHERE branch_id = $1',
      [branchId]
    );

    const bookingCount = parseInt(bookingsCheck.rows[0].count);

    if (bookingCount > 0) {
      return NextResponse.json(
        { error: `Cannot delete branch with ${bookingCount} bookings. This branch has booking history.` },
        { status: 400 }
      );
    }

    // Delete branch
    const result = await pool.query(
      'DELETE FROM branches WHERE id = $1 RETURNING *',
      [branchId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Branch not found' }, { status: 404 });
    }

    console.log('Branch deleted successfully:', branchId);

    return NextResponse.json({ 
      message: 'Branch deleted successfully',
      branch: result.rows[0]
    });
  } catch (error: any) {
    console.error('Error deleting branch:', error);
    return NextResponse.json(
      { error: 'Failed to delete branch', details: error.message },
      { status: 500 }
    );
  }
}
