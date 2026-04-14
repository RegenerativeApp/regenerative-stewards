"use client";

import { useEffect, useState } from "react";

function hourInTimeZone(timeZone: string, date = new Date()): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    hour12: false,
  }).formatToParts(date);
  const h = parts.find((p) => p.type === "hour")?.value;
  return h !== undefined ? parseInt(h, 10) : 12;
}

function timeOfDayLabel(
  hour: number,
): "Good morning" | "Good afternoon" | "Good evening" {
  if (hour >= 5 && hour < 12) return "Good morning";
  if (hour >= 12 && hour < 17) return "Good afternoon";
  return "Good evening";
}

export function TimeGreeting({ name }: { name: string }) {
  const [line, setLine] = useState(`Hello, ${name}`);

  useEffect(() => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const hour = hourInTimeZone(tz);
    setLine(`${timeOfDayLabel(hour)}, ${name}`);
  }, [name]);

  return (
    <h1 className="text-2xl font-semibold tracking-tight text-stone-800 md:text-3xl">
      {line}
    </h1>
  );
}
