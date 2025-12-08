-- Add documents column to properties table
ALTER TABLE properties
ADD COLUMN documents TEXT DEFAULT '[]';
