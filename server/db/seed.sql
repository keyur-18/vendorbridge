
TRUNCATE TABLE notifications, activity_logs, invoices, po_items, purchase_orders, 
  approvals, quotation_items, quotations, rfq_vendors, rfq_items, rfqs, 
  vendors, users RESTART IDENTITY CASCADE;

-- ============================================================
-- ============================================================
INSERT INTO users (id, name, email, password_hash, role) VALUES
  ('11111111-0000-0000-0000-000000000001', 'Admin User', 'admin@vendorbridge.com', '$2a$10$jzbVTIt2DSaXKXKnm1MIeemN6q8w6FitNaqhRR4g.D43mVtvYKOCq', 'admin'),
  ('11111111-0000-0000-0000-000000000002', 'Priya Sharma', 'priya@vendorbridge.com', '$2a$10$jzbVTIt2DSaXKXKnm1MIeemN6q8w6FitNaqhRR4g.D43mVtvYKOCq', 'procurement_officer'),
  ('11111111-0000-0000-0000-000000000003', 'Rahul Mehta', 'rahul@vendorbridge.com', '$2a$10$jzbVTIt2DSaXKXKnm1MIeemN6q8w6FitNaqhRR4g.D43mVtvYKOCq', 'manager'),
  ('11111111-0000-0000-0000-000000000004', 'Suresh Vendor', 'suresh@techsupplies.com', '$2a$10$jzbVTIt2DSaXKXKnm1MIeemN6q8w6FitNaqhRR4g.D43mVtvYKOCq', 'vendor'),
  ('11111111-0000-0000-0000-000000000005', 'Ananya Vendor', 'ananya@officepros.com', '$2a$10$jzbVTIt2DSaXKXKnm1MIeemN6q8w6FitNaqhRR4g.D43mVtvYKOCq', 'vendor');

-- ============================================================
-- VENDORS
-- ============================================================
INSERT INTO vendors (id, user_id, company_name, category, gst_number, contact_person, phone, email, address, city, state, pincode, status, rating) VALUES
  ('22222222-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000004', 'Tech Supplies Pvt Ltd', 'Electronics', '29ABCDE1234F1Z5', 'Suresh Kumar', '+91-9876543210', 'suresh@techsupplies.com', '123 MG Road', 'Bangalore', 'Karnataka', '560001', 'active', 4.5),
  ('22222222-0000-0000-0000-000000000002', '11111111-0000-0000-0000-000000000005', 'Office Pros India', 'Office Supplies', '27FGHIJ5678K2L6', 'Ananya Singh', '+91-9876543211', 'ananya@officepros.com', '456 Park Street', 'Mumbai', 'Maharashtra', '400001', 'active', 4.2),
  ('22222222-0000-0000-0000-000000000003', NULL, 'Global Logistics Co', 'Logistics', '19KLMNO9012P3M7', 'Rajesh Patel', '+91-9876543212', 'rajesh@globallogistics.com', '789 NH8 Highway', 'Delhi', 'Delhi', '110001', 'active', 3.8),
  ('22222222-0000-0000-0000-000000000004', NULL, 'Software Solutions Ltd', 'IT Services', '24PQRST3456Q4N8', 'Kavitha Nair', '+91-9876543213', 'kavitha@softsolutions.com', '321 Tech Park', 'Hyderabad', 'Telangana', '500001', 'active', 4.7),
  ('22222222-0000-0000-0000-000000000005', NULL, 'Green Office Furniture', 'Furniture', '33UVWXY7890R5O9', 'Mohan Das', '+91-9876543214', 'mohan@greenoffice.com', '654 Industrial Area', 'Chennai', 'Tamil Nadu', '600001', 'inactive', 3.5);

-- ============================================================
-- ============================================================
INSERT INTO rfqs (id, rfq_number, title, description, created_by, status, deadline) VALUES
  ('33333333-0000-0000-0000-000000000001', 'RFQ-2024-001', 'Office Laptop Procurement', 'Procurement of 50 laptops for development team with 16GB RAM, 512GB SSD', '11111111-0000-0000-0000-000000000002', 'awarded', NOW() - INTERVAL '10 days'),
  ('33333333-0000-0000-0000-000000000002', 'RFQ-2024-002', 'Annual Stationery Supply', 'Office stationery for Q4 2024 including pens, notebooks, folders', '11111111-0000-0000-0000-000000000002', 'open', NOW() + INTERVAL '5 days'),
  ('33333333-0000-0000-0000-000000000003', 'RFQ-2024-003', 'Cloud Storage Services', 'Enterprise cloud storage solution for 1TB with 99.9% uptime SLA', '11111111-0000-0000-0000-000000000002', 'open', NOW() + INTERVAL '15 days'),
  ('33333333-0000-0000-0000-000000000004', 'RFQ-2024-004', 'Office Chair Procurement', 'Ergonomic office chairs for new floor - 100 units', '11111111-0000-0000-0000-000000000002', 'draft', NOW() + INTERVAL '20 days');

-- ============================================================
-- RFQ ITEMS
-- ============================================================
INSERT INTO rfq_items (id, rfq_id, product_name, quantity, unit, specifications) VALUES
  ('44444444-0000-0000-0000-000000000001', '33333333-0000-0000-0000-000000000001', 'Laptop 16GB RAM 512GB SSD', 50, 'units', 'Intel Core i7, 16GB DDR4, 512GB NVMe SSD, 15.6" FHD Display'),
  ('44444444-0000-0000-0000-000000000002', '33333333-0000-0000-0000-000000000002', 'Ball Point Pens (Blue)', 500, 'units', 'Standard blue ink ball point pens'),
  ('44444444-0000-0000-0000-000000000003', '33333333-0000-0000-0000-000000000002', 'A4 Notebooks 200 Pages', 200, 'units', 'A4 size ruled notebooks, 200 pages each'),
  ('44444444-0000-0000-0000-000000000004', '33333333-0000-0000-0000-000000000003', 'Cloud Storage 1TB/year', 1, 'license', 'Enterprise tier with SLA and support'),
  ('44444444-0000-0000-0000-000000000005', '33333333-0000-0000-0000-000000000004', 'Ergonomic Office Chair', 100, 'units', 'Adjustable lumbar support, mesh back, armrests');

-- ============================================================
-- RFQ VENDOR INVITATIONS
-- ============================================================
INSERT INTO rfq_vendors (rfq_id, vendor_id, status) VALUES
  ('33333333-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000001', 'quoted'),
  ('33333333-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000004', 'quoted'),
  ('33333333-0000-0000-0000-000000000002', '22222222-0000-0000-0000-000000000002', 'quoted'),
  ('33333333-0000-0000-0000-000000000003', '22222222-0000-0000-0000-000000000004', 'invited'),
  ('33333333-0000-0000-0000-000000000004', '22222222-0000-0000-0000-000000000005', 'invited');

-- ============================================================
-- QUOTATIONS
-- ============================================================
INSERT INTO quotations (id, rfq_id, vendor_id, status, notes, delivery_days, validity_days, total_amount, submitted_at) VALUES
  ('55555555-0000-0000-0000-000000000001', '33333333-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000001', 'accepted', 'Includes 1 year warranty and on-site support', 14, 30, 3750000.00, NOW() - INTERVAL '8 days'),
  ('55555555-0000-0000-0000-000000000002', '33333333-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000004', 'rejected', 'Best price offer with extended warranty', 21, 30, 4000000.00, NOW() - INTERVAL '7 days'),
  ('55555555-0000-0000-0000-000000000003', '33333333-0000-0000-0000-000000000002', '22222222-0000-0000-0000-000000000002', 'submitted', 'Bulk discount applied for orders above 200 units', 7, 45, 45000.00, NOW() - INTERVAL '2 days');

-- ============================================================
-- QUOTATION ITEMS
-- ============================================================
INSERT INTO quotation_items (quotation_id, rfq_item_id, product_name, quantity, unit, unit_price, total_price) VALUES
  ('55555555-0000-0000-0000-000000000001', '44444444-0000-0000-0000-000000000001', 'Laptop 16GB RAM 512GB SSD', 50, 'units', 75000.00, 3750000.00),
  ('55555555-0000-0000-0000-000000000002', '44444444-0000-0000-0000-000000000001', 'Laptop 16GB RAM 512GB SSD', 50, 'units', 80000.00, 4000000.00),
  ('55555555-0000-0000-0000-000000000003', '44444444-0000-0000-0000-000000000002', 'Ball Point Pens (Blue)', 500, 'units', 50.00, 25000.00),
  ('55555555-0000-0000-0000-000000000003', '44444444-0000-0000-0000-000000000003', 'A4 Notebooks 200 Pages', 200, 'units', 100.00, 20000.00);

-- ============================================================
-- APPROVALS
-- ============================================================
INSERT INTO approvals (id, rfq_id, quotation_id, requested_by, approver_id, status, remarks, acted_at) VALUES
  ('66666666-0000-0000-0000-000000000001', '33333333-0000-0000-0000-000000000001', '55555555-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000002', '11111111-0000-0000-0000-000000000003', 'approved', 'Best price with warranty - approved for procurement', NOW() - INTERVAL '6 days'),
  ('66666666-0000-0000-0000-000000000002', '33333333-0000-0000-0000-000000000002', '55555555-0000-0000-0000-000000000003', '11111111-0000-0000-0000-000000000002', '11111111-0000-0000-0000-000000000003', 'pending', NULL, NULL);

-- ============================================================
-- PURCHASE ORDERS
-- ============================================================
INSERT INTO purchase_orders (id, po_number, rfq_id, quotation_id, vendor_id, created_by, status, delivery_address, subtotal, tax_rate, tax_amount, total_amount, issued_at) VALUES
  ('77777777-0000-0000-0000-000000000001', 'PO-2024-001', '33333333-0000-0000-0000-000000000001', '55555555-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000002', 'issued', '123 Corporate HQ, Bangalore, Karnataka 560001', 3750000.00, 18, 675000.00, 4425000.00, NOW() - INTERVAL '5 days');

-- ============================================================
-- PO ITEMS
-- ============================================================
INSERT INTO po_items (po_id, product_name, quantity, unit, unit_price, total_price) VALUES
  ('77777777-0000-0000-0000-000000000001', 'Laptop 16GB RAM 512GB SSD', 50, 'units', 75000.00, 3750000.00);

-- ============================================================
-- INVOICES
-- ============================================================
INSERT INTO invoices (id, invoice_number, po_id, vendor_id, subtotal, tax_rate, tax_amount, total_amount, status, due_date) VALUES
  ('88888888-0000-0000-0000-000000000001', 'INV-2024-001', '77777777-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000001', 3750000.00, 18, 675000.00, 4425000.00, 'sent', NOW() + INTERVAL '25 days');

-- ============================================================
-- ACTIVITY LOGS
-- ============================================================
INSERT INTO activity_logs (user_id, action, entity_type, entity_id, description) VALUES
  ('11111111-0000-0000-0000-000000000002', 'CREATE', 'rfq', '33333333-0000-0000-0000-000000000001', 'Created RFQ: Office Laptop Procurement'),
  ('11111111-0000-0000-0000-000000000002', 'INVITE', 'rfq', '33333333-0000-0000-0000-000000000001', 'Invited 2 vendors to RFQ-2024-001'),
  ('11111111-0000-0000-0000-000000000004', 'SUBMIT', 'quotation', '55555555-0000-0000-0000-000000000001', 'Submitted quotation for RFQ-2024-001'),
  ('11111111-0000-0000-0000-000000000003', 'APPROVE', 'approval', '66666666-0000-0000-0000-000000000001', 'Approved procurement for RFQ-2024-001'),
  ('11111111-0000-0000-0000-000000000002', 'CREATE', 'purchase_order', '77777777-0000-0000-0000-000000000001', 'Generated Purchase Order PO-2024-001'),
  ('11111111-0000-0000-0000-000000000002', 'CREATE', 'invoice', '88888888-0000-0000-0000-000000000001', 'Generated Invoice INV-2024-001');

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
INSERT INTO notifications (user_id, title, message, type, entity_type, entity_id) VALUES
  ('11111111-0000-0000-0000-000000000002', 'RFQ Awarded', 'RFQ-2024-001 has been approved and PO generated', 'success', 'rfq', '33333333-0000-0000-0000-000000000001'),
  ('11111111-0000-0000-0000-000000000003', 'Pending Approval', 'RFQ-2024-002 quotation is awaiting your approval', 'warning', 'approval', '66666666-0000-0000-0000-000000000002'),
  ('11111111-0000-0000-0000-000000000004', 'New RFQ Invitation', 'You have been invited to quote for RFQ-2024-003', 'rfq', 'rfq', '33333333-0000-0000-0000-000000000003');
