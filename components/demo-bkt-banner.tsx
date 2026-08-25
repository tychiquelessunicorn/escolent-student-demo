"use client";

import { useEffect, useState } from "react";

/** Animated BKT mastery bar for investor-demo victory and completion screens. */
export function DemoBktBanner({
  skillName = "Variables on both sides",
  animate = true,
}: {
  skillName?: string;
  animate?: boolean;
}) {
  const [filled, setFilled] = useState(false);

  useEffect(() => {
    if (!animate) return;
    const id = window.setTimeout(() => setFilled(true), 120);
    return () => window.clearTimeout(id);
  }, [animate]);

  return (
    <div className="esc-ended-mastery">
      <div className="esc-ended-mastery-label">Mastery growth</div>
      <div className="esc-ended-mastery-skill">
        {skillName} · BKT mastery
      </div>
      <div className="esc-bkt-track">
        <div className={`esc-bkt-fill${filled ? " esc-bkt-fill-animate" : ""}`} />
      </div>
      <div className="esc-bkt-labels">
        <span>42%</span>
        <span>{filled ? "85%" : "42%"}</span>
      </div>
    </div>
  );
}
