import { NextResponse, NextRequest } from 'next/server';
import { jwtVerify } from 'jose';
import pool from '@/lib/db';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET);

// GET - Get available services
export async function GET() {
  try {
    const result = await pool.query(
      `SELECT 
        id,
        name,
        description,
        category,
        base_price,
        unit,
        is_active
       FROM service_catalog
       WHERE is_active = true
       ORDER BY category, name`
    );

    return NextResponse.json({
      services: result.rows
    });
  } catch (error) {
    console.error('Get services error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch services' },
      { status: 500 }
    );
  }
}
