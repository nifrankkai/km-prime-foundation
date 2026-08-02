import type { MatrixNode } from "@/lib/membership.functions";

function Slot({ node, slot }: { node: MatrixNode | undefined; slot: "left" | "right" }) {
  if (!node) {
    return (
      <div className="min-w-[8.5rem] rounded-xl border border-dashed border-border bg-secondary/40 px-4 py-3 text-center">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Open</p>
        <p className="mt-1 text-[11px] capitalize text-muted-foreground">{slot} slot</p>
      </div>
    );
  }
  return <NodeCard node={node} />;
}

function NodeCard({ node }: { node: MatrixNode }) {
  return (
    <div
      className={
        node.active
          ? "min-w-[8.5rem] rounded-xl border border-primary/30 bg-primary-soft/60 px-4 py-3 text-center shadow-soft"
          : "min-w-[8.5rem] rounded-xl border border-border bg-card px-4 py-3 text-center shadow-soft"
      }
    >
      <p className="truncate text-sm font-bold text-foreground">@{node.username}</p>
      <p className="mt-1 text-[11px] text-muted-foreground">
        {node.active ? "Active" : "Inactive"} • L{node.level}
      </p>
    </div>
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
          <span className="h-5 w-px bg-border" />
          <div className="flex items-start gap-4 border-t border-border pt-5">
            <div className="flex flex-col items-center">
              {left && remaining > 1 ? (
                <Branch node={left} remaining={remaining - 1} />
              ) : (
                <Slot node={left} slot="left" />
              )}
            </div>
            <div className="flex flex-col items-center">
              {right && remaining > 1 ? (
                <Branch node={right} remaining={remaining - 1} />
              ) : (
                <Slot node={right} slot="right" />
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export function MatrixTree({ root, levels = 3 }: { root: MatrixNode; levels?: number }) {
  return (
    <div className="overflow-x-auto pb-2">
      <div className="min-w-max px-2">
        <Branch node={root} remaining={levels} />
      </div>
    </div>
  );
}
