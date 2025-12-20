"use client";

import { cn } from "@/lib/utils";

interface ShinyCardProps {
  children: React.ReactNode;
  className?: string;
  innerClassName?: string;
  noPadding?: boolean;
}

export function ShinyCard({ children, className, innerClassName, noPadding = false }: ShinyCardProps) {
  return (
    <div className={cn("relative rounded-xl overflow-hidden", className)}>
      {/* Outer glow/border effect */}
      <div className="absolute inset-0 rounded-xl bg-gradient-to-b from-[rgba(255,255,255,0.08)] via-[rgba(255,255,255,0.02)] to-transparent" />

      {/* Main card background */}
      <div className={cn(
        "relative m-[1px] rounded-[11px] bg-gradient-to-b from-[#161a1e] to-[#111417] shadow-[0px_4px_16px_0px_rgba(0,0,0,0.3)]",
        !noPadding && "p-[17px]",
        innerClassName
      )}>
        {/* Top highlight shine */}
        <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-[rgba(255,255,255,0.1)] to-transparent" />

        {/* Inner subtle gradient for depth */}
        <div className="absolute inset-0 bg-gradient-to-b from-white/[0.03] via-transparent to-black/[0.05] pointer-events-none rounded-[11px]" />

        <div className="relative">
          {children}
        </div>
      </div>
    </div>
  );
}
