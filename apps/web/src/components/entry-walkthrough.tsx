"use client";

import { useState } from "react";

const steps = [
  { label: "Crew", title: "Bring your crew together", description: "The manager invites dancers. Each dancer accepts using their own account.", rows: [["Crew profile", "Created"], ["Dancer invitations", "Awaiting acceptance"], ["Performing roster", "Choose your dancers"]] },
  { label: "Entry", title: "See what still needs attention", description: "Prepare the requirements for your chosen event before sending your entry for review.", rows: [["Performing roster", "Selected"], ["Requested evidence", "Needs attention"], ["Music submission", "Not yet provided"]] },
  { label: "Review", title: "Follow the next action", description: "Your chapter team reviews the entry. Submission and payment are separate from approval.", rows: [["Entry", "Submitted for review"], ["Chapter decision", "Pending"], ["Payment", "Check event instructions"]] },
] as const;

export function EntryWalkthrough() {
  const [selected, setSelected] = useState(0);
  const step = steps[selected];
  return <div className="entry-walkthrough" aria-label="Entry workflow example">
    <p className="walkthrough-caption">Explore an example · nothing is saved</p>
    <div className="walkthrough-controls" role="group" aria-label="Choose an example stage">
      {steps.map((item, index) => <button key={item.label} type="button" aria-pressed={selected === index} aria-controls="walkthrough-panel" onClick={() => setSelected(index)}>{index + 1}. {item.label}</button>)}
    </div>
    <div id="walkthrough-panel" aria-live="polite" aria-atomic="true" className="walkthrough-panel">
      <h3>{step.title}</h3><p>{step.description}</p>
      <dl>{step.rows.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
    </div>
  </div>;
}
