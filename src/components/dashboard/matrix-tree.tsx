import { useState } from "react";
import { List, GitBranch } from "lucide-react";

import type { MatrixNode } from "@/lib/membership.functions";

function NodeCard({ node }: { node: MatrixNode }) {
  return (
    <div
      className={
        node.active
          ? "node-glow min-w-[8.5rem] rounded-2xl border border-primary/50 bg-primary-soft/40 px-4 py-3 text-center"
          : "min-w-[8.5rem] rounded-2xl border border-border bg-card/60 px-4 py-3 text-center"
      }
    >
      <p className="truncate text-sm font-bold text-foreground">@{node.username}</p>
      <p className="mt-1 text-[11px] text-muted-foreground">
        {node.active ? "Active" : "Inactive"} • L{node.level}
      </p>
    </div>
  );
}

function Slot({ slot }: { slot: "left" | "right" }) {
  return (
    <div className="min-w-[8.5rem] rounded-2xl border border-dashed border-border/70 bg-background/30 px-4 py-3 text-center">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Open</p>
      <p className="mt-1 text-[11px] capitalize text-muted-foreground">{slot} slot</p>
    </div>
  );
}

function Connector() {
  return (
    <span
      aria-hidden
      className="block h-6 w-px bg-gradient-to-b from-primary/70 to-primary/10 shadow-[0_0_8px_0_var(--primary)]"
    />
  );
}

function Branch({ node, remaining }: { node: MatrixNode; remaining: number }) {
  const left = node.children.find((c) => c.slot === "left");
  const right = node.children.find((c) => c.slot === "right");

  return (
    <div className="flex flex-col items-center">
      <NodeCard node={node} />
      {remaining > 0 && (
        <>
          <Connector />
          <div className="flex items-start gap-4 border-t border-primary/25 pt-6">
            {(["left", "right"] as const).map((slot) => {
              const child = slot === "left" ? left : right;
              return (
                <div key={slot} className="flex flex-col items-center">
                  {child ? (
                    remaining > 1 ? (
                      <Branch node={child} remaining={remaining - 1} />
                    ) : (
                      <NodeCard node={child} />
                    )
                  ) : (
                    <Slot slot={slot} />
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

function flatten(node: MatrixNode, out: MatrixNode[] = []) {
  out.push(node);
  node.children.forEach((child) => flatten(child, out));
  return out;
}

export function MatrixTree({ root, levels = 3 }: { root: MatrixNode; levels?: number | undefined }) {
  const [view, setView] = useState<"graph" | "list">("graph");
  const rows = flatten(root);

  return (
    <div>
      <div className="mb-4 inline-flex rounded-full border border-border bg-background/50 p-1">
        {(
          [
            { key: "graph", label: "Node graph", icon: GitBranch },
            { key: "list", label: "List", icon: List },
          ] as const
        ).map((option) => (
          <button
            key={option.key}
            type="button"
            onClick={() => setView(option.key)}
            aria-pressed={view === option.key}
            className={
              view === option.key
                ? "flex items-center gap-2 rounded-full bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground"
                : "flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold text-muted-foreground"
            }
          >
            <option.icon className="size-3.5" /> {option.label}
          </button>
        ))}
      </div>

      {view === "graph" ? (
        <div className="overflow-x-auto pb-2">
          <div className="min-w-max px-2">
            <Branch node={root} remaining={levels} />
          </div>
        </div>
      ) : (
        <ul className="divide-y divide-border">
          {rows.map((node) => (
            <li key={node.positionId} className="flex items-center justify-between gap-3 py-3">
              <span className="flex min-w-0 items-center gap-3">
                <span
                  className={
                    node.active
                      ? "node-glow size-2.5 shrink-0 rounded-full bg-primary"
                      : "size-2.5 shrink-0 rounded-full border border-border"
                  }
                />
                <span className="truncate text-sm font-medium text-foreground">
                  @{node.username}
                </span>
              </span>
              <span className="figure-num shrink-0 text-xs text-muted-foreground">
                L{node.level} • {node.slot ?? "root"}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
