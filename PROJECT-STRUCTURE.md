# 📁 PharmaLab IMS - Project Structure

## Complete File List

```
EC-Lab/
│
├── 🏠 START-HERE.html              # ⭐ START HERE - Navigation guide to all pages
│
├── 👨‍💼 ADMIN PAGES
│   ├── index.html                   # Admin Dashboard (summary cards, activity feed)
│   ├── admin-requests.html          # Request Management (approve/reject workflow)
│   ├── inventory.html               # Chemical Inventory (hazard tracking, stock levels)
│   └── equipment.html               # Equipment & Glassware (calibration, borrow/return)
│
├── 👨‍🎓 STUDENT PAGES
│   ├── student-dashboard.html       # Student Dashboard (my requests, quick actions)
│   ├── material-request.html         # Material Request Form (4-step wizard)
│   └── qr-landing.html              # QR Landing Page (entry point after scan)
│
├── 🖨️ PRINT MATERIALS
│   ├── print-checklist.html         # Dispensing Checklist (A4 operational document)
│   └── print-qr-poster.html         # QR Poster (laboratory display)
│
└── 📚 DOCUMENTATION
    ├── README.md                    # Full system documentation
    └── PROJECT-STRUCTURE.md         # This file
```

---

## 📄 Page Details

### 1️⃣ **START-HERE.html** ⭐
**Purpose:** Central navigation hub for the entire system  
**For:** Developers, reviewers, and stakeholders  
**Features:**
- Role-based quick access
- Complete page directory
- Feature overview
- Visual navigation cards

**Open this first!**

---

### 2️⃣ **index.html** (Admin Dashboard)
**Role:** Lab Manager, Super Admin  
**Features:**
- Summary statistics (Total Chemicals, Expiring Soon, Low Stock, Active Requests)
- Recent activity feed with color-coded badges
- Quick action buttons
- Sidebar navigation
- Notification bell with badge

**Key UI Elements:**
- 📊 4 stat cards
- 📝 Activity timeline
- ⚡ Quick actions grid
- 🔔 Notification system

---

### 3️⃣ **admin-requests.html** (Request Management)
**Role:** Lab Manager, Faculty, Lab Technician  
**Features:**
- Filterable request table
- Status tracking (Pending, Approved, Released, Returned, Rejected)
- Modal detail view
- Approve/Reject workflow
- Print checklist integration

**Key UI Elements:**
- 🔍 Advanced filters
- 📊 Request statistics
- 🗂️ Sortable table
- 📋 Request detail modal

---

### 4️⃣ **inventory.html** (Chemical Inventory)
**Role:** Lab Manager, Lab Technician  
**Features:**
- Searchable chemical database
- Hazard icons (GHS-compliant)
- Stock status badges
- Expiry date warnings (color-coded)
- CAS number tracking
- Lot/Batch management

**Key UI Elements:**
- 🧪 Chemical table with sticky headers
- ⚠️ Hazard classification icons
- 📅 Expiry alerts (red = urgent)
- 📊 Stock level badges
- 📄 SDS quick access

**Sample Chemicals:**
- Hydrochloric Acid (HCl)
- Sodium Hydroxide (NaOH)
- Ethanol (95%)
- Sulfuric Acid (H₂SO₄)
- Phenolphthalein
- And more...

---

### 5️⃣ **equipment.html** (Equipment & Glassware)
**Role:** Lab Manager, Lab Technician  
**Features:**
- Card-based equipment grid
- Equipment status (Available, Borrowed, Maintenance)
- Calibration due alerts
- Asset ID tracking
- Borrow/Return workflow
- Visual equipment icons

**Key UI Elements:**
- 🔬 Equipment cards with status badges
- 📐 Calibration status indicators
- 🔧 Maintenance alerts
- 📍 Location tracking

**Sample Equipment:**
- Analytical Balance (Sartorius)
- Compound Microscope (Olympus)
- pH Meter (Hanna)
- Magnetic Stirrer Hotplate
- Centrifuge
- Micropipette Set

---

### 6️⃣ **student-dashboard.html** (Student Portal)
**Role:** Student  
**Features:**
- Personalized welcome banner
- Quick action cards
- Request history with status tracking
- Important reminders box

**Key UI Elements:**
- 👋 Welcome banner with student info
- 🚀 4 quick action cards
- 📝 Request history timeline
- 📋 Important reminders

---

### 7️⃣ **material-request.html** (Material Request Form)
**Role:** Student (Public-facing, QR-accessible)  
**Features:**
- 4-step wizard interface
- Progress indicator
- Dynamic item list builder
- Form validation
- Auto-generated reference number
- Printable confirmation

**Steps:**
1. **Student Information** (Name, ID, Course, Year, Section)
2. **Request Details** (Subject, Experiment, Instructor, Date Needed)
3. **Items** (Dynamic item selector with quantity/unit)
4. **Review & Confirm** (Summary view before submission)

**Key UI Elements:**
- 📊 Progress bar (visual step indicator)
- ➕ Add item button (dynamic form)
- ✅ Success confirmation with reference number
- 🖨️ Print confirmation option

---

### 8️⃣ **qr-landing.html** (QR Entry Point)
**Role:** Student (Mobile-friendly)  
**Purpose:** Landing page after scanning laboratory QR code  
**Features:**
- Laboratory identification
- Process overview (Fill → Submit → Track)
- Auto-redirect option
- Mobile-optimized layout

**Use Case:**
Students scan QR code posted in lab → Auto-opens this page → Redirects to request form

---

### 9️⃣ **print-checklist.html** (Dispensing Checklist)
**Role:** Lab Technician (Print Document)  
**Purpose:** Operational document for material release  
**Features:**
- A4-optimized layout (210mm × 297mm)
- Black & white print-friendly
- Student and experiment details
- Item checklist with checkboxes
- Signature sections (Released by / Received by)
- Return verification section
- Safety reminder box

**Print Specifications:**
- Paper: A4 (210mm × 297mm)
- Color: Black & white
- Font: Courier New (operational readability)
- No margins waste

**Use Case:**
Admin approves request → Clicks "Print Checklist" → Lab technician uses this to dispense materials

---

### 🔟 **print-qr-poster.html** (Laboratory Poster)
**Role:** Lab Administrator (Print Material)  
**Purpose:** Display poster for laboratories  
**Features:**
- A4 poster layout
- QR code placeholder
- Step-by-step instructions
- Laboratory identification
- Important reminder box

**Use Case:**
Print and post in each laboratory → Students scan QR → Redirects to request form

---

## 🎨 Design System

### Color Palette
| Color | Hex | Usage |
|-------|-----|-------|
| Primary Purple | `#667eea` | Buttons, links, highlights |
| Secondary Purple | `#764ba2` | Gradients, accents |
| Success Green | `#48bb78` | Success states, available status |
| Warning Amber | `#d97706` | Warnings, low stock alerts |
| Danger Red | `#e53e3e` | Errors, critical alerts |
| Neutral Gray | `#f5f7fa` | Background |
| Text Dark | `#1a202c` | Headings |
| Text Medium | `#4a5568` | Body text |
| Text Light | `#718096` | Captions, labels |

### Typography
- **Font Family:** -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto
- **Headings:** 700 weight (bold)
- **Body:** 400 weight (regular)
- **Labels:** 600 weight (semi-bold)

### Status Badges
| Status | Color | Used In |
|--------|-------|---------|
| Pending | Amber `#fef5e7` | Requests awaiting approval |
| Approved | Blue `#dbeafe` | Requests approved but not released |
| Released | Green `#f0fff4` | Materials dispensed |
| Returned | Gray `#f3f4f6` | Completed transactions |
| Rejected | Red `#fff5f5` | Denied requests |
| Available | Green | Inventory in stock |
| Low Stock | Amber | Below threshold |
| Critical | Red | Urgent reorder needed |

---

## 🔄 User Flow Diagrams

### Admin Workflow
```
index.html (Dashboard)
    ↓
admin-requests.html (Review pending requests)
    ↓
[Click "Approve"]
    ↓
print-checklist.html (Print for lab tech)
    ↓
inventory.html / equipment.html (Update stock after release)
```

### Student Workflow
```
[Scan QR Code in Lab]
    ↓
qr-landing.html (Welcome screen)
    ↓
material-request.html (Fill 4-step form)
    ↓
[Submit] → Receive REQ-2026-XXXX
    ↓
student-dashboard.html (Track status)
    ↓
[Approved] → Claim materials at lab
```

### Lab Technician Workflow
```
[Receive approved request]
    ↓
print-checklist.html (Print checklist)
    ↓
[Prepare materials]
    ↓
[Student arrives with ID]
    ↓
[Check items on checklist]
    ↓
[Both sign] → Release materials
    ↓
[Student returns]
    ↓
[Verify condition] → Mark returned
```

---

## 📱 Responsive Breakpoints

### Desktop (Default)
- Sidebar: 260px fixed width
- Main content: Flexible
- Table: Full width with horizontal scroll if needed

### Tablet (768px - 1024px)
- Sidebar: Collapsible
- Cards: 2-column grid
- Table: Horizontal scroll

### Mobile (<768px)
- Sidebar: Hidden (hamburger menu - to be implemented)
- Cards: Single column
- Forms: Optimized for touch

**Note:** QR request form is fully mobile-optimized for phone usage.

---

## 🔐 Role-Based Access (Future Implementation)

| Role | Dashboard | Requests | Inventory | Equipment | Reports | Settings |
|------|-----------|----------|-----------|-----------|---------|----------|
| Super Admin | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Lab Manager | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| Faculty | ✅ | ✅ | 👁️ | 👁️ | 👁️ | ❌ |
| Lab Technician | 📊 | ✅ | ✅ | ✅ | ❌ | ❌ |
| Student | 📱 | 📝 | ❌ | ❌ | ❌ | ❌ |

Legend:
- ✅ Full access
- 👁️ View only
- 📊 Custom dashboard
- 📱 Student-specific portal
- 📝 Submit only
- ❌ No access

---

## 🚀 How to Use This Prototype

### For Developers
1. Open `START-HERE.html` to navigate all pages
2. Review code structure (embedded CSS in each file)
3. Use as reference for React component conversion
4. Extract color palette and design tokens

### For Stakeholders
1. Open `START-HERE.html`
2. Click "Admin Dashboard" to see management view
3. Click "Student Portal" to see student experience
4. Review print materials for operational workflow

### For Designers
1. All pages use consistent design system
2. Colors defined in `:root` variables (future enhancement)
3. Print-optimized pages demonstrate operational UX
4. Responsive breakpoints included

### For Product Managers
1. Each page maps to a specific user story
2. Navigation flow demonstrates complete workflow
3. Print materials show real-world usage
4. Feature completeness visible in UI

---

## ✅ Completed Features (HTML Prototype)

- [x] Global layout with sidebar navigation
- [x] Top navigation bar with user profile
- [x] Admin dashboard with statistics
- [x] Student dashboard (simple, request-focused)
- [x] Chemical inventory table with hazard tracking
- [x] Equipment grid with status badges
- [x] QR-based student request form (4-step wizard)
- [x] Admin request management with modal details
- [x] Printable dispensing checklist (A4-optimized)
- [x] QR code landing page
- [x] Laboratory poster for QR code display
- [x] Responsive design (desktop-first)
- [x] Professional color scheme
- [x] Accessibility-friendly (high contrast, clear labels)
- [x] Print-optimized layouts

---

## 🔜 Next Steps (Full Stack Implementation)

### Phase 1: Database Design
- Prisma schema definition
- Table relationships
- Migration scripts
- Seed data

### Phase 2: Backend API
- Express/NestJS setup
- REST endpoints
- Authentication (JWT)
- RBAC middleware
- File upload (SDS)

### Phase 3: Frontend (React)
- Component conversion
- State management (Redux/Context)
- API integration
- Real-time updates

### Phase 4: DevOps
- Docker containerization
- PostgreSQL setup
- Environment configuration
- CI/CD pipeline

---

## 📞 Quick Reference

| Need to... | Open this file |
|------------|---------------|
| See all pages | `START-HERE.html` |
| Preview admin view | `index.html` |
| Preview student view | `student-dashboard.html` |
| Test request form | `material-request.html` |
| Review print checklist | `print-checklist.html` |
| Check inventory UI | `inventory.html` |
| See equipment tracking | `equipment.html` |
| View QR poster | `print-qr-poster.html` |
| Read documentation | `README.md` |

---

**Last Updated:** January 22, 2026  
**Version:** 1.0 (HTML Prototype)  
**Status:** ✅ Complete and ready for review
