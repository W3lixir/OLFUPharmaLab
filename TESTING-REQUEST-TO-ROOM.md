# Testing: Request → Room Assignment → Print Checklist

**Important:** Run the app via local server so `localStorage` works across all pages (same origin).

```bash
npm run dev
```

Browser opens at `http://127.0.0.1:3000` (or similar). Use that base URL for all steps below.

---

## 1. Student: Submit a material request (with Room Assignment)

1. Open **Student Request**:  
   `http://127.0.0.1:3000/material-request.html`
2. Fill **Step 1** (Student Info): name, student number, contact, course, year, section.
3. In **Step 2** (Request Details):
   - Subject, Experiment, **Date Needed**, **Time Start**, **Time End**, Instructor.
   - **Room Assignment** – piliin ang lab room (e.g. "Pharmaceutical Lab 1").
   - Time End dapat after Time Start (para sa exact na oras sa room).
4. Add at least one material in **Step 3** (item name, quantity, unit).
5. **Step 4** – Review. Dapat makita ang **Room Assignment** at lahat ng details.
6. Click **Submit Request**. Dapat may confirmation at Request ID.

---

## 2. Admin: View request and see Room Assignment

1. Open **Admin Requests**:  
   `http://127.0.0.1:3000/admin-requests.html`
2. Dapat makita ang bagong request sa list (e.g. Pending).
3. **Click** the request row to open the modal.
4. Sa **Request Details**, dapat may:
   - Subject, Experiment, Instructor, Date Needed, Date Submitted.
   - **Laboratory** – dito lumalabas ang room assignment (e.g. "Chemistry Lab A").

---

## 3. Admin: Approve and open Print Checklist (room turns green automatically)

1. Sa request modal, click **Approve**.
2. Confirm. Dapat mag-open ang **Print Checklist** sa bagong tab.
3. Sa checklist, dapat makita:
   - **REQUEST ID**
   - **ROOM ASSIGNMENT** – same room na pinili sa request (e.g. PHARMACEUTICAL LAB 1).
   - **DATE NEEDED** – exact date at time start – time end (e.g. "January 27, 2026 at 2:00 PM – 4:00 PM").
   - Student info, experiment, instructor, materials table.
4. **Pagka-approve, awtomatikong na-add ang room schedule** (Time Start at Time End). So pag nag-**Laboratory Rooms** ka at pinili ang **same date** ng request, ang room na pinili (e.g. Pharmaceutical Lab 1) ay **green** na (Occupied).

Kung lahat yan nandyan, **request → room assignment → print** ay tama, at **room nag-green na pag na-approve**.

---

## 4. Admin: Check Laboratory Rooms (room green na after approve)

1. Open **Laboratory Rooms**:  
   `http://127.0.0.1:3000/laboratory-rooms.html`
2. **View date:** piliin ang **same date** na "Date Needed" ng approved request (e.g. 2026-01-27).
3. Dapat ang room na pinili sa request (e.g. **Pharmaceutical Lab 1**) ay naka-**green** (Occupied) na — **hindi na kailangan mag-Edit Schedule**; na-add na ang entry nang i-approve ang request (gamit Time Start at Time End).
4. **Click** the green room box. Dapat makita sa modal: Experiment/Activity, Professor/Instructor, Student (requested by), **Start time**, **End time**, Request ID.

Kung gusto pa mag-add ng ibang schedule (manual), puwede pa rin **Edit Schedule** → Room, Date, Start/End time, Link to request.

---

## 5. Quick checklist

| Step | What to check |
|------|----------------|
| 1 | Student form has **Time Start**, **Time End**, and **Room Assignment**; required; saved in request. |
| 2 | Admin request modal shows **Laboratory** (room) at Request Details. |
| 3 | After Approve, print checklist shows **ROOM ASSIGNMENT** and **DATE NEEDED** (date at start – end). |
| 4 | **Room turns green automatically** after approve (no need to Edit Schedule). Laboratory Rooms → same date → room (e.g. Pharmaceutical Lab 1) is green. |
| 5 | Click green room → details show experiment, prof, student, **start time**, **end time**, Request ID. |

Kung lahat ng step above pumasa, **pwede na mag-test from request to room assignments** end-to-end.
