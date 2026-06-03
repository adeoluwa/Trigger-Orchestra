"use client";

import { useEffect, useState } from "react";
import { Workflow } from "lucide-react";

const STEPS = [
  { delay: 0,    icon: "$",  text: "trigger deploy my-app --provider railway",  color: "text-zinc-400" },
  { delay: 600,  icon: "→",  text: "Connecting to Railway...",                   color: "text-zinc-400" },
  { delay: 1200, icon: "✓",  text: "Connection established",                     color: "text-sky-400" },
  { delay: 1800, icon: "→",  text: "Building Docker image...",                   color: "text-zinc-400" },
  { delay: 3200, icon: "✓",  text: "Image built  (11.4s)",                       color: "text-sky-400" },
  { delay: 3800, icon: "→",  text: "Pushing to registry...",                     color: "text-zinc-400" },
  { delay: 5000, icon: "✓",  text: "Pushed to registry  (3.8s)",                 color: "text-sky-400" },
  { delay: 5500, icon: "→",  text: "Running database migrations...",             color: "text-zinc-400" },
  { delay: 6800, icon: "✓",  text: "Migrations complete  (1.2s)",                color: "text-sky-400" },
  { delay: 7200, icon: "→",  text: "Deploying to production...",                 color: "text-zinc-400" },
  { delay: 8600, icon: "✓",  text: "Health check passed",                        color: "text-sky-400" },
  { delay: 9000, icon: "🚀", text: "Deployed in 24s  →  my-app.railway.app",    color: "text-sky-300 font-semibold" },
];

const LOOP_DELAY = 12000;

export function DeployAnimation() {
  const [visibleCount, setVisibleCount] = useState(0);

  useEffect(() => {
    let timeouts: ReturnType<typeof setTimeout>[] = [];

    function startCycle() {
      setVisibleCount(0);
      STEPS.forEach((step, i) => {
        const t = setTimeout(() => setVisibleCount(i + 1), step.delay);
        timeouts.push(t);
      });
      const loop = setTimeout(() => {
        timeouts = [];
        startCycle();
      }, LOOP_DELAY);
      timeouts.push(loop);
    }

    startCycle();
    return () => timeouts.forEach(clearTimeout);
  }, []);

  const activeStep = STEPS[visibleCount - 1];
  const isRunning = activeStep && (activeStep.icon === "→" || activeStep.icon === "$");

  return (
    <div className="flex flex-col h-full p-10 gap-8 select-none">
      {/* Brand */}
      <div className="flex items-center gap-2.5">
        <Workflow className="size-6 text-sky-400" />
        <span className="text-lg font-bold tracking-tight text-white">Trigger Orchestra</span>
      </div>

      {/* Headline */}
      <div className="flex-1 flex flex-col justify-center gap-4">
        <h2 className="text-3xl font-bold text-white leading-snug">
          Deploy with <span className="text-sky-400">confidence.</span>
          <br />One command, any platform.
        </h2>
        <p className="text-zinc-400 text-sm leading-relaxed max-w-xs">
          Orchestrate deployments across Railway, Render, and more — with live logs, secret management, and GitHub OAuth built in.
        </p>
      </div>

      {/* Terminal */}
      <div className="rounded-xl border border-white/10 bg-black/60 backdrop-blur overflow-hidden">
        {/* Traffic lights */}
        <div className="flex items-center gap-1.5 px-4 py-3 border-b border-white/10">
          <span className="size-3 rounded-full bg-zinc-700" />
          <span className="size-3 rounded-full bg-zinc-700" />
          <span className="size-3 rounded-full bg-zinc-700" />
          <span className="ml-auto text-xs text-zinc-500 font-mono">trigger-cli</span>
          <span
            className={`size-2 rounded-full ml-2 transition-colors duration-300 ${
              isRunning ? "bg-sky-400 animate-pulse" : "bg-zinc-600"
            }`}
          />
        </div>

        {/* Log lines */}
        <div className="p-4 font-mono text-xs space-y-1.5 min-h-52">
          {STEPS.slice(0, visibleCount).map((step, i) => (
            <div
              key={i}
              className={`flex gap-2.5 items-start animate-in fade-in slide-in-from-bottom-1 duration-300 ${step.color}`}
            >
              <span className="shrink-0 w-4 text-center">{step.icon}</span>
              <span>{step.text}</span>
            </div>
          ))}
          {isRunning && (
            <div className="flex gap-1 pl-6 pt-0.5">
              {[0, 150, 300].map((d) => (
                <span
                  key={d}
                  className="size-1 rounded-full bg-sky-400 animate-bounce"
                  style={{ animationDelay: `${d}ms` }}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4 text-center">
        {[
          { label: "Deployments today", value: "12" },
          { label: "Success rate", value: "99.2%" },
          { label: "Avg deploy time", value: "28s" },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-lg bg-white/5 border border-white/10 py-3 px-2">
            <p className="text-sky-400 font-bold text-lg">{value}</p>
            <p className="text-zinc-500 text-xs mt-0.5">{label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
