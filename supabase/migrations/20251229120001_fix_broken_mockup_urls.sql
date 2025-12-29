-- Fix broken mockup image URLs in pins table
-- These pins were created with temporary Dynamic Mockups S3 URLs instead of R2 URLs

UPDATE pins p
SET image_url = m.file_url
FROM mockups m
WHERE p.mockup_id = m.id
  AND p.image_url LIKE '%dynamicmockups%'
  AND m.file_url IS NOT NULL;
