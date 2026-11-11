-- Run this in the Supabase SQL Editor to add the category column
-- Dashboard: https://supabase.com/dashboard → SQL Editor

ALTER TABLE chemicals ADD COLUMN IF NOT EXISTS category text DEFAULT '';
