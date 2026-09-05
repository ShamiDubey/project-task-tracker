/**
 * Database constraints.
 *
 * Several rules stated inside the brief's goals are held by Postgres rather than by application
 * code, on the grounds that an invariant only one of several writers upholds is not upheld. This
 * suite attempts each illegal write and asserts the database refuses it — a constraint nobody has
 * watched fire is not a constraint.
 *
 * Runs against the real database and cleans up after itself.
 */
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);
let pass = 0;
let fail = 0;

async function refuses(label, fn) {
  try {
    await fn();
    fail++;
    console.log(`   FAIL ${label} — the write was ACCEPTED`);
  } catch (err) {
    const constraint = String(err.message).match(/"([a-z_]+)"/)?.[1] ?? 'rejected';
    pass++;
    console.log(`   ok   ${label}\n          ↳ ${constraint}`);
  }
}
async function accepts(label, fn) {
  try {
    await fn();
    pass++;
    console.log(`   ok   ${label}`);
  } catch (err) {
    fail++;
    console.log(`   FAIL ${label} — refused: ${err.message.split('\n')[0]}`);
  }
}

const suffix = Date.now().toString(36).slice(-4).toUpperCase();
const [alice] = await sql`
  insert into users (email, name, password_hash, role)
  values (${`t-${suffix}-a@x.io`.toLowerCase()}, 'Alice', 'x', 'manager') returning id`;
const [bob] = await sql`
  insert into users (email, name, password_hash, role)
  values (${`t-${suffix}-b@x.io`.toLowerCase()}, 'Bob', 'x', 'member') returning id`;
const [pa] = await sql`insert into projects (key, name, owner_id) values (${`TA${suffix}`}, 'A', ${alice.id}) returning id`;
const [pb] = await sql`insert into projects (key, name, owner_id) values (${`TB${suffix}`}, 'B', ${alice.id}) returning id`;
const [a1] = await sql`insert into tasks (project_id, number, title) values (${pa.id}, 1, 'A1') returning id`;
const [a2] = await sql`insert into tasks (project_id, number, title) values (${pa.id}, 2, 'A2') returning id`;
const [b1] = await sql`insert into tasks (project_id, number, title) values (${pb.id}, 1, 'B1') returning id`;

console.log('\nGoal 4 — a Blocked task always remembers where it came from');
await refuses('Blocked with no recorded previous state',
  () => sql`update tasks set status='blocked' where id=${a1.id}`);
await refuses('Blocked from Backlog (only In Progress or In Review are legal)',
  () => sql`update tasks set status='blocked', blocked_from_status='backlog' where id=${a1.id}`);
await accepts('Blocked from In Progress',
  () => sql`update tasks set status='blocked', blocked_from_status='in_progress' where id=${a1.id}`);
await refuses('leaving stale return state on a task that is no longer blocked',
  () => sql`update tasks set status='in_progress' where id=${a1.id}`);

console.log('\nGoal 8 — the denormalised completion time cannot drift');
await refuses('Done with no completion time',
  () => sql`update tasks set status='done' where id=${a2.id}`);
await refuses('a completion time on a task that is not Done',
  () => sql`update tasks set completed_at=now() where id=${a2.id}`);
await accepts('Done together with its completion time',
  () => sql`update tasks set status='done', completed_at=now() where id=${a2.id}`);

console.log('\nGoal 3.4 — a blocker must be in the same project');
await refuses('a dependency spanning two projects',
  () => sql`insert into task_dependencies (task_id, blocking_task_id, project_id) values (${a1.id}, ${b1.id}, ${pa.id})`);
await refuses('a dependency claiming the wrong project',
  () => sql`insert into task_dependencies (task_id, blocking_task_id, project_id) values (${a1.id}, ${a2.id}, ${pb.id})`);
await refuses('a task blocking itself',
  () => sql`insert into task_dependencies (task_id, blocking_task_id, project_id) values (${a1.id}, ${a1.id}, ${pa.id})`);
await accepts('a dependency inside one project',
  () => sql`insert into task_dependencies (task_id, blocking_task_id, project_id) values (${a1.id}, ${a2.id}, ${pa.id})`);

console.log('\nGoal 5.2 / 5.3 — assignment implies membership');
await refuses('assigning somebody who is not on the project',
  () => sql`insert into task_assignees (task_id, user_id, project_id) values (${a1.id}, ${bob.id}, ${pa.id})`);
await accepts('assigning after adding them to the project', async () => {
  await sql`insert into project_members (project_id, user_id) values (${pa.id}, ${bob.id})`;
  await sql`insert into task_assignees (task_id, user_id, project_id) values (${a1.id}, ${bob.id}, ${pa.id})`;
});
await accepts('removing them from the project takes the assignment with it', async () => {
  await sql`delete from project_members where project_id=${pa.id} and user_id=${bob.id}`;
  const [{ n }] = await sql`select count(*)::int n from task_assignees where user_id=${bob.id}`;
  if (n !== 0) throw new Error(`${n} assignment(s) survived`);
});

console.log('\nTime tracking (stretch feature)');
await refuses('zero minutes logged',
  () => sql`insert into time_entries (task_id, minutes, spent_on) values (${a1.id}, 0, current_date)`);
await refuses('an absurd duration (over 24h)',
  () => sql`insert into time_entries (task_id, minutes, spent_on) values (${a1.id}, 5000, current_date)`);
await accepts('a normal 90-minute entry',
  () => sql`insert into time_entries (task_id, minutes, spent_on) values (${a1.id}, 90, current_date)`);

console.log('\nShape of the data');
await refuses('a lowercase project key',
  () => sql`insert into projects (key, name, owner_id) values ('bad', 'B', ${alice.id})`);
await refuses('an email that is not lower-cased',
  () => sql`insert into users (email, name, password_hash) values ('Nope@X.io', 'N', 'x')`);
await refuses('two tasks with the same number in one project',
  () => sql`insert into tasks (project_id, number, title) values (${pa.id}, 1, 'dup')`);

await sql`delete from projects where id in (${pa.id}, ${pb.id})`;
await sql`delete from users where id in (${alice.id}, ${bob.id})`;

console.log(`\n${'='.repeat(64)}\n  ${pass} passed, ${fail} failed\n${'='.repeat(64)}`);
process.exit(fail ? 1 : 0);
