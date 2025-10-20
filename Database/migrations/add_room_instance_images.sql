-- Migration: Add room_instance_images table for individual room images
-- Date: October 20, 2025

-- Create room_instance_images table to store multiple images per individual room
CREATE TABLE IF NOT EXISTS room_instance_images (
    id SERIAL PRIMARY KEY,
    room_id INT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    caption TEXT,
    display_order INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_room_instance_images_room_id ON room_instance_images(room_id);
CREATE INDEX IF NOT EXISTS idx_room_instance_images_display_order ON room_instance_images(room_id, display_order);

COMMENT ON TABLE room_instance_images IS 'Stores multiple images for each individual room instance';
COMMENT ON COLUMN room_instance_images.image_url IS 'URL to the image (can be external URL or local path)';
COMMENT ON COLUMN room_instance_images.display_order IS 'Order in which images should be displayed (0 = first)';
