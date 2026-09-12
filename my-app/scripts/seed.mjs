/**
 * NotoAI development seed. Idempotent: re-running wipes the demo
 * workspace and rebuilds the same coherent dataset with dates relative
 * to today, so Today/Overdue/Week views always look alive.
 *
 * Usage: npm run seed [baseUrl]
 * Demo login: demo@notoai.app / Demo1234
 *
 * Everything goes through the public HTTP API except AI conversations
 * (no endpoint exists), which are inserted directly.
 */
import mongoose from 'mongoose';

const BASE = process.argv[2] || process.env.SEED_BASE_URL || 'http://localhost:3000';
const MONGO = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/notoai';
const EMAIL = 'demo@notoai.app';
const PASSWORD = 'Demo1234';

let cookie = '';
async function api(path, options = {}) {
  const res = await fetch(BASE + path, {
    ...options,
    headers: { 'content-type': 'application/json', ...(options.headers || {}), ...(cookie ? { cookie } : {}) },
  });
  const sc = res.headers.get('set-cookie');
  if (sc) cookie = sc.split(';')[0];
  const json = await res.json().catch(() => null);
  if (!res.ok) throw new Error(`${options.method || 'GET'} ${path} -> ${res.status} ${JSON.stringify(json)}`);
  return json;
}

const iso = (d) => d.toISOString();
const at = (dayOffset, h, m = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + dayOffset);
  d.setHours(h, m, 0, 0);
  return d;
};

async function main() {
  // 1. Demo user: register, or login when the seed re-runs.
  try {
    await api('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name: 'Maya Chen', email: EMAIL, password: PASSWORD, confirmPassword: PASSWORD }),
    });
    console.log('demo user registered');
  } catch (err) {
    await api('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
    });
    console.log('demo user exists, re-seeding');
  }

  const { workspaces } = await api('/api/workspaces');
  const wid = workspaces[0].id;
  const W = `/api/workspaces/${wid}`;

  // 2. Wipe workspace data for a deterministic result.
  await mongoose.connect(MONGO, { serverSelectionTimeoutMS: 8000 });
  const db = mongoose.connection.db;
  const user = await db.collection('users').findOne({ email: EMAIL });
  // Sessions are token-hashed and global — leave other logins alone and
  // simply re-login for a fresh jar.
  for (const name of [
    'tasks', 'notes', 'projects', 'goals', 'events', 'reminders', 'tags',
    'templates', 'aiconversations', 'aimessages', 'notifications', 'embeddings', 'activitylogs',
  ]) {
    await db.collection(name).deleteMany({ workspaceId: new mongoose.Types.ObjectId(wid) });
  }
  cookie = '';
  await api('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  console.log('workspace wiped');

  // 3. Tags.
  const tagIds = {};
  for (const name of ['design', 'deep-work', 'health', 'learning', 'admin', 'finance', 'travel', 'reading', 'cooking']) {
    const { tag } = await api(`${W}/tags`, { method: 'POST', body: JSON.stringify({ name }) });
    tagIds[name] = tag.id;
  }

  // 4. Goals.
  const { goal: shipGoal } = await api(`${W}/goals`, {
    method: 'POST',
    body: JSON.stringify({
      title: 'Ship portfolio site',
      description: 'Launch the new portfolio before month end.',
      frequency: 'monthly',
      targetDate: iso(at(20, 17)),
    }),
  });
  const { goal: healthGoal } = await api(`${W}/goals`, {
    method: 'POST',
    body: JSON.stringify({ title: 'Exercise 3x per week', frequency: 'weekly' }),
  });
  const { goal: readingGoal } = await api(`${W}/goals`, {
    method: 'POST',
    body: JSON.stringify({
      title: 'Read 12 books this year',
      description: 'One book a month, mostly design and systems.',
      frequency: 'yearly',
      targetDate: iso(at(300, 17)),
    }),
  });
  const { goal: financeGoal } = await api(`${W}/goals`, {
    method: 'POST',
    body: JSON.stringify({ title: 'Build 3-month emergency fund', frequency: 'monthly' }),
  });
  for (const title of ['Pick template', 'Write case studies', 'Deploy']) {
    await api(`${W}/goals/${shipGoal.id}/milestones`, { method: 'POST', body: JSON.stringify({ title }) });
  }
  for (const title of ['Finish "Thinking with Type"', 'Finish "Designing Interfaces"', 'Write reading notes']) {
    await api(`${W}/goals/${readingGoal.id}/milestones`, { method: 'POST', body: JSON.stringify({ title }) });
  }
  for (const title of ['Open high-yield account', 'Automate monthly transfer']) {
    await api(`${W}/goals/${financeGoal.id}/milestones`, { method: 'POST', body: JSON.stringify({ title }) });
  }
  const ms = (await api(`${W}/goals/${shipGoal.id}`)).goal.milestones;
  await api(`${W}/goals/${shipGoal.id}/milestones/${ms[0].id}`, { method: 'PATCH', body: JSON.stringify({ done: true }) });

  // 5. Projects.
  const { project: redesign } = await api(`${W}/projects`, {
    method: 'POST',
    body: JSON.stringify({
      name: 'Website Redesign',
      description: 'Client homepage overhaul: IA, mockups, build.',
      color: '#6366f1',
      dueAt: iso(at(14, 17)),
      goalId: shipGoal.id,
    }),
  });
  const { project: portfolio } = await api(`${W}/projects`, {
    method: 'POST',
    body: JSON.stringify({ name: 'Portfolio Site', dueAt: iso(at(20, 17)), goalId: shipGoal.id }),
  });
  const { project: cabin } = await api(`${W}/projects`, {
    method: 'POST',
    body: JSON.stringify({
      name: 'Cabin Trip',
      description: 'Weekend getaway: bookings, packing, route.',
      color: '#16a34a',
      dueAt: iso(at(12, 9)),
    }),
  });
  const { project: finance } = await api(`${W}/projects`, {
    method: 'POST',
    body: JSON.stringify({
      name: 'Finance Tracker',
      description: 'Monthly budget review and savings automation.',
      color: '#eab308',
      dueAt: iso(at(30, 17)),
      goalId: financeGoal.id,
    }),
  });

  // 6. Tasks (dates relative to today keep every view populated).
  const task = async (body) => (await api(`${W}/tasks`, { method: 'POST', body: JSON.stringify(body) })).task;
  const t1 = await task({ title: 'Review homepage mockups', notes: 'Check spacing on the hero and footer contrast.', priority: 'high', dueAt: iso(at(0, 15)), durationMin: 45, projectId: redesign.id, tagIds: [tagIds.design] });
  const t2 = await task({ title: 'Fix footer contrast', priority: 'urgent', dueAt: iso(at(-1, 12)), durationMin: 30, projectId: redesign.id, tagIds: [tagIds.design] });
  const t3 = await task({ title: 'Morning run', priority: 'medium', dueAt: iso(at(1, 7)), durationMin: 40, goalId: healthGoal.id, tagIds: [tagIds.health], recurrence: 'daily', recurrenceUntil: iso(at(60, 7)) });
  const t4 = await task({ title: 'Write case study: fintech app', priority: 'medium', dueAt: iso(at(3, 17)), durationMin: 90, projectId: portfolio.id, goalId: shipGoal.id, tagIds: [tagIds['deep-work']] });
  const t5 = await task({ title: 'Pay electricity bill', priority: 'low', dueAt: iso(at(5, 12)), tagIds: [tagIds.admin] });
  const t6 = await task({ title: 'Read React Server Components docs', priority: 'low', tagIds: [tagIds.learning] });
  const t7 = await task({ title: 'Renew domain notoai.app', priority: 'urgent', dueAt: iso(at(-3, 9)), durationMin: 15, tagIds: [tagIds.admin] });
  const t8 = await task({ title: 'Book cabin for weekend', priority: 'high', dueAt: iso(at(0, 11)), durationMin: 30, projectId: cabin.id, tagIds: [tagIds.travel] });
  const t9 = await task({ title: 'Plan driving route + playlists', priority: 'low', dueAt: iso(at(9, 18)), projectId: cabin.id, tagIds: [tagIds.travel] });
  const t10 = await task({ title: 'Review monthly budget', priority: 'medium', dueAt: iso(at(2, 19)), durationMin: 45, projectId: finance.id, goalId: financeGoal.id, tagIds: [tagIds.finance] });
  const t11 = await task({ title: 'Set up automatic savings transfer', priority: 'medium', dueAt: iso(at(6, 10)), durationMin: 20, projectId: finance.id, goalId: financeGoal.id, tagIds: [tagIds.finance] });
  const t12 = await task({ title: 'Meal-prep Sunday lunches', priority: 'low', dueAt: iso(at(0, 16)), durationMin: 90, goalId: healthGoal.id, tagIds: [tagIds.health, tagIds.cooking], recurrence: 'weekly', recurrenceUntil: iso(at(90, 16)) });
  const t13 = await task({ title: 'Try new pasta recipe', priority: 'low', dueAt: iso(at(4, 18)), tagIds: [tagIds.cooking] });
  const t14 = await task({ title: 'Finish "Thinking with Type" ch. 4', priority: 'medium', dueAt: iso(at(2, 21)), durationMin: 60, goalId: readingGoal.id, tagIds: [tagIds.reading] });
  const t15 = await task({ title: 'Write reading notes: grids', priority: 'low', dueAt: iso(at(7, 20)), goalId: readingGoal.id, tagIds: [tagIds.reading, tagIds['deep-work']] });
  const t16 = await task({ title: 'Deep work: portfolio hero section', priority: 'high', dueAt: iso(at(1, 10)), durationMin: 120, projectId: portfolio.id, tagIds: [tagIds['deep-work'], tagIds.design] });
  const t17 = await task({ title: 'Update portfolio screenshots', priority: 'medium', dueAt: iso(at(8, 14)), projectId: portfolio.id, goalId: shipGoal.id });
  const t18 = await task({ title: 'Learn React use() hook patterns', notes: 'Tomorrow at 9 AM session.', priority: 'medium', dueAt: iso(at(1, 9)), durationMin: 60, tagIds: [tagIds.learning] });
  const t19 = await task({ title: 'File quarterly taxes', priority: 'urgent', dueAt: iso(at(-2, 17)), durationMin: 60, tagIds: [tagIds.admin, tagIds.finance] });
  const t20 = await task({ title: 'Brainstorm blog post ideas', priority: 'low', tagIds: [tagIds.learning] });
  const done = await task({ title: 'Send invoice #1042', priority: 'medium', dueAt: iso(at(0, 10)) });
  await api(`${W}/tasks/${done.id}/complete`, { method: 'POST' });
  const done2 = await task({ title: 'Water the balcony herbs', priority: 'low', dueAt: iso(at(-1, 8)) });
  await api(`${W}/tasks/${done2.id}/complete`, { method: 'POST' });
  await api(`${W}/tasks/${t1.id}/subtasks`, { method: 'POST', body: JSON.stringify({ title: 'Check hero spacing' }) });
  const subs = (await api(`${W}/tasks/${t1.id}`)).task.subtasks;
  await api(`${W}/tasks/${t1.id}/subtasks/${subs[0].id}`, { method: 'PATCH', body: JSON.stringify({ done: true }) });

  // 7. Notes.
  const note = async (body) => (await api(`${W}/notes`, { method: 'POST', body: JSON.stringify(body) })).note;
  await note({
    title: 'Sprint planning — design team',
    body: 'Attendees: Maya, Jonas, Priya\n\nDecisions:\n- Homepage hero ships Thursday\n- Footer contrast fix is P0\n\nActions:\n- Maya: finalize mockups\n- Jonas: review pull request',
    tagIds: [tagIds.design],
    projectId: redesign.id,
  });
  await note({
    title: 'React Server Components',
    body: 'Server components render on the server and ship zero JS. Client components hydrate for interactivity. Route handlers pair well with server actions for mutations.',
    tagIds: [tagIds.learning],
  });
  const fav = await note({ title: 'Packing list — cabin trip', body: 'Jacket, boots, book, thermos, camera.' });
  await api(`${W}/notes/${fav.id}`, { method: 'PATCH', body: JSON.stringify({ isFavorite: true }) });
  await note({ title: 'Weekend ideas', body: 'Farmers market Saturday. Trail run Sunday morning if the weather holds.' });
  await note({
    title: 'Portfolio outline',
    body: '## Projects\n1. Fintech dashboard\n2. E-commerce rebrand\n\n## Timeline\nDrafts this week, polish next.',
    projectId: portfolio.id,
  });
  await note({
    title: 'Meeting notes — budget review',
    body: 'Reviewed August spend. Dining out 2x over target. Action: cap at $300 for September, automate $500 savings transfer on payday.',
    tagIds: [tagIds.finance],
    projectId: finance.id,
  });
  await note({
    title: 'Book notes: grids and hierarchy',
    body: 'Key ideas:\n- 12-col grid for desktop, 4-col for mobile\n- Hierarchy through scale first, color second\n- Whitespace is a layout tool, not emptiness',
    tagIds: [tagIds.reading, tagIds.design],
  });
  await note({
    title: 'Morning pages',
    body: 'Woke up early. Big win: shipped the footer fix. Today: mockups review, then deep work on the case study. Remember to stretch.',
    tagIds: [tagIds.health],
  });
  await note({
    title: 'Cabin route + stops',
    body: 'Route: highway 9 north, ~2h15. Stops: bakery at mile 40, lake viewpoint. Arrival checklist: firewood, water filter, first-aid kit.',
    tagIds: [tagIds.travel],
    projectId: cabin.id,
  });
  await note({
    title: 'Pasta recipe — cacio e pepe',
    body: 'Ingredients: tonnarelli, pecorino, black pepper.\nMethod: toast pepper, cook pasta very al dente, emulsify with starchy water off heat. No cream, ever.',
    tagIds: [tagIds.cooking],
  });
  await note({
    title: 'Gym routine v3',
    body: 'Mon: push. Wed: pull + core. Fri: legs. 45 min caps. Deload every 4th week.',
    tagIds: [tagIds.health],
  });
  await note({
    title: 'Gift ideas',
    body: 'Jonas: mechanical keyboard keycaps. Priya: art print from the lake series. Mom: call + photo book.',
  });
  const archived = await note({ title: 'Old sprint retro — July', body: 'Shipped late twice. Root cause: vague acceptance criteria. Fix: checklist per ticket.' });
  await api(`${W}/notes/${archived.id}`, { method: 'PATCH', body: JSON.stringify({ isArchived: true }) });
  const trashed = await note({ title: 'Scratch — duplicate idea', body: 'Superseded by the portfolio outline.' });
  await api(`${W}/notes/${trashed.id}`, { method: 'DELETE' });

  // 8. Events (+ linked reminder).
  const event = async (body) => (await api(`${W}/events`, { method: 'POST', body: JSON.stringify(body) })).event;
  await event({ title: 'Team standup', startsAt: iso(at(1, 9, 30)), endsAt: iso(at(1, 9, 45)), recurrence: 'daily' });
  await event({
    title: 'Design review with client', startsAt: iso(at(1, 14)), endsAt: iso(at(1, 15)),
    location: 'Meet: design-review', projectId: redesign.id, reminderMinutesBefore: 30,
  });
  await event({ title: 'Dentist appointment', startsAt: iso(at(4, 10)), endsAt: iso(at(4, 11)), reminderMinutesBefore: 60 });
  await event({ title: 'Design conference', startsAt: iso(at(10, 9)), endsAt: iso(at(11, 17)), allDay: true });
  await event({ title: 'Sprint retrospective', startsAt: iso(at(5, 16)), endsAt: iso(at(5, 17)), recurrence: 'weekly', projectId: redesign.id });
  await event({ title: '1:1 with Jonas', startsAt: iso(at(2, 11)), endsAt: iso(at(2, 11, 30)), location: 'Meet: 1-1-jonas' });
  await event({ title: 'Flight to cabin', startsAt: iso(at(12, 7, 45)), endsAt: iso(at(12, 9, 15)), location: 'Terminal 2', reminderMinutesBefore: 120 });
  await event({ title: "Mom's birthday", startsAt: iso(at(15, 0)), endsAt: iso(at(15, 23, 59)), allDay: true, reminderMinutesBefore: 1440 });
  await event({ title: 'Deep work block', startsAt: iso(at(1, 10)), endsAt: iso(at(1, 12)), recurrence: 'weekly' });

  // 9. Standalone + recurring reminders.
  await api(`${W}/reminders`, {
    method: 'POST',
    body: JSON.stringify({ title: 'Water the plants', remindAt: iso(at(0, 18)) }),
  });
  await api(`${W}/reminders`, {
    method: 'POST',
    body: JSON.stringify({ title: 'Take vitamins', remindAt: iso(at(0, 8)), recurrence: 'daily' }),
  });
  await api(`${W}/reminders`, {
    method: 'POST',
    body: JSON.stringify({ title: 'Call accountant about quarterly taxes', remindAt: iso(at(1, 13)) }),
  });
  await api(`${W}/reminders`, {
    method: 'POST',
    body: JSON.stringify({ title: 'Submit weekly status update', remindAt: iso(at(4, 16, 30)), recurrence: 'weekly' }),
  });
  await api(`${W}/reminders`, {
    method: 'POST',
    body: JSON.stringify({ title: 'Replace water filter', remindAt: iso(at(9, 9)), recurrence: 'monthly' }),
  });
  await api(`${W}/reminders`, {
    method: 'POST',
    body: JSON.stringify({ title: 'Pack camera batteries', remindAt: iso(at(11, 20)) }),
  });

  // 10. Templates (one per kind + extras).
  const template = async (body) => (await api(`${W}/templates`, { method: 'POST', body: JSON.stringify(body) })).template;
  await template({
    kind: 'note', title: 'Morning pages',
    payload: { body: '## Gratitude\n\n## Today\'s focus\n\n## One thing to let go of\n' },
  });
  await template({
    kind: 'note', title: 'Meeting notes',
    payload: { body: '## Attendees\n\n## Decisions\n\n## Actions\n' },
  });
  await template({
    kind: 'task', title: 'Bug report',
    payload: { priority: 'high', notes: 'Steps to reproduce:\n1.\n2.\n\nExpected:\nActual:' },
  });
  await template({
    kind: 'task', title: 'Weekly review task',
    payload: { priority: 'medium', durationMin: 30, recurrence: 'weekly' },
  });
  await template({
    kind: 'project', title: 'Project kickoff',
    payload: { description: 'Goals, scope, milestones, and risks for a new project.' },
  });
  await template({
    kind: 'plan', title: 'Weekly review plan',
    payload: { blocks: ['Morning', 'Afternoon', 'Evening'], focus: 'Clear overdue first, then highest priority.' },
  });

  // 11. AI conversations (no HTTP API exists — direct insert, same shapes).
  const now = new Date();
  const conv = await db.collection('aiconversations').insertOne({
    workspaceId: new mongoose.Types.ObjectId(wid),
    userId: user._id,
    title: 'Plan my tomorrow',
    model: 'assistant',
    status: 'active',
    createdAt: now,
    updatedAt: now,
  });
  const messages = [
    { role: 'user', content: 'Plan my tomorrow.' },
    { role: 'assistant', content: 'Here is a focused plan: mockups review at 9:00 (45m, overdue first), deep work on the fintech case study at 10:00 (90m).' },
    { role: 'user', content: 'Summarize my React notes.' },
    { role: 'assistant', content: 'Server components render server-side with zero JS; client components hydrate for interactivity.' },
  ];
  await db.collection('aimessages').insertMany(
    messages.map((m, i) => ({
      conversationId: conv.insertedId,
      role: m.role,
      content: m.content,
      createdAt: new Date(now.getTime() + i * 60000),
      updatedAt: new Date(now.getTime() + i * 60000),
    })),
  );

  // 12. Semantic index for the fresh docs.
  await api(`${W}/embeddings`, { method: 'POST', body: JSON.stringify({}) });

  const counts = {};
  for (const [label, path] of [
    ['tasks', `${W}/tasks?view=all`], ['notes', `${W}/notes`], ['projects', `${W}/projects`],
    ['goals', `${W}/goals`], ['events', `${W}/schedule?view=month`], ['reminders', `${W}/reminders?status=pending`],
    ['tags', `${W}/tags`], ['templates', `${W}/templates`],
  ]) {
    const key = label === 'events' ? 'items' : label;
    counts[label] = ((await api(path))[key] || []).length;
  }
  counts.conversations = await db.collection('aiconversations').countDocuments({ workspaceId: new mongoose.Types.ObjectId(wid) });
  counts.vectors = (await api(`${W}/embeddings`)).vectors;
  console.log('seeded:', JSON.stringify(counts));
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error('seed failed:', err.message);
  process.exit(1);
});
