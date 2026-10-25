import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { createServer } from 'node:net';
import { DatabaseSync } from 'node:sqlite';
import test from 'node:test';
import assert from 'node:assert/strict';

const temp = mkdtempSync(join(process.cwd(), '.ssis-test-')), dbPath = join(temp, 'test.sqlite');
const port = await new Promise(resolve => { const s = createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => resolve(p)); }); });
const child = spawn(process.execPath, ['server/index.mjs'], { cwd: process.cwd(), env: { ...process.env, PORT: String(port), SSIS_DB_PATH: dbPath, SSIS_BOOTSTRAP_ADMIN_EMAIL: 'admin@test.local', SSIS_BOOTSTRAP_ADMIN_PASSWORD: 'AdminPassword-123' }, stdio: 'inherit' }), base = `http://127.0.0.1:${port}/api`;
async function wait() { for (let n = 0; n < 80; n++) { try { if ((await fetch(`${base}/health`)).ok) return; } catch {} await new Promise(r => setTimeout(r, 100)); } throw Error('API startup timeout'); }
async function login(email, password) { const r = await fetch(`${base}/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, password }) }), d = await r.json(); assert.equal(r.status, 200, JSON.stringify(d)); return { user: d.user, cookie: r.headers.get('set-cookie').split(';')[0] }; }
async function call(s, path, method = 'GET', body) { const r = await fetch(`${base}${path}`, { method, headers: { cookie: s.cookie, 'content-type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) }); return { status: r.status, data: await r.json() }; }
async function addUser(admin, name, email, role, password, department) { const r = await call(admin, '/users', 'POST', { name, email, role, password, department: role === 'Department' ? (department || 'Computing') : undefined }); assert.equal(r.status, 201, JSON.stringify(r.data)); return login(email, password); }
const studentBody = (id, extra = {}) => ({ name: 'Test Student', email: `${id.toLowerCase()}@test.local`, initialPassword: 'StudentPassword-123', id, course: 'BSIT', year: '1st Year', section: 'BSIT 1-A', department: 'Computing', ...extra });

test('registrar creates records, departments accept them, and reports/enrollment work', async t => {
  t.after(async () => { child.kill(); await new Promise(resolve => child.once('exit', resolve)); rmSync(temp, { recursive: true, force: true }); });
  await wait();
  const admin = await login('admin@test.local', 'AdminPassword-123');
  const registrar = await addUser(admin, 'Registrar', 'registrar@test.local', 'Registrar', 'RegistrarPassword-123');
  const dept = await addUser(admin, 'Computing Dept', 'dept@test.local', 'Department', 'DepartmentPassword-123', 'Computing');
  const otherDept = await addUser(admin, 'Business Dept', 'business@test.local', 'Department', 'DepartmentPassword-123', 'Business');
  const cashier = await addUser(admin, 'Cashier', 'cashier@test.local', 'Cashier', 'CashierPassword-123');

  // Admin cannot create student accounts through user management; cannot deactivate self.
  assert.equal((await call(admin, '/users', 'POST', { name: 'Stu', email: 'x@test.local', role: 'Student', password: 'StudentPassword-123' })).status, 400);
  assert.equal((await call(admin, `/users/${admin.user.id}`, 'PATCH', { status: 'Inactive' })).status, 400);

  // Departments can never create student records or browse the directory.
  assert.equal((await call(dept, '/students', 'POST', studentBody('TST-30009'))).status, 403);
  assert.equal((await call(dept, '/students')).status, 403);
  assert.equal((await call(dept, '/student-record-requests', 'POST', {})).status, 404);

  // Registrar creates a record; it is routed to the department as Pending.
  const made = await call(registrar, '/students', 'POST', studentBody('TST-30001'));
  assert.equal(made.status, 201, JSON.stringify(made.data));
  assert.equal(made.data.item.routed, true);
  assert.equal((await call(registrar, '/students', 'POST', studentBody('TST-30001', { email: 'other@test.local' }))).status, 409);
  let incoming = await call(dept, '/department-records');
  assert.equal(incoming.data.items.length, 1);
  assert.equal(incoming.data.items[0].status, 'Pending');
  assert.equal((await call(otherDept, '/department-records')).data.items.length, 0);
  assert.equal((await call(otherDept, `/department-records/${incoming.data.items[0].id}`, 'PATCH', { status: 'Accepted' })).status, 404);
  assert.equal((await call(registrar, `/department-records/${incoming.data.items[0].id}`, 'PATCH', { status: 'Accepted' })).status, 403);
  assert.equal((await call(dept, `/department-records/${incoming.data.items[0].id}`, 'PATCH', { status: 'Returned' })).status, 400);
  assert.equal((await call(dept, `/department-records/${incoming.data.items[0].id}`, 'PATCH', { status: 'Accepted' })).status, 200);
  assert.equal((await call(dept, `/department-records/${incoming.data.items[0].id}`, 'PATCH', { status: 'Accepted' })).status, 409);

  // Accepting opens a clearance item that only the owning department can see/update.
  const clearance = await call(dept, '/clearance');
  assert.equal(clearance.data.items.length, 1);
  assert.equal((await call(otherDept, '/clearance')).data.items.length, 0);
  assert.equal((await call(otherDept, `/clearance/${clearance.data.items[0].id}`, 'PATCH', { status: 'Cleared' })).status, 404);
  assert.equal((await call(dept, `/clearance/${clearance.data.items[0].id}`, 'PATCH', { status: 'Cleared', remarks: 'ok' })).status, 200);

  // Retrieval: department can pull an existing registrar record, but cannot invent one.
  assert.equal((await call(registrar, '/students', 'POST', studentBody('TST-30002', { department: 'Registrar Office' }))).status, 201);
  assert.equal((await call(dept, '/department-records/retrieve', 'POST', { studentId: 'NOPE-0001' })).status, 404);
  assert.equal((await call(dept, '/department-records/retrieve', 'POST', { studentId: 'TST-30002' })).status, 201);
  assert.equal((await call(dept, '/department-records/retrieve', 'POST', { studentId: 'TST-30002' })).status, 409);
  // Returned records can be sent again by the registrar.
  const rec2 = await call(registrar, '/students', 'POST', studentBody('TST-30003', { department: 'Business' }));
  assert.equal(rec2.status, 201);
  const biz = (await call(otherDept, '/department-records')).data.items[0];
  assert.equal((await call(otherDept, `/department-records/${biz.id}`, 'PATCH', { status: 'Returned', remarks: 'Wrong department' })).status, 200);
  assert.equal((await call(registrar, '/department-records', 'POST', { studentId: 'TST-30003', department: 'Business' })).status, 200);

  // Grade encoding and enrollment summary.
  assert.equal((await call(registrar, '/students/TST-30001/grades', 'POST', { code: 'cs 101', name: 'Data Structures', units: 3 })).status, 201);
  assert.equal((await call(registrar, '/students/TST-30001/grades', 'POST', { code: 'CS 101', name: 'Data Structures', units: 3 })).status, 409);
  assert.equal((await call(registrar, '/students/TST-30001/grades', 'PUT', { items: [{ code: 'CS 101', midterm: '1.5', final: '1.75', grade: '1.75', status: 'Passed' }] })).status, 200);
  assert.equal((await call(registrar, '/students/TST-30001/grades', 'PUT', { items: [{ code: 'CS 101', status: 'Bogus' }] })).status, 400);
  assert.equal((await call(registrar, '/students/TST-30001/grades')).data.items[0].grade, '1.75');
  assert.equal((await call(registrar, '/enrollments', 'POST', { studentId: 'TST-30001', term: '1st Sem 2026-2027', units: 21, status: 'Enrolled' })).status, 201);
  assert.equal((await call(registrar, '/enrollments', 'POST', { studentId: 'TST-30001', term: '1st Sem 2026-2027', units: 18, status: 'Enrolled' })).status, 201);
  const enrollments = await call(registrar, '/enrollments');
  assert.equal(enrollments.data.items.length, 1);
  assert.equal(enrollments.data.items[0].units, 18);
  assert.equal((await call(dept, '/enrollments')).status, 403);
  assert.equal((await call(cashier, '/reports/students')).status, 403);

  // Reports are available to the Registrar and Admin.
  for (const name of ['students', 'enrollments', 'grades', 'document-requests', 'department-records']) {
    const r = await call(registrar, `/reports/${name}`); assert.equal(r.status, 200, name); assert.ok(r.data.columns.length > 0);
  }
  assert.equal((await call(admin, '/reports/students')).data.rows.length, 3);
  assert.equal((await call(registrar, '/reports/unknown')).status, 404);

  // Student, document request, and payment workflow keeps working.
  const sid = 'TST-30001';
  assert.equal((await call(admin, '/charges', 'POST', { studentId: sid, term: 'AY TEST', description: 'Tuition', amount: 50 })).status, 403);
  assert.equal((await call(registrar, '/charges', 'POST', { studentId: sid, term: 'AY TEST', description: 'Tuition', amount: 50 })).status, 201);
  assert.equal((await call(registrar, '/charges', 'POST', { studentId: sid, term: 'AY TEST', description: 'Tuition', amount: 50 })).status, 409);
  const student = await login('tst-30001@test.local', 'StudentPassword-123');
  const req = await call(student, '/document-requests', 'POST', { type: 'Transcript of Records', purpose: 'Employment application', copies: 1 });
  assert.equal(req.status, 201);
  assert.equal((await call(student, '/document-requests', 'POST', { type: 'Transcript of Records', purpose: 'Duplicate', copies: 1 })).status, 409);
  assert.equal((await call(registrar, `/document-requests/${req.data.item.id}`, 'PATCH', { status: 'Processing', remarks: 'In review' })).status, 200);
  assert.equal((await call(cashier, '/document-requests')).status, 403);
  let finance = await call(cashier, `/finance?studentId=${sid}`); assert.equal(finance.data.balanceCents, 5000);
  assert.equal((await call(cashier, '/payments', 'POST', { studentId: sid, amount: 20, idempotencyKey: 'pay-1' })).status, 201);
  assert.equal((await call(cashier, '/payments', 'POST', { studentId: sid, amount: 20, idempotencyKey: 'pay-1' })).status, 409);
  assert.equal((await call(cashier, '/payments', 'POST', { studentId: sid, amount: 50, idempotencyKey: 'pay-over' })).status, 400);
  finance = await call(cashier, `/finance?studentId=${sid}`); assert.equal(finance.data.status, 'Partially Paid');
  const db = new DatabaseSync(dbPath);
  db.prepare('INSERT INTO schedules(student_id,course_code,course_name,instructor,meeting_time,room,section) VALUES(?,?,?,?,?,?,?)').run(sid, 'CS 101', 'Data Structures', 'Instructor', 'Mon 9:00 AM', 'Room 1', 'BSCS 1-A'); db.close();
  assert.equal((await call(student, `/students/${sid}/schedule`)).data.items[0].instructor, 'Instructor');

  // Login throttling.
  for (let i = 0; i < 5; i++) await fetch(`${base}/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: 'ghost@test.local', password: 'wrong-password' }) });
  const blocked = await fetch(`${base}/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: 'ghost@test.local', password: 'wrong-password' }) });
  assert.equal(blocked.status, 429);
});
