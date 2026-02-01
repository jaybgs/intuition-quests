-- Check what columns user_iq_balance actually has
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'user_iq_balance'
ORDER BY ordinal_position;
