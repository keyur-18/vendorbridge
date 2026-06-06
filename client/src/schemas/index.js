import { z } from 'zod';

// ─── Auth Schemas ─────────────────────────────────────────────
export const loginSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Must contain at least one number'),
  confirmPassword: z.string(),
  role: z.enum(['admin', 'procurement_officer', 'vendor', 'manager']),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

export const forgotPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email'),
});

// ─── Vendor Schema ─────────────────────────────────────────────
export const vendorSchema = z.object({
  company_name: z.string().min(2, 'Company name is required').max(255),
  category: z.string().optional(),
  gst_number: z.string().regex(/^[0-9A-Z]{15}$/, 'Invalid GST number format').optional().or(z.literal('')),
  contact_person: z.string().min(2, 'Contact person is required'),
  phone: z.string().min(10, 'Valid phone number required').optional().or(z.literal('')),
  email: z.string().email('Valid email is required'),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  pincode: z.string().optional(),
  notes: z.string().optional(),
});

// ─── RFQ Schema ─────────────────────────────────────────────
export const rfqItemSchema = z.object({
  product_name: z.string().min(1, 'Product name is required'),
  quantity: z.number().positive('Quantity must be positive'),
  unit: z.string().optional(),
  specifications: z.string().optional(),
});

export const rfqSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters').max(500),
  description: z.string().optional(),
  deadline: z.string().min(1, 'Deadline is required'),
  items: z.array(rfqItemSchema).min(1, 'At least one item is required'),
  vendor_ids: z.array(z.string()).optional(),
});

// ─── Quotation Schema ─────────────────────────────────────────
export const quotationSchema = z.object({
  delivery_days: z.number().int().positive('Delivery days must be positive'),
  validity_days: z.number().int().positive().default(30),
  notes: z.string().optional(),
  items: z.array(z.object({
    rfq_item_id: z.string().optional(),
    product_name: z.string().min(1),
    quantity: z.number().positive(),
    unit: z.string().optional(),
    unit_price: z.number().positive('Unit price must be positive'),
  })).min(1, 'At least one item is required'),
});

// ─── Approval Schema ─────────────────────────────────────────
export const approvalActionSchema = z.object({
  status: z.enum(['approved', 'rejected']),
  remarks: z.string().optional(),
});

// ─── PO Schema ─────────────────────────────────────────────
export const poSchema = z.object({
  vendor_id: z.string().min(1, 'Vendor is required'),
  delivery_address: z.string().min(5, 'Delivery address is required'),
  terms: z.string().optional(),
  tax_rate: z.number().min(0).max(100).default(18),
  items: z.array(z.object({
    product_name: z.string().min(1),
    quantity: z.number().positive(),
    unit: z.string().optional(),
    unit_price: z.number().positive(),
  })).min(1, 'At least one item is required'),
});
