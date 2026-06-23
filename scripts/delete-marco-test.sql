-- One-off cleanup: remove 3 abandoned TEST rows with legacy product_key 'marco'
-- (customer cust_e6af4524325c: order=concept, sub=pending_payment, service tier "dd").
-- Audited 2026-06-23, no real paying subscription. Backup: backup-aanloop-portal-pre-marco-20260623.sql
-- Run: npx wrangler d1 execute aanloop-portal --remote --file scripts/delete-marco-test.sql
DELETE FROM subscriptions WHERE product_key = 'marco';
DELETE FROM service_orders WHERE product_key = 'marco';
DELETE FROM services WHERE product_key = 'marco';
