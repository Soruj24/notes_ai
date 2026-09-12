"use client";

import { useEffect, useState } from "react";
import { usePermissions } from "@/src/components/auth/Can";
import type { PlatformRole } from "@/src/lib/rbac/roles";
import { AgentSection } from "./AgentSection";
import { ConfigurationSection } from "./ConfigurationSection";
import { ErrorsSection } from "./ErrorsSection";
import { LimitsSection } from "./LimitsSection";
import { ModelsSection } from "./ModelsSection";
import { OverviewSection } from "./OverviewSection";
import { PromptsSection } from "./PromptsSection";
import { ProvidersSection } from "./ProvidersSection";
import { ToolsSection } from "./ToolsSection";
import { UsageSection } from "./UsageSection";
import { useAdminFetch } from "./useAdminFetch";
import type { AIOverview, ConfigEntry } from "./types";
import { cx } from "@/src/lib/utils/cx";

const GROUPS: Array<{
  label: string;
  sections: Array<{ id: string; label: string }>;
}> = [
  { label: "Status", sections: [{ id: "ai-overview", label: "Overview" }] },
  {
    label: "Setup",
    sections: [
      { id: "ai-providers", label: "Providers" },
      { id: "ai-models", label: "Models" },
      { id: "ai-agent", label: "Agent" },
      { id: "ai-tools", label: "Tools" },
      { id: "ai-prompts", label: "Prompts" },
      { id: "ai-configuration", label: "Configuration" },
    ],
  },
  {
    label: "Operations",
    sections: [
      { id: "ai-usage", label: "Usage" },
      { id: "ai-limits", label: "Limits" },
      { id: "ai-errors", label: "Errors" },
    ],
  },
];

const ALL_IDS = GROUPS.flatMap((g) => g.sections.map((s) => s.id));

/**
 * AI Control Center. Every section reads its own server API; all writes
 * go through validated, audited config endpoints. Secrets never reach
 * the browser (presence flags only).
 */
export function AIControlCenter({ role }: { role: PlatformRole | null }) {
  const { can } = usePermissions(role);
  const access = {
    canConfigure: can("ai.configure"),
    canDisable: can("ai.disable"),
    isSuperadmin: role === "SUPER_ADMIN",
  };

  const config = useAdminFetch<{ entries: ConfigEntry[] }>("/api/admin/ai/config");
  const overview = useAdminFetch<AIOverview>("/api/admin/ai/overview");
  const entries = config.data?.entries ?? [];

  const [active, setActive] = useState<string>("ai-overview");

  // Highlight the section currently in view. Observer only — links remain
  // plain anchors, so keyboard and no-JS behavior is unchanged.
  useEffect(() => {
    const observer = new IntersectionObserver(
      (records) => {
        for (const record of records) {
          if (record.isIntersecting) setActive(record.target.id);
        }
      },
      { rootMargin: "-30% 0px -60% 0px" },
    );
    for (const id of ALL_IDS) {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, []);

  return (
    <div className="grid content-start gap-4 sm:gap-5">
      <nav
        aria-label="AI sections"
        className="sticky top-14 z-20 -mx-1 rounded-xl border border-zinc-200/90 bg-white/90 px-2 py-2 shadow-[0_1px_2px_rgb(0_0_0/0.05)] backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/90 dark:shadow-none"
      >
        <div className="flex items-center gap-4 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {GROUPS.map((group, gi) => (
            <div key={group.label} className="flex shrink-0 items-center gap-1.5">
              {gi > 0 ? (
                <span aria-hidden="true" className="mr-1 h-5 w-px bg-zinc-200 dark:bg-zinc-800" />
              ) : null}
              <span className="hidden text-[10px] font-semibold tracking-[0.08em] text-zinc-400 uppercase xl:inline dark:text-zinc-500">
                {group.label}
              </span>
              {group.sections.map((s) => {
                const selected = active === s.id;
                return (
                  <a
                    key={s.id}
                    href={`#${s.id}`}
                    aria-current={selected ? "true" : undefined}
                    className={cx(
                      "rounded-lg px-2.5 py-1.5 text-xs font-medium whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500",
                      selected
                        ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                        : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-white/[0.06] dark:hover:text-zinc-100",
                    )}
                  >
                    {s.label}
                  </a>
                );
              })}
            </div>
          ))}
        </div>
      </nav>

      <div id="ai-overview" className="scroll-mt-32">
        <OverviewSection canDisable={access.canDisable} onChanged={() => overview.retry()} />
      </div>
      <section aria-label="Setup" className="grid content-start gap-4 sm:gap-5">
        <div className="flex items-center gap-2">
          <h2 className="text-xs font-semibold tracking-[0.08em] text-zinc-400 uppercase dark:text-zinc-500">
            Setup
          </h2>
          <span aria-hidden="true" className="h-px flex-1 bg-zinc-200/70 dark:bg-zinc-800" />
        </div>
        <div id="ai-providers" className="scroll-mt-32">
          <ProvidersSection
            access={access}
            entries={entries}
            entriesLoading={config.loading && entries.length === 0}
            onChanged={config.retry}
          />
        </div>
        <div id="ai-models" className="scroll-mt-32">
          <ModelsSection canConfigure={access.canConfigure} onChanged={config.retry} />
        </div>
        <div id="ai-agent" className="scroll-mt-32">
          <AgentSection
            access={access}
            entries={entries}
            entriesLoading={config.loading && entries.length === 0}
            onChanged={config.retry}
          />
        </div>
        <div id="ai-tools" className="scroll-mt-32">
          <ToolsSection canConfigure={access.canConfigure} onChanged={config.retry} />
        </div>
        <div id="ai-prompts" className="scroll-mt-32">
          <PromptsSection
            canConfigure={access.canConfigure}
            entries={entries}
            entriesLoading={config.loading && entries.length === 0}
            onChanged={config.retry}
          />
        </div>
        <div id="ai-configuration" className="scroll-mt-32">
          <ConfigurationSection
            access={access}
            entries={entries}
            entriesLoading={config.loading && entries.length === 0}
            onChanged={config.retry}
          />
        </div>
      </section>
      <section aria-label="Operations" className="grid content-start gap-4 sm:gap-5">
        <div className="flex items-center gap-2">
          <h2 className="text-xs font-semibold tracking-[0.08em] text-zinc-400 uppercase dark:text-zinc-500">
            Operations
          </h2>
          <span aria-hidden="true" className="h-px flex-1 bg-zinc-200/70 dark:bg-zinc-800" />
        </div>
        <div id="ai-usage" className="scroll-mt-32">
          <UsageSection />
        </div>
        <div id="ai-limits" className="scroll-mt-32">
          <LimitsSection
            access={access}
            entries={entries}
            entriesLoading={config.loading && entries.length === 0}
            enabled={overview.data?.enabled ?? null}
            onChanged={() => {
              config.retry();
              overview.retry();
            }}
          />
        </div>
        <div id="ai-errors" className="scroll-mt-32">
          <ErrorsSection />
        </div>
      </section>
    </div>
  );
}
