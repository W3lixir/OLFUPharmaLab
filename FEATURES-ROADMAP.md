# PharmaLab IMS - Feature Roadmap para sa Professors & Students

## 🎯 Target Users: Professors + Students
**Goal:** Maganda at malupit para sa school submission at portfolio!

---

## 📋 RECOMMENDED FEATURES (Prioritized)

### FOR PROFESSORS

| Feature | Description | Impact | Effort |
|---------|-------------|--------|--------|
| **1. Faculty Dashboard** | Dedicated dashboard para sa professors - pending approvals, their classes, quick actions | ⭐⭐⭐⭐⭐ | Medium |
| **2. Bulk Material Request** | Professor mag-submit ng request for whole class (e.g. 30 students × same chemicals) | ⭐⭐⭐⭐⭐ | Medium |
| **3. Experiment Templates** | Pre-defined kits: "Acid-Base Titration", "Distillation", etc. - one-click request | ⭐⭐⭐⭐ | Easy |
| **4. Approve/Reject Student Requests** | Professor approves requests for their subjects before Lab Tech releases | ⭐⭐⭐⭐⭐ | Easy |
| **5. Class/Section Management** | Link requests to subject, section, instructor | ⭐⭐⭐ | Medium |
| **6. Usage Reports & Analytics** | Consumption trends, most-used chemicals, PDF/CSV export | ⭐⭐⭐⭐ | Medium |
| **7. Announcements** | Post lab announcements, schedule changes, reminders to students | ⭐⭐⭐⭐ | Easy |

### FOR STUDENTS

| Feature | Description | Impact | Effort |
|---------|-------------|--------|--------|
| **1. Notification Center** | Real-time notifications: "Request approved!", "Ready for pickup", "Rejected" | ⭐⭐⭐⭐⭐ | Easy |
| **2. Lab Safety Acknowledgment** | Must acknowledge safety rules before first request (recorded, portfolio wow) | ⭐⭐⭐⭐⭐ | Easy |
| **3. Safety Data Sheets (SDS) Viewer** | Browse/search SDS for chemicals - link to external or local PDFs | ⭐⭐⭐⭐ | Medium |
| **4. Lab Room Availability** | See lab/lecture room schedule - when is Lab 1 free? | ⭐⭐⭐ | Easy (may room schedule na!) |
| **5. Request from Templates** | Quick request: "I need Acid-Base Titration kit" - auto-fills items | ⭐⭐⭐⭐ | Easy |
| **6. My Borrowed Equipment** | List of equipment currently borrowed, return reminders | ⭐⭐⭐ | Medium |
| **7. Announcements Feed** | See professor announcements, lab updates | ⭐⭐⭐ | Easy |

### CROSS-CUTTING (Portfolio Boosters)

| Feature | Description | Impact | Effort |
|---------|-------------|--------|--------|
| **1. Role Switcher / Demo Mode** | On START-HERE: "View as Student" / "View as Professor" / "View as Admin" | ⭐⭐⭐⭐⭐ | Easy |
| **2. Export Reports (PDF)** | Dashboard summary, request list, inventory report - printable | ⭐⭐⭐⭐ | Medium |
| **3. Search** | Global search: chemicals, equipment, requests | ⭐⭐⭐ | Medium |
| **4. Dark Mode** | Toggle dark/light theme - modern touch | ⭐⭐⭐ | Easy |
| **5. Audit Trail** | Who did what, when - visible to admins | ⭐⭐⭐ | Easy (may audit na sa data.js) |
| **6. Multi-language (Filipino)** | Toggle EN/Tagalog for key labels | ⭐⭐ | Easy |

---

## 🚀 IMPLEMENTATION PRIORITY (For School + Portfolio)

### Phase 1 - Quick Wins (1-2 days)
1. ✅ **Role Switcher** - Demo mode sa START-HERE
2. ✅ **Notification Center** - Working notifications
3. ✅ **Announcements** - Professors post, students see
4. ✅ **Lab Safety Acknowledgment** - Before student request
5. ✅ **Experiment Templates** - Quick-select in request form

### Phase 2 - Core Features (2-3 days)
6. **Faculty Dashboard** - Professor-specific view
7. **Bulk Request** - Professor bulk request for class
8. **Approve/Reject** - Professor workflow in admin-requests
9. **SDS Browser** - Simple SDS list + external links

### Phase 3 - Polish (1-2 days)
10. **Export PDF** - Dashboard/request export
11. **Lab Room Availability** - Student-facing room view
12. **Dark Mode** - Theme toggle
13. **README update** - Document new features

---

## 💡 PORTFOLIO HIGHLIGHTS (What to showcase)

- **Role-Based UX** - 3 different experiences (Admin, Professor, Student)
- **Complete Workflow** - Request → Professor Approval → Lab Tech Release → Return
- **Safety-First** - GHS compliance, SDS, Lab Safety Acknowledgment
- **Philippine Context** - Peso, PHT, CHED-ready
- **Mobile-Friendly** - QR request flow for students on phones
- **Print-Ready** - A4 dispensing checklist
- **Modern Stack** - Clean UI, responsive, localStorage prototype

---

## 📁 New Files to Create

```
faculty-dashboard.html    # Professor view
announcements.html        # Admin: manage announcements
student-announcements.html # Or integrate in student-dashboard
sds-browser.html          # SDS/Safety Data Sheets
```

## 📝 Files to Modify

```
START-HERE.html           # Add role switcher
student-dashboard.html    # Notifications, announcements, safety ack
material-request.html     # Experiment templates, safety check
admin-requests.html      # Professor approval workflow
index.html               # Notification center
js/data.js               # announcements, notifications, templates
```

---

*Ready to implement? Sabihin mo lang kung alin ang uunahin!* 🚀
