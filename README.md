# VendorBridge — Procurement & Vendor Management ERP

A full-stack ERP system for streamlining procurement operations: vendor management, RFQs, quotations, approvals, purchase orders, and invoices.

## 🛠 Tech Stack

| Layer | Technologies |
|-------|-------------|
| Frontend | React 18, Vite, TailwindCSS v4, Recoil, Zod, React Router v6, Recharts |
| Backend | Express.js, Node.js, JWT Auth, bcryptjs |
| Database | PostgreSQL with 13 normalized tables |
| PDF | PDFKit (server-side) |

## 🚀 Quick Start

### Prerequisites
- **Node.js** ≥ 18
- **PostgreSQL** running on localhost:5432

### 1. Setup Database

```bash
# Create database and apply schema + seed data
npm run setup:db
```

### 2. Install All Dependencies

```bash
npm run install:all
```

### 3. Start Development Servers

```bash
npm run dev
```

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:5000
- **Health Check**: http://localhost:5000/api/health

## 👤 Demo Credentials (Password: `Password123!`)

| Role | Email |
|------|-------|
| Admin | admin@vendorbridge.com |
| Procurement Officer | priya@vendorbridge.com |
| Manager / Approver | rahul@vendorbridge.com |
| Vendor | suresh@techsupplies.com |

## 📋 Features

### 10 Complete Screens
1. **Login / Signup** — JWT auth with role selection
2. **Dashboard** — Stats, charts, recent POs/invoices
3. **Vendor Management** — CRUD with search, filters, GST details
4. **RFQ Creation** — Multi-item RFQs with vendor invitation
5. **Quotation Submission** — Vendor pricing per line item
6. **Quotation Comparison** — Side-by-side with lowest price highlighting
7. **Approval Workflow** — Approve/reject with remarks
8. **Purchase Order & Invoice** — PDF generation, print, email
9. **Activity & Logs** — Notifications + audit trail
10. **Reports & Analytics** — Vendor performance, spending, trends

### Role-Based Access
- **Admin** — Full access
- **Procurement Officer** — RFQs, vendors, POs, invoices
- **Manager** — Approvals, view all
- **Vendor** — Submit quotations, track RFQs

## 📁 Project Structure

```
VendorBridge/
├── client/          # React Vite frontend
│   └── src/
│       ├── atoms/   # Recoil state
│       ├── api/     # Axios API client
│       ├── schemas/ # Zod validation
│       ├── components/
│       └── pages/   # 10 route pages
└── server/          # Express backend
    ├── controllers/ # Business logic
    ├── routes/      # API endpoints
    ├── middleware/  # JWT auth + logging
    └── db/          # PostgreSQL schema + seed
```

## 🗄 Database Schema

13 PostgreSQL tables with FK constraints, indexes, and auto-update triggers:
`users`, `vendors`, `rfqs`, `rfq_items`, `rfq_vendors`, `quotations`, `quotation_items`, `approvals`, `purchase_orders`, `po_items`, `invoices`, `activity_logs`, `notifications`

## 🔌 API Endpoints

| Resource | Endpoints |
|----------|-----------|
| Auth | POST /login, POST /register, GET /me |
| Vendors | GET/POST/PUT/DELETE /vendors |
| RFQs | GET/POST /rfqs, GET /rfqs/:id, POST /rfqs/:id/invite |
| Quotations | GET/POST /rfqs/:rfqId/quotations |
| Approvals | GET/POST /approvals, PUT /approvals/:id |
| Purchase Orders | GET/POST /purchase-orders, GET /purchase-orders/:id |
| Invoices | GET/POST /invoices, GET /invoices/:id/pdf, POST /invoices/:id/send-email |
| Reports | GET /reports/dashboard, /vendor-performance, /spending, /monthly-trends |
| Logs | GET /activity-logs, GET/PUT /notifications |
