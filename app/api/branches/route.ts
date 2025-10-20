import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET() {
  try {
    const result = await pool.query(
      `SELECT 
        b.id,
        b.name,
        b.location,
        b.phone,
        b.email,
        b.description,
        (SELECT image_url FROM branch_images WHERE branch_id = b.id ORDER BY display_order ASC LIMIT 1) as image
       FROM branches b
       WHERE b.is_active = true
       ORDER BY b.name`
    );

    return NextResponse.json({ branches: result.rows });
  } catch (error) {
    console.error('Get branches error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch branches' },
      { status: 500 }
    );
  }
}
