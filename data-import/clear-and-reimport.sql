-- Run this in Supabase SQL Editor to clear duplicate/bad inventory data
-- Then re-import using the app's Import button with the new inventory-import.json

-- WARNING: This deletes ALL items in the chemicals table.
-- Make sure you have the inventory-import.json ready to re-import after.

TRUNCATE TABLE chemicals;
