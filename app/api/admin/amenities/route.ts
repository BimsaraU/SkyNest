import { NextResponse, NextRequest } from 'next/server';
import pool from '@/lib/db';
import { verifyAdmin } from '@/lib/adminAuth';

// GET - List all amenities
export async function GET(request: NextRequest) {
  try {
    const admin = await verifyAdmin(request);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await pool.query(
      'SELECT * FROM amenities ORDER BY name ASC'
    );

    return NextResponse.json({ amenities: result.rows });
  } catch (error) {
    console.error('[ADMIN] Get amenities error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch amenities', details: (error as Error).message },
      { status: 500 }
    );
  }
}

// POST - Create a new amenity
export async function POST(request: NextRequest) {
  try {
    const admin = await verifyAdmin(request);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { name, description, icon_name } = await request.json();

    if (!name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }

    const result = await pool.query(
      `INSERT INTO amenities (name, description, icon_name)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [name, description, icon_name]
    );

    console.log(`[ADMIN] Amenity created: ${name} by admin ${admin.email}`);

    return NextResponse.json({
      message: 'Amenity created successfully',
      amenity: result.rows[0]
    }, { status: 201 });
  } catch (error) {
    console.error('[ADMIN] Create amenity error:', error);
    return NextResponse.json(
      { error: 'Failed to create amenity', details: (error as Error).message },
      { status: 500 }
    );
  }
}
