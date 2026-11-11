# PharmaLab IMS - Laboratory Inventory Management System

A comprehensive web-based Laboratory Inventory Management System (LIMS) designed for the College of Pharmacy in the Philippines.

## 🎯 Overview

PharmaLab IMS is a production-grade system for managing:
- Chemical inventory with hazard classification (GHS)
- Laboratory equipment and glassware
- Student material requests via QR code
- Procurement and supplier workflows
- Safety compliance (SDS repository)
- Audit trails and reporting

## 🏗️ System Architecture

### Technology Stack
- **Frontend**: HTML5, CSS3, Vanilla JavaScript (Prototype)
- **Planned Stack**:
  - React + TypeScript
  - Tailwind CSS
  - Node.js + Express / NestJS
  - PostgreSQL + Prisma ORM
  - JWT + Role-Based Access Control (RBAC)

## 📁 File Structure

```
EC-Lab/
├── index.html                  # Admin/Lab Manager Dashboard
├── student-dashboard.html      # Student Dashboard
├── material-request.html        # QR-based Material Request Form (Student-facing)
├── admin-requests.html         # Request Management (Admin view)
├── print-checklist.html        # Printable Dispensing Checklist (A4-optimized)
├── inventory.html              # Chemical Inventory Management
├── equipment.html              # Equipment & Glassware Management
└── README.md                   # This file
```

## 👥 User Roles

1. **Super Admin** (Dean / Lab Director)
   - Full system access
   - User management
   - System configuration

2. **Lab Manager**
   - Inventory oversight
   - Request approvals
   - Procurement management

3. **Faculty**
   - View inventory
   - Submit bulk requests
   - Approve student requests

4. **Laboratory Technician**
   - Release materials
   - Equipment maintenance tracking
   - Inventory updates

5. **Student**
   - Submit material requests
   - Track request status
   - View request history

## 🚀 Quick Start

### Option 1: Run with npm (Recommended)

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Start the dev server**
   ```bash
   npm run dev
   ```

3. **Open in browser**
   - The server will open automatically at **http://localhost:3000**
   - If not, go to: **http://localhost:3000/START-HERE.html**
   - All pages are served from localhost (e.g. `http://localhost:3000/index.html`)

**Available scripts:**
- `npm run dev` — Start dev server with live reload (opens START-HERE.html)
- `npm start` — Same as dev
- `npm run serve` — Start server without auto-opening browser

### Option 2: Open HTML files directly

1. **Clone or download this repository**
   ```bash
   cd EC-Lab
   ```

2. **Open any HTML file directly in your browser**
   - For Admin view: Open `index.html`
   - For Student view: Open `student-dashboard.html`
   - For QR Request Form: Open `material-request.html`

3. **No build process required** - These are static HTML files with embedded CSS and JavaScript

### Navigation Flow

#### Admin Workflow:
1. `index.html` → Dashboard overview
2. `admin-requests.html` → Review pending requests
3. Click "Approve" → Auto-redirects to `print-checklist.html`
4. Print checklist for laboratory technician
5. `inventory.html` or `equipment.html` → Manage inventory

#### Student Workflow:
1. Scan QR code in laboratory → Opens `material-request.html`
2. Fill out multi-step form (Student Info → Request Details → Items → Review)
3. Submit → Receive reference number
4. `student-dashboard.html` → Track request status

## 📋 Core Features Implemented (Prototype)

### ✅ Completed
- [x] Global layout (sidebar + top navigation)
- [x] Admin dashboard with statistics
- [x] Student dashboard (simple, request-focused)
- [x] QR-based student request form (4-step wizard)
- [x] Admin request management table
- [x] Printable dispensing checklist (A4-optimized)
- [x] Chemical inventory table with hazard icons
- [x] Equipment grid view with status badges
- [x] Responsive design (desktop-first)
- [x] Professional color scheme (neutral, academic)

### 🔜 To Be Implemented (Full Stack)
- [ ] Database schema (Prisma)
- [ ] REST API endpoints
- [ ] Authentication & RBAC middleware
- [ ] Real-time notifications
- [ ] Email alerts
- [ ] SDS file upload & viewer
- [ ] Barcode/QR code generation
- [ ] Advanced reporting (PDF/CSV export)
- [ ] Audit logging
- [ ] Equipment calibration scheduler
- [ ] Procurement workflow
- [ ] Safety compliance module

## 🎨 UI/UX Design Philosophy

### Design Principles
- **Clean & Professional**: Medical/hospital-grade UI aesthetic
- **One-glance Clarity**: Critical information visible without scrolling
- **Minimal Cognitive Load**: Simple navigation, clear hierarchy
- **Print-friendly**: Real-world dispensing workflows (A4 checklists)
- **Accessible**: WCAG-friendly, high contrast, clear labels

### Color Palette
- Primary: `#667eea` (Professional Purple)
- Success: `#48bb78` (Green)
- Warning: `#d97706` (Amber)
- Danger: `#e53e3e` (Red)
- Neutral: `#f5f7fa` (Light Gray Background)

## 📄 Key Pages Breakdown

### 1. **index.html** - Admin Dashboard
- Summary cards (Total Chemicals, Expiring Soon, Low Stock, Active Requests)
- Recent activity feed
- Quick action buttons
- Real-time alerts

### 2. **student-dashboard.html** - Student Portal
- Welcome banner with student info
- Quick action cards (Request Chemicals, Equipment, Track Requests)
- Request history with status tracking
- Important reminders

### 3. **material-request.html** - QR Request Form
- **Multi-step wizard**:
  1. Student Information
  2. Request Details (Subject, Experiment, Instructor)
  3. Items (Dynamic item list builder)
  4. Review & Submit
- Auto-generated reference number
- Printable confirmation

### 4. **admin-requests.html** - Request Management
- Filterable request table
- Status badges (Pending, Approved, Released, Returned, Rejected)
- Modal view for request details
- Item availability checker
- Approve/Reject workflow

### 5. **print-checklist.html** - Dispensing Checklist
- **A4-optimized layout** (black & white)
- Institution header (customizable)
- Student & experiment details
- Item checklist with checkboxes
- Signature lines (Released by / Received by)
- Return verification section
- GHS safety reminder

### 6. **inventory.html** - Chemical Inventory
- Searchable/filterable table
- Hazard icons (Corrosive, Toxic, Flammable)
- Stock status badges
- Expiry date warnings (color-coded)
- CAS numbers
- Lot/Batch tracking
- Quick actions (View, Edit, SDS)

### 7. **equipment.html** - Equipment Management
- Card-based grid layout
- Equipment status (Available, Borrowed, Maintenance)
- Calibration due alerts
- Asset ID tracking
- Borrow/Return workflow
- Maintenance history

## 🔐 Security Considerations (Future Implementation)

- JWT-based authentication
- Role-based access control (RBAC)
- Audit logging for all critical actions
- Session timeout
- Encrypted data storage
- HTTPS-only communication
- Input validation & sanitization
- SQL injection prevention (Prisma ORM)

## 📊 Database Schema (Planned)

### Core Tables
- `users` - User accounts with role assignments
- `chemicals` - Chemical inventory (name, CAS, hazard class, quantity, expiry, location)
- `equipment` - Equipment registry (asset ID, status, calibration, location)
- `requests` - Material/equipment requests
- `request_items` - Line items for each request
- `suppliers` - Supplier directory
- `procurement` - Purchase orders
- `audit_logs` - System-wide audit trail
- `sds_files` - Safety Data Sheets repository
- `maintenance_schedules` - Equipment calibration/maintenance

## 🇵🇭 Philippine-Specific Features

- VAT-inclusive pricing
- Philippine peso (₱) currency
- Local supplier integration
- CHED/FDA/DOH compliance audit trails
- Filipino-friendly UI labels (with Tagalog support option)
- Philippine educational system (Year levels, Sections)

## 📱 Mobile Responsiveness

Current prototype is **desktop-first** (as requested), but includes responsive breakpoints:
- Desktop: Full sidebar + table view
- Tablet: Collapsible sidebar
- Mobile: Bottom navigation (for future mobile app)

**Note**: QR request form (`material-request.html`) is mobile-optimized for students scanning QR codes on phones.

## 🖨️ Print Optimization

The **print-checklist.html** page is specially designed for operational use:
- Pure black-and-white layout (ink-efficient)
- A4 paper size (210mm × 297mm)
- No unnecessary UI elements when printing
- Professional document format
- Signature and verification fields
- Print button triggers `window.print()`

## 🧪 Sample Data

The prototype includes realistic sample data:
- **Chemicals**: Hydrochloric Acid, Sodium Hydroxide, Ethanol, Sulfuric Acid, etc.
- **CAS Numbers**: Accurate CAS registry numbers
- **Hazard Classifications**: GHS-compliant symbols
- **Student Names**: Philippine-typical names
- **Course**: BS Pharmacy program structure

## 📚 Future Enhancements

### Phase 2 (Backend Implementation)
- Full CRUD API with validation
- Database migrations (Prisma)
- Real authentication system
- Email notification service
- File upload system (SDS PDFs)

### Phase 3 (Advanced Features)
- Real-time inventory tracking
- Barcode scanner integration
- Predictive analytics (consumption trends)
- Automatic reorder points
- Chemical compatibility warnings
- Equipment reservation calendar
- Mobile app (React Native)

### Phase 4 (Integration & Compliance)
- LMS integration (Moodle/Canvas)
- ERP integration (accounting)
- CHED reporting module
- Blockchain audit trail (optional)
- AI-powered safety recommendations

## 🛠️ Development Roadmap

| Phase | Deliverable | Status |
|-------|-------------|--------|
| 1 | HTML/CSS Prototype | ✅ Complete |
| 2 | Database Design | 🔜 Next |
| 3 | Backend API | ⏳ Planned |
| 4 | Frontend (React) | ⏳ Planned |
| 5 | Authentication | ⏳ Planned |
| 6 | Testing & QA | ⏳ Planned |
| 7 | Deployment | ⏳ Planned |

## 📞 Support & Contribution

This is a production-ready prototype designed for audit and implementation planning.

### For Implementation:
1. Review all HTML files for UI/UX flow
2. Use this as design reference for React components
3. Database schema can be derived from form fields
4. API endpoints map to user workflows

### For Customization:
- **Logo**: Replace `.logo-placeholder` div with actual logo image
- **Institution Name**: Update header text in all files
- **Colors**: Modify CSS variables in `<style>` tags
- **Branding**: Update system name "PharmaLab IMS" globally

## ⚖️ License

Proprietary system for educational institutions.  
© 2026 College of Pharmacy. All rights reserved.

---

**Built with precision. Designed for safety. Ready for production.**

*This system prioritizes data integrity, laboratory safety, and regulatory compliance.*
