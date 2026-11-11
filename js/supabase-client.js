/**
 * PharmaLab IMS - Supabase Client
 * Single source of truth for the Supabase connection.
 * Include this FIRST before supabase-data.js on every page.
 *
 * CDN: loaded via <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
 */

const SUPABASE_URL  = 'https://ygznqaqyrhhpeuibdsqe.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlnem5xYXF5cmhocGV1aWJkc3FlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU3MDE3NjgsImV4cCI6MjA5MTI3Nzc2OH0.PfQ-UpEEEjuZPV2sPapLyCONSIm02P50QtdRP-wfTaY';

// supabase global is provided by the CDN script
const db = supabase.createClient(SUPABASE_URL, SUPABASE_ANON);
