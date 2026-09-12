/**
 * Built-in templates. Payload shape:
 * { notes?: [{title, body}], tasks?: [{title, notes?, priority?, durationMin?, dueOffsetDays?}],
 *   project?: {name, description?}, goals?: [{title, frequency?}] }
 * {{date}} resolves to the use-date; dueOffsetDays counts from it.
 */

export interface DefaultTemplate {
  kind: "note" | "task" | "project" | "plan";
  title: string;
  payload: Record<string, unknown>;
}

export const DEFAULT_TEMPLATES: DefaultTemplate[] = [
  {
    kind: "plan",
    title: "Daily Planner",
    payload: {
      notes: [
        {
          title: "Daily Plan — {{date}}",
          body: "## Top 3 priorities\n1. \n2. \n3. \n\n## Schedule\n\n## Notes",
        },
      ],
      tasks: [
        { title: "Plan the day", priority: "high", dueOffsetDays: 0, durationMin: 15 },
        { title: "Deep work block", priority: "high", dueOffsetDays: 0, durationMin: 90 },
        { title: "Evening review", priority: "low", dueOffsetDays: 0, durationMin: 15 },
      ],
    },
  },
  {
    kind: "plan",
    title: "Weekly Planner",
    payload: {
      notes: [
        {
          title: "Weekly Plan — {{date}}",
          body: "## Monday\n\n## Tuesday\n\n## Wednesday\n\n## Thursday\n\n## Friday\n\n## Weekend\n\n## Review",
        },
      ],
      tasks: [{ title: "Weekly review", priority: "medium", dueOffsetDays: 4, durationMin: 30 }],
    },
  },
  {
    kind: "note",
    title: "Meeting Notes",
    payload: {
      notes: [
        {
          title: "Meeting — {{date}}",
          body: "## Attendees\n\n## Agenda\n\n## Decisions\n\n## Action items",
        },
      ],
    },
  },
  {
    kind: "project",
    title: "Project Plan",
    payload: {
      project: { name: "New project — {{date}}", description: "Goal, scope, milestones." },
      notes: [{ title: "Project overview", body: "## Goal\n\n## Scope\n\n## Milestones\n\n## Risks" }],
      tasks: [
        { title: "Define scope", priority: "high", dueOffsetDays: 2, durationMin: 60 },
        { title: "First milestone", priority: "medium", dueOffsetDays: 7, durationMin: 120 },
      ],
    },
  },
  {
    kind: "task",
    title: "Study Plan",
    payload: {
      notes: [{ title: "Study notes", body: "## Key concepts\n\n## Questions\n\n## Summary" }],
      tasks: [
        { title: "Study session 1", priority: "medium", dueOffsetDays: 0, durationMin: 45 },
        { title: "Study session 2", priority: "medium", dueOffsetDays: 1, durationMin: 45 },
        { title: "Self-test", priority: "high", dueOffsetDays: 2, durationMin: 30 },
      ],
    },
  },
  {
    kind: "note",
    title: "Brain Dump",
    payload: {
      notes: [{ title: "Brain dump — {{date}}", body: "Get everything out of your head. Sort it later." }],
    },
  },
  {
    kind: "note",
    title: "Journal",
    payload: {
      notes: [
        {
          title: "Journal — {{date}}",
          body: "## Today I…\n\n## I felt…\n\n## I learned…\n\n## Tomorrow…",
        },
      ],
    },
  },
  {
    kind: "note",
    title: "Goal Planning",
    payload: {
      goals: [{ title: "New goal", frequency: "monthly" }],
      notes: [{ title: "Goal plan", body: "## Why\n\n## Milestones\n\n## First step" }],
    },
  },
  {
    kind: "note",
    title: "Retrospective",
    payload: {
      notes: [
        {
          title: "Retrospective — {{date}}",
          body: "## Went well\n\n## To improve\n\n## Action items",
        },
      ],
    },
  },
];
