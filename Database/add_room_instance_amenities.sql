-- Add individual room amenities table
-- This allows each room instance to have custom amenities beyond the room type defaults

-- Create the junction table for individual rooms and amenities
CREATE TABLE IF NOT EXISTS room_instance_amenities (
    room_id INT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    amenity_id INT NOT NULL REFERENCES amenities(id) ON DELETE CASCADE,
    PRIMARY KEY (room_id, amenity_id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_room_instance_amenities_room_id ON room_instance_amenities(room_id);
CREATE INDEX IF NOT EXISTS idx_room_instance_amenities_amenity_id ON room_instance_amenities(amenity_id);

-- Add comment
COMMENT ON TABLE room_instance_amenities IS 'Links individual room instances to their specific amenities (can differ from room type defaults)';
