import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { verifyAdmin } from '@/lib/adminAuth';

// GET all branches (admin version - includes inactive)
export async function GET(request: NextRequest) {
  try {
    const admin = await verifyAdmin(request);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await pool.query(
      `SELECT * FROM branches ORDER BY name ASC`
    );

    return NextResponse.json({ branches: result.rows });
  } catch (error: any) {
    console.error('Error fetching branches:', error);
    return NextResponse.json(
      { error: 'Failed to fetch branches', details: error.message },
      { status: 500 }
    );
  }
}

// POST - Create new branch
export async function POST(request: NextRequest) {
  try {
    const admin = await verifyAdmin(request);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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

    // Check for duplicate email if provided
    if (email) {
      const existingEmail = await pool.query(
        'SELECT id FROM branches WHERE email = $1',
        [email]
      );

      if (existingEmail.rows.length > 0) {
        return NextResponse.json(
          { error: 'A branch with this email already exists' },
          { status: 400 }
        );
      }
    }

    // Insert new branch
    const result = await pool.query(
      `INSERT INTO branches (name, location, address, phone, email, description, manager_name, is_active, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       RETURNING *`,
      [name, location, address, phone, email, description, manager_name, is_active !== false]
    );

    console.log('Branch created successfully:', result.rows[0]);

    return NextResponse.json({ 
      branch: result.rows[0],
      message: 'Branch created successfully'
    }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating branch:', error);
    return NextResponse.json(
      { error: 'Failed to create branch', details: error.message },
      { status: 500 }
    );
  }
}
