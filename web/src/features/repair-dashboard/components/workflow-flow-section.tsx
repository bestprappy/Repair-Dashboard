"use client";

import { useMemo, useState } from "react";

import { AlertTriangle, GitBranch } from "lucide-react";

import { ChartCard, SectionHeading } from "@/components/chart-card";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group";

import type {
  WorkflowFlow,
  WorkflowFlowBranch,
  WorkflowFlowMode,
  WorkflowFlows,
} from "../lib/workflow-flow";

interface WorkflowFlowSectionProps {
  flows: WorkflowFlows;
}

interface FlowRibbon {
  branch: WorkflowFlowBranch;
  color: string;
  sourceTop: number;
  sourceBottom: number;
  targetTop: number;
  targetBottom: number;
}

interface FlowLayout {
  sourceTop: number;
  sourceBottom: number;
  ribbons: FlowRibbon[];
}

const FLOW_WIDTH = 1000;
const FLOW_HEIGHT = 280;
const SOURCE_X = 124;
const SOURCE_WIDTH = 14;
const TARGET_X = 810;
const TARGET_WIDTH = 14;
const FLOW_TOP = 18;
// Outcome labels use two text lines. Keep branch centers far enough apart even
// when several outcomes have very small ribbon heights beside one dominant
// branch (otherwise PASS / NOT PASS / CLAIM labels collide).
const BRANCH_GAP = 44;

const FLOW_COLORS: Record<string, string> = {
  source: "var(--primary)",
  ongoing: "var(--warning)",
  pass: "var(--success)",
  notPass: "var(--error)",
  claim: "var(--info)",
  outputClaim: "var(--info)",
};

/** Shared lifecycle section shown on the all-company and company dashboards. */
export function WorkflowFlowSection({ flows }: WorkflowFlowSectionProps) {
  const [mode, setMode] = useState<WorkflowFlowMode>("repair");
  const flow = flows[mode];
  const subtitle =
    mode === "repair"
      ? "Repair inputs split into open work and their paired output outcomes."
      : "Claim inputs split into completed claim outputs and open work.";

  return (
    <section className="mb-10">
      <SectionHeading>Input to output flow</SectionHeading>
      <ChartCard
        title={`${flow.input.label} lifecycle`}
        subtitle={subtitle}
        height={330}
        action={
          <ToggleGroup
            value={[mode]}
            onValueChange={(value) => {
              const next = value[0] as WorkflowFlowMode | undefined;
              if (next) setMode(next);
            }}
            variant="outline"
            size="sm"
            spacing={0}
            aria-label="Choose workflow"
          >
            <ToggleGroupItem value="repair" aria-label="Show repair flow">
              Repair
            </ToggleGroupItem>
            <ToggleGroupItem value="claim" aria-label="Show claim flow">
              Claim
            </ToggleGroupItem>
          </ToggleGroup>
        }
      >
        <WorkflowFlowDiagram flow={flow} />
      </ChartCard>
    </section>
  );
}

function WorkflowFlowDiagram({ flow }: { flow: WorkflowFlow }) {
  const layout = useMemo(() => buildFlowLayout(flow), [flow]);
  const ariaSummary = `${flow.input.label} input: ${flow.sourceTotal.toLocaleString()} records. ${flow.branches
    .map((branch) => `${branch.label}: ${branch.count.toLocaleString()}`)
    .join("; ")}.`;

  if (!flow.availability.available) {
    return (
      <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-border bg-muted/20 px-6 text-center">
        <div className="max-w-md">
          <span className="mx-auto mb-3 flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <GitBranch className="size-5" aria-hidden="true" />
          </span>
          <p className="text-sm font-semibold text-foreground">
            {flow.input.label} flow unavailable
          </p>
          <p className="mt-1.5 text-xs leading-5 text-muted-foreground">
            {flow.availability.reason}
          </p>
        </div>
      </div>
    );
  }

  if (flow.classifiedTotal === 0) {
    return (
      <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-border bg-muted/20 px-6 text-center">
        <div className="max-w-md">
          <span className="mx-auto mb-3 flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <GitBranch className="size-5" aria-hidden="true" />
          </span>
          <p className="text-sm font-semibold text-foreground">
            No classified {flow.input.label.toLowerCase()} flow
          </p>
          <p className="mt-1.5 text-xs leading-5 text-muted-foreground">
            The inputs in this reporting scope do not have any of the requested
            output outcomes.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="min-h-0 flex-1 overflow-x-auto">
        <div className="h-full min-w-[620px]">
          <svg
            className="h-full w-full"
            viewBox={`0 0 ${FLOW_WIDTH} ${FLOW_HEIGHT}`}
            preserveAspectRatio="xMidYMid meet"
            role="img"
            aria-label={ariaSummary}
          >
            <title>{ariaSummary}</title>
            {layout.ribbons.map((ribbon) => (
              <FlowRibbonShape
                key={ribbon.branch.id}
                ribbon={ribbon}
                sourceName={`${flow.input.label} input`}
              />
            ))}
            <FlowSourceNode flow={flow} layout={layout} />
            {layout.ribbons.map((ribbon) => (
              <FlowTargetNode key={ribbon.branch.id} ribbon={ribbon} />
            ))}
          </svg>
          <ul className="sr-only">
            {flow.branches.map((branch) => (
              <li key={branch.id}>
                {branch.label}: {branch.count.toLocaleString()} records
              </li>
            ))}
          </ul>
        </div>
      </div>
      {flow.unclassifiedCount > 0 ? (
        <p className="mt-2 flex items-start gap-1.5 text-[11px] leading-4 text-muted-foreground">
          <AlertTriangle
            className="mt-0.5 size-3.5 shrink-0 text-warning"
            aria-hidden="true"
          />
          {flow.unclassifiedCount.toLocaleString()} matched repair output
          {flow.unclassifiedCount === 1 ? " is" : "s are"} outside PASS, NOT
          PASS, and CLAIM, so {flow.unclassifiedCount === 1 ? "it is" : "they are"}
          {" "}not shown as another branch.
        </p>
      ) : null}
    </div>
  );
}

function buildFlowLayout(flow: WorkflowFlow): FlowLayout {
  const visibleBranches = flow.branches.filter((branch) => branch.count > 0);
  const totalGap = BRANCH_GAP * Math.max(visibleBranches.length - 1, 0);
  const ribbonArea = FLOW_HEIGHT - FLOW_TOP * 2 - totalGap;
  const scale = ribbonArea / flow.classifiedTotal;
  const sourceTop = (FLOW_HEIGHT - ribbonArea) / 2;
  let sourceCursor = sourceTop;
  let targetCursor = FLOW_TOP;

  const ribbons = visibleBranches.map((branch) => {
    const height = branch.count * scale;
    const ribbon: FlowRibbon = {
      branch,
      color: branchColor(branch),
      sourceTop: sourceCursor,
      sourceBottom: sourceCursor + height,
      targetTop: targetCursor,
      targetBottom: targetCursor + height,
    };
    sourceCursor += height;
    targetCursor += height + BRANCH_GAP;
    return ribbon;
  });

  return { sourceTop, sourceBottom: sourceCursor, ribbons };
}

function branchColor(branch: WorkflowFlowBranch): string {
  return FLOW_COLORS[branch.id] ?? "var(--muted-foreground)";
}

function FlowRibbonShape({
  ribbon,
  sourceName,
}: {
  ribbon: FlowRibbon;
  sourceName: string;
}) {
  const sourceRight = SOURCE_X + SOURCE_WIDTH;
  const sourceControl = 360;
  const targetControl = 590;
  const path = [
    `M${sourceRight},${ribbon.sourceTop}`,
    `C${sourceControl},${ribbon.sourceTop} ${targetControl},${ribbon.targetTop} ${TARGET_X},${ribbon.targetTop}`,
    `L${TARGET_X},${ribbon.targetBottom}`,
    `C${targetControl},${ribbon.targetBottom} ${sourceControl},${ribbon.sourceBottom} ${sourceRight},${ribbon.sourceBottom}`,
    "Z",
  ].join(" ");

  return (
    <path d={path} fill={ribbon.color} fillOpacity={0.3}>
      <title>{`${sourceName} to ${ribbon.branch.label}: ${ribbon.branch.count.toLocaleString()} records`}</title>
    </path>
  );
}

function FlowSourceNode({
  flow,
  layout,
}: {
  flow: WorkflowFlow;
  layout: FlowLayout;
}) {
  const height = layout.sourceBottom - layout.sourceTop;
  const labelY = layout.sourceTop + height / 2 - 4;

  return (
    <g>
      <title>{`${flow.input.label} input: ${flow.sourceTotal.toLocaleString()} records`}</title>
      <rect
        x={SOURCE_X}
        y={layout.sourceTop}
        width={SOURCE_WIDTH}
        height={height}
        rx={5}
        fill={FLOW_COLORS.source}
      />
      <text
        x={SOURCE_X - 12}
        y={labelY}
        textAnchor="end"
        fill="var(--foreground)"
        fontSize={12}
        fontWeight={650}
      >
        <tspan>{flow.input.label} input</tspan>
        <tspan
          x={SOURCE_X - 12}
          dy={17}
          fill="var(--muted-foreground)"
          fontSize={11}
          fontWeight={500}
        >
          {flow.sourceTotal.toLocaleString()} records
        </tspan>
      </text>
    </g>
  );
}

function FlowTargetNode({ ribbon }: { ribbon: FlowRibbon }) {
  const actualHeight = ribbon.targetBottom - ribbon.targetTop;
  const visualHeight = Math.max(actualHeight, 10);
  const visualY = ribbon.targetTop - (visualHeight - actualHeight) / 2;
  const labelX = TARGET_X + TARGET_WIDTH + 12;
  const labelY = ribbon.targetTop + actualHeight / 2 - 4;

  return (
    <g>
      <title>{`${ribbon.branch.label}: ${ribbon.branch.count.toLocaleString()} records`}</title>
      <rect
        x={TARGET_X}
        y={visualY}
        width={TARGET_WIDTH}
        height={visualHeight}
        rx={Math.min(5, visualHeight / 2)}
        fill={ribbon.color}
      />
      <text
        x={labelX}
        y={labelY}
        textAnchor="start"
        fill="var(--foreground)"
        fontSize={12}
        fontWeight={650}
      >
        <tspan>{ribbon.branch.label}</tspan>
        <tspan
          x={labelX}
          dy={17}
          fill="var(--muted-foreground)"
          fontSize={11}
          fontWeight={500}
        >
          {ribbon.branch.count.toLocaleString()} records
        </tspan>
      </text>
    </g>
  );
}
