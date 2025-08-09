# Timeline Component

## 📌 Description

This project implements an **interactive timeline component** in React for visualizing events in **compact horizontal lanes**, with support for **zooming, drag-and-drop date adjustments, event movement, and inline name editing**.  

It was developed based on the "Airtable timeline assignment" specification, using the provided `assignLanes.js` file as the basis for lane allocation.

---

## ✅ Implemented Features

### **Required**
- **Render items in compact lanes**
  - Uses the `assignLanes` algorithm to optimize vertical usage, avoiding unnecessary overlaps.
  - If an item ends before another starts, they can share the same lane.
- **Support for `YYYY-MM-DD` dates**
  - Dates are converted to `Date` objects only for position and width calculations.
- **Proportional scale**
  - Each day is rendered proportionally in pixels (`pxPerDay`).
- **Header with daily ticks**
  - Renders date labels for each day in the range.
- **Visual separation for the "gutter" (left column)**

### **Extra Features**
- **Zoom with Ctrl/Cmd + scroll**
  - Focuses on the cursor point during zoom, preserving relative position.
  - Configurable limits (`min: 8px/day`, `max: 160px/day`).
- **Drag-and-drop**
  - Resize the start (**resize start**) and end (**resize end**) dates.
  - Move the entire event (**move**) with day snapping.
- **Inline event name editing**
  - Double-click an event to edit its name.
  - `Enter` confirms, `Esc` cancels, `Blur` confirms automatically.
- **"Today" indicator**
  - Vertical line highlighting the current date.
- **Smooth horizontal scrolling**
  - Header synchronized with scroll.

---

## 🛠 Design Decisions

- **Lane calculation**  
  Used `assignLanes` to map items into lanes based on start and end dates, avoiding overlaps.  
- **Scale in `px/day` with progressive zoom**  
  Kept zoom continuous but limited to avoid extreme distortions.
- **Fluid drag with real-time updates**  
  Updates item state during movement to provide immediate visual feedback.
- **Fixed gutter**  
  Reserved a fixed space on the left (`GUTTER = 180px`) for readability and to avoid cutting the start of events.
- **Separation of concerns**  
  - Parsing functions (`parseYmd`, `toYmd`) are isolated.
  - `toLaneArrays` ensures the final rendering structure is always `Array<Array<Item>>`.

---

## 💡 What I liked about the implementation
- Smooth interactivity (zoom, drag, and editing work seamlessly together).
- Organized and readable code with proper use of React hooks.
- Flexible to handle different time ranges.
- Maintains a good user experience even with many events.

---

## 🔄 What I would change if I did it again
- Implement **zoom in/out buttons (+/-)** and **zoom reset** for accessibility.
- Create **visual snapping** (vertical guide lines when resizing/moving).
- Add **keyboard support** for navigation and editing.
- Implement **commit-on-drop** to avoid multiple `onChangeItem` calls during drag.

---

## 🧪 How I would test with more time
1. **Unit tests**
   - Date conversion functions (`parseYmd`, `toYmd`).
   - Position calculation (`leftFor`, `widthFor`).
   - Lane distribution (`assignLanes`).
2. **Integration tests**
   - Drag-and-drop flows (move, resize start/end).
   - Zoom while preserving relative position.
   - Inline name editing.
3. **Performance tests**
   - Rendering with a large dataset (> 500 items).
4. **Accessibility tests**
   - ARIA roles for screen readers.
   - Full keyboard navigation support.

---

## 📂 Structure
src/
├─ Timeline.jsx # Main timeline component
├─ assignLanes.js # Lane allocation function
├─ timelineItems.js # Sample data
├─ index.js # App entry point
└─ styles.css # Base styles


---

## 🚀 Running the Project

```bash
# Install dependencies
npm install

# Start development server
npm start
```

The app will automatically open in your default browser, rendering the sample data from timelineItems.js.

---

📅 Example

Overview <img width="1819" height="736" alt="image" src="https://github.com/user-attachments/assets/5d6677e6-41d7-4b58-accc-6ac5b0dd4924" />
Editing <img width="1882" height="586" alt="image" src="https://github.com/user-attachments/assets/2e072638-9761-423e-bfa6-22ba76e320a7" />
Drag left and right <img width="1876" height="671" alt="image" src="https://github.com/user-attachments/assets/5b4bac82-2ffe-4b5c-b448-f9d1eef0f76d" />
Drag all block trough timeline <img width="1912" height="645" alt="image" src="https://github.com/user-attachments/assets/dbc15e28-d195-46af-b47d-15329d6554d0" />

---

📜 License

This project was developed for technical evaluation purposes.




