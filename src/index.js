import React, { useState } from "react";
import ReactDOM from "react-dom/client";
import Timeline from "./Timeline.jsx";
import timelineItems from "./timelineItems";
import "./app.css";

function App() {
  const [data, setData] = useState(timelineItems);


  const viewportStart = data.reduce((min, i) => (i.start < min ? i.start : min), data[0].start);
  const viewportEnd   = data.reduce((max, i) => (i.end   > max ? i.end   : max), data[0].end);

  const updateItem = (u) => setData(prev => prev.map(x => (x.id === u.id ? u : x)));

  return (
    <div style={{ height: "100vh", padding: 8 }}>
      <h2>Good luck with your assignment! {"\u2728"}</h2>
      <h3>{data.length} timeline items to render</h3>

      <Timeline
        items={data}
        viewportStart={viewportStart}
        viewportEnd={viewportEnd}
        onChangeItem={updateItem}
      />
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
