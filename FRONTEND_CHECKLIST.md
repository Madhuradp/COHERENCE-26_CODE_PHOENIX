# Frontend Development Checklist - COHERENCE-26

Use this checklist when building or updating frontend pages to ensure consistent UX quality.

---

## 📋 Before You Start

- [ ] Page has a clear purpose (what is the user doing?)
- [ ] Page fits into the main navigation (sidebar or breadcrumbs)
- [ ] Page follows the layout: TopNavbar + Sidebar + Main content
- [ ] You're using existing components (don't create new ones)
- [ ] Color scheme is purple/orange/red (no custom colors)

---

## 💾 Data Fetching & States

### Loading State
- [ ] Show spinner while data loads (use `SystemStatus` with `type="loading"`)
- [ ] Display loading message: "Loading..." or "Fetching data..."
- [ ] Don't render empty content while loading (show skeleton or spinner)
- [ ] Timeout after 30s with error message

### Error State
- [ ] Catch errors from API calls
- [ ] Display error alert (use `Alert` with `variant="error"`)
- [ ] Show error message (not just "Error occurred")
- [ ] Provide retry button with `onClick` handler
- [ ] Don't show loading state on retry (show spinner instead)

### Empty State
- [ ] Check if data array is empty
- [ ] Show `EmptyState` component (not blank page)
- [ ] Provide helpful action button (e.g., "Upload" or "Create")
- [ ] Use relevant icon (Users, Plus, Search, etc.)
- [ ] Don't show "No results" and nothing else

### Success State
- [ ] Render data in table/list
- [ ] Show pagination if > 50 items
- [ ] Allow sorting/filtering if useful
- [ ] Show item count ("15 patients")

---

## 🔘 Buttons & Actions

### All Buttons Must Have
- [ ] Clear text label (not just icon)
- [ ] Icon if helpful (e.g., trash for delete)
- [ ] Proper variant (primary, secondary, danger)
- [ ] Disabled state during processing
- [ ] Loading spinner while processing
- [ ] Hover effect (visual feedback)
- [ ] Tooltips for complex actions

### Destructive Actions (Delete/Remove)
- [ ] Red/danger colored button
- [ ] Confirmation dialog before action
- [ ] Clear warning message
- [ ] "Are you sure?" language
- [ ] Cancel button with safe default
- [ ] Loading state during deletion
- [ ] Success message after deletion
- [ ] Auto-refresh list after deletion

### Primary Actions (Create/Search/Match)
- [ ] Purple colored button
- [ ] Clear action label
- [ ] Loading spinner while processing
- [ ] Success message on completion
- [ ] Error message on failure
- [ ] Progress bar for long operations
- [ ] Auto-refresh results

---

## 🎨 Forms & Input

- [ ] All inputs have labels
- [ ] Placeholder text is helpful (example, not instructions)
- [ ] Required fields marked with * or "Required"
- [ ] Error messages are specific ("Email is required" not "Invalid input")
- [ ] Success feedback on form submission
- [ ] Loading state on submit button
- [ ] Validation happens before submit
- [ ] Clear form after successful submission
- [ ] Disabled submit button while processing

---

## 📊 Tables & Lists

- [ ] Columns have clear headers
- [ ] Data is sortable if useful
- [ ] Clickable rows highlight on hover
- [ ] Checkbox select for bulk actions
- [ ] Action buttons (edit, delete) visible
- [ ] Delete button opens confirmation
- [ ] Pagination if > 50 items
- [ ] "No results" shows empty state
- [ ] Loading skeleton while fetching
- [ ] Table shows item count ("Showing 1-15 of 47")

---

## 📱 Mobile Responsiveness

- [ ] Test on mobile (< 640px width)
- [ ] Single column layout on mobile
- [ ] Touch-friendly buttons (44x44px min)
- [ ] Readable text (16px+ on mobile)
- [ ] Modals fill screen width (with margins)
- [ ] Hamburger menu for navigation
- [ ] Forms stack vertically
- [ ] Tables scroll horizontally if needed
- [ ] No horizontal scroll on page

---

## 🎯 User Feedback

### After Every Action
- [ ] User sees immediate visual feedback
- [ ] Action shows loading state
- [ ] Success or error message appears
- [ ] Data refreshes automatically
- [ ] Page scrolls to results/new data

### Error Messages
- [ ] Message explains what went wrong
- [ ] Message suggests how to fix it
- [ ] Retry button is available
- [ ] Error is not buried in technical jargon
- [ ] Support contact shown if needed

### Success Messages
- [ ] Confirmation that action completed
- [ ] Shows what was created/updated
- [ ] Auto-dismisses after 5 seconds
- [ ] Can manually dismiss (X button)
- [ ] Doesn't block other content

---

## 🔒 Safety & Confirmation

- [ ] Delete requires confirmation
- [ ] Confirmation shows what will be deleted
- [ ] Warning icon on delete confirmation
- [ ] Cancel button is available (safe default)
- [ ] No keyboard shortcuts for delete
- [ ] "Undo" option if available (via success message)
- [ ] Disabled buttons show why they're disabled

---

## ♿ Accessibility

- [ ] Page is keyboard navigable (Tab works)
- [ ] Focus outline visible on all interactive elements
- [ ] Buttons have proper `role` attributes
- [ ] Forms have associated labels (`<label for="...">`)
- [ ] Icons have `aria-label` or are inside `<button>`
- [ ] Color is not the only way to convey meaning
- [ ] Text contrast is readable (WCAG AA)
- [ ] Modals trap focus (Tab cycles through modal only)
- [ ] Escape key closes modals
- [ ] Skip navigation link available

---

## 🎨 Design Consistency

### Colors
- [ ] Primary actions use purple (#7C3AED)
- [ ] Secondary actions use gray
- [ ] Danger actions use red (#EF4444)
- [ ] Success messages use green (#22C55E)
- [ ] Warnings use orange (#F59E0B)
- [ ] Information uses blue (#3B82F6)
- [ ] Text uses gray-900 or gray-600

### Spacing
- [ ] Consistent padding in cards (24px)
- [ ] Consistent gap between sections (16px)
- [ ] Consistent gap in lists (8-12px)
- [ ] Bottom margin on headings (8px)
- [ ] Proper alignment (left-aligned text, centered modals)

### Typography
- [ ] Page title: text-2xl, font-bold, text-text-primary
- [ ] Section heading: text-lg, font-semibold
- [ ] Body text: text-sm, text-text-primary
- [ ] Helper text: text-xs, text-text-muted
- [ ] Consistent font family (inherit from root)

### Borders & Shadows
- [ ] Cards have subtle shadow (shadow-card)
- [ ] Hover effects use shadow or background change
- [ ] Borders use subtle gray (border-surface-border)
- [ ] Border radius: 8px (small), 12px (medium), 16px (large)

---

## 🔄 Data State Management

- [ ] Loading state managed with `useState`
- [ ] Error state managed with `useState`
- [ ] Data refreshed after mutations (delete, create, update)
- [ ] Optimistic UI updates considered (good UX)
- [ ] Cache invalidation clear and explicit
- [ ] No unnecessary re-renders (use `useCallback`)

---

## ⚡ Performance

- [ ] Page load time < 3 seconds
- [ ] Data fetching is not blocking UI
- [ ] Large lists are virtualized (or paginated)
- [ ] Images are optimized (WebP, correct size)
- [ ] No console warnings or errors
- [ ] No memory leaks (cleanup in useEffect)
- [ ] Animations are smooth (60fps)

---

## 🔗 Navigation & Flow

- [ ] Clear page title visible
- [ ] Breadcrumbs visible (if nested page)
- [ ] Back/Cancel button available
- [ ] Navigation matches user mental model
- [ ] Links are underlined or highlighted
- [ ] Active nav item highlighted in sidebar
- [ ] URLs are bookmarkable
- [ ] Browser back button works

---

## 📊 Example: Patient List Page

✅ **Complete Example**:

```tsx
"use client";

import { useState, useEffect } from "react";
import { SystemStatus } from "@/components/ui/SystemStatus";
import { Alert } from "@/components/ui/Alert";
import { EmptyState } from "@/components/ui/EmptyState";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Button } from "@/components/ui/Button";
import { Users, Plus, Trash2 } from "lucide-react";

export default function PatientsPage() {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // ✅ Data Fetching with states
  useEffect(() => {
    fetch("/api/patients")
      .then(r => r.json())
      .then(d => setPatients(d.data))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  // ✅ Delete with confirmation
  const handleDelete = async () => {
    setDeleting(true);
    try {
      await fetch(`/api/patients/${deleteId}`, { method: "DELETE" });
      setPatients(patients.filter(p => p._id !== deleteId));
      setDeleteId(null);
    } catch (err) {
      setError("Failed to delete patient. Try again.");
    } finally {
      setDeleting(false);
    }
  };

  // ✅ Loading State
  if (loading) {
    return (
      <SystemStatus
        type="loading"
        title="Loading Patients"
        message="Fetching your patient records..."
      />
    );
  }

  // ✅ Error State
  if (error) {
    return (
      <Alert
        variant="error"
        title="Failed to Load"
        message={error}
        actions={[{
          label: "Retry",
          onClick: () => window.location.reload(),
        }]}
      />
    );
  }

  // ✅ Empty State
  if (patients.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title="No Patients Yet"
        description="Upload your first patient dataset to start trial matching"
        action={{
          label: "Upload Patients",
          icon: Plus,
          onClick: () => { /* show upload modal */ }
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* ✅ Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Patients</h1>
          <p className="text-sm text-text-muted">
            Showing {patients.length} patient{patients.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Button icon={<Plus size={16} />}>Upload Patient</Button>
      </div>

      {/* ✅ Data Table */}
      <div className="bg-white rounded-xl shadow-card overflow-hidden">
        <table className="w-full">
          <thead className="bg-surface-muted border-b border-surface-border">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-text-primary">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-text-primary">
                Age
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-text-primary">
                Condition
              </th>
              <th className="px-6 py-3 text-right text-xs font-semibold text-text-primary">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-border">
            {patients.map(p => (
              <tr key={p._id} className="hover:bg-surface-muted transition-colors">
                <td className="px-6 py-4 text-sm text-text-primary">{p.display_id}</td>
                <td className="px-6 py-4 text-sm text-text-secondary">{p.age}</td>
                <td className="px-6 py-4 text-sm text-text-secondary">
                  {p.conditions?.[0]?.name || "N/A"}
                </td>
                <td className="px-6 py-4 text-right">
                  <button
                    onClick={() => setDeleteId(p._id)}
                    className="text-red-500 hover:bg-red-50 p-2 rounded transition-colors"
                    aria-label="Delete patient"
                  >
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ✅ Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!deleteId}
        variant="danger"
        title="Delete Patient?"
        description="This action cannot be undone. All associated matches will also be deleted."
        confirmText="Delete"
        cancelText="Keep"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}
```

---

## 🎯 Pre-Deployment Checklist

Before shipping a page:

- [ ] All states tested (loading, error, empty, success)
- [ ] Mobile responsive (test on small screen)
- [ ] Keyboard navigation works (Tab, Enter, Escape)
- [ ] No console errors or warnings
- [ ] Performance is good (< 3s load time)
- [ ] Dark mode works (if supported)
- [ ] All icons have labels or aria-labels
- [ ] Form validation works
- [ ] Error messages are clear
- [ ] Tested with different data (empty, many items, errors)

---

## 📞 Common Issues & Fixes

### Issue: Button stays loading after error
**Fix**: Always call `setLoading(false)` in error catch block
```tsx
try {
  // ...
} catch (err) {
  setError(err.message);
  setLoading(false); // ✅ Must do this
}
```

### Issue: Delete button triggers twice
**Fix**: Disable button or prevent double-click
```tsx
<button onClick={handleDelete} disabled={deleting}>
  Delete
</button>
```

### Issue: Modal closes when clicking outside
**Fix**: Prevent propagation or use proper modal
```tsx
<ConfirmDialog
  onCancel={() => setOpen(false)}
  // Click outside backdrop also calls onCancel (intentional)
/>
```

### Issue: Empty state and loading at same time
**Fix**: Check loading state first
```tsx
if (loading) return <SystemStatus type="loading" />;
if (error) return <Alert variant="error" />;
if (data.length === 0) return <EmptyState />;
return <DataList />;
```

---

## 📚 Component Library

Quick imports:
```tsx
// UI Components
import { Button } from "@/components/ui/Button";
import { Card, StatCard } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Table } from "@/components/ui/Table";

// New Components
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { SystemStatus } from "@/components/ui/SystemStatus";
import { Alert } from "@/components/ui/Alert";
import { EmptyState } from "@/components/ui/EmptyState";

// Layout
import { DashboardLayout } from "@/components/layout/DashboardLayout";

// Icons
import { Plus, Trash2, Check, AlertTriangle } from "lucide-react";
```

---

## ✨ Summary

Great pages have:
1. **Clear feedback** (loading, error, success)
2. **Safety** (confirmation before delete)
3. **Guidance** (empty states with actions)
4. **Consistency** (colors, spacing, typography)
5. **Accessibility** (keyboard, labels, contrast)
6. **Performance** (fast load, smooth interactions)

Use this checklist every time! 🚀

