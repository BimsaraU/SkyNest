-- Migration: Add branch_images table
-- Date: October 20, 2025

-- Create branch_images table to store multiple images per branch
CREATE TABLE IF NOT EXISTS branch_images (
    id SERIAL PRIMARY KEY,
    branch_id INT NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    caption TEXT,
    display_order INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_branch_images_branch_id ON branch_images(branch_id);
CREATE INDEX IF NOT EXISTS idx_branch_images_display_order ON branch_images(branch_id, display_order);

-- Insert sample data if needed
-- INSERT INTO branch_images (branch_id, image_url, caption, display_order) VALUES
-- (1, 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800', 'Hotel Exterior', 0),
-- (1, 'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=800', 'Lobby Area', 1);

COMMENT ON TABLE branch_images IS 'Stores multiple images for each hotel branch';
COMMENT ON COLUMN branch_images.image_url IS 'URL to the image (can be external URL or local path)';
COMMENT ON COLUMN branch_images.display_order IS 'Order in which images should be displayed (0 = first)';
