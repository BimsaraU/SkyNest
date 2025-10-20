import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET() {
  try {
    console.log('[TEST API] Testing database connection...');
    
    // Test basic connection
    const connectionTest = await pool.query('SELECT NOW() as time, VERSION() as version');
    console.log('[TEST API] Connection successful:', connectionTest.rows[0]);
    
    // Test rooms table
    const roomsTest = await pool.query('SELECT COUNT(*) as count FROM room_types LIMIT 1');
    console.log('[TEST API] Rooms count:', roomsTest.rows[0]);
    
    // Test amenities table  
    const amenitiesTest = await pool.query('SELECT COUNT(*) as count FROM amenities LIMIT 1');
    console.log('[TEST API] Amenities count:', amenitiesTest.rows[0]);
    
    // Test maintenance_logs table
    const maintenanceTest = await pool.query('SELECT COUNT(*) as count FROM maintenance_logs LIMIT 1');
    console.log('[TEST API] Maintenance logs count:', maintenanceTest.rows[0]);
    
    return NextResponse.json({ 
      success: true,
      connection: connectionTest.rows[0],
      rooms: roomsTest.rows[0],
      amenities: amenitiesTest.rows[0],
      maintenance: maintenanceTest.rows[0]
    });
  } catch (error) {
    console.error('[TEST API] Database error:', error);
    return NextResponse.json(
      { 
        error: 'Database connection failed',
        details: (error as Error).message,
        stack: (error as Error).stack
      },
      { status: 500 }
    );
  }
}
