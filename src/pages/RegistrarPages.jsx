import { useEffect, useMemo, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { BookOpen, CalendarCheck2, Download, FileDown, Plus, Send, Users } from 'lucide-react';
import { Button, DataTable, FormField, MetricCard, Modal, SectionTitle, SelectField, StatusBadge } from '../components/ui.jsx';
import { api } from '../services/api.js';
import { downloadCsv } from '../services/exportCsv.js';

const usePageContext = () => useOutletContext() || { role: 'Registrar', onNotify: () => {} };
const col = (key, label, extra = {}) => ({ key, label, ...extra });
const badge = value => <StatusBadge status={value} />;
const when = value => (value ? new Date(value).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' }) : '');
const blankStudent = { name: '', email: '', id: '', course: '', year: '', section: '', department: '', initialPassword: '' };

export async function exportReport(name) {
  const report = await api.report(name);
  downloadCsv(`ssis-${name}-${new Date().toISOString().slice(0, 10)}.csv`, report.columns.map(c => c.label), report.rows.map(row => report.columns.map(c => row[c.key])));
  return report.rows.length;
}

// ---------------------------------------------------------------- Student records
export function Registrar() {
  const { onNotify, role } = usePageContext();
  const [rows, setRows] = useState([]), [routing, setRouting] = useState([]), [departments, setDepartments] = useState([]);
  const [show, setShow] = useState(false), [form, setForm] = useState(blankStudent), [filter, setFilter] = useState('All courses');
  const [sendTo, setSendTo] = useState(null), [sendDept, setSendDept] = useState(''), [busy, setBusy] = useState(false);
  const [charges, setCharges] = useState([]), [chargeShow, setChargeShow] = useState(false), [charge, setCharge] = useState({ studentId: '', term: '', description: '', amount: '' });
  const load = () => {
    api.students().then(setRows).catch(e => onNotify(e.message, 'error'));
    api.departmentRecords().then(setRouting).catch(e => onNotify(e.message, 'error'));
    api.departments().then(setDepartments).catch(() => {});
    api.charges().then(setCharges).catch(() => {});
  };
  useEffect(load, [role]);
  const courses = useMemo(() => [...new Set(rows.map(r => r.course).filter(Boolean))], [rows]);
  const visible = rows.filter(x => filter === 'All courses' || x.course === filter);

  const create = async e => {
    e.preventDefault(); setBusy(true);
    try {
      const saved = await api.createStudent(form);
      setShow(false); setForm(blankStudent); load();
      onNotify(saved.routed ? `Student record saved and sent to ${saved.department} for acceptance.` : `Student record saved. No active Department account is named "${saved.department}" yet, so it is waiting in that queue.`, saved.routed ? 'success' : 'info');
    } catch (err) { onNotify(err.message, 'error'); } finally { setBusy(false); }
  };
  const send = async e => {
    e.preventDefault(); setBusy(true);
    try { await api.sendRecordToDepartment({ studentId: sendTo.id, department: sendDept }); setSendTo(null); load(); onNotify(`Record sent to ${sendDept}.`, 'success'); }
    catch (err) { onNotify(err.message, 'error'); } finally { setBusy(false); }
  };
  const postCharge = async e => { e.preventDefault(); try { await api.createCharge({ ...charge, amount: Number(charge.amount) }); setChargeShow(false); setCharge({ studentId: '', term: '', description: '', amount: '' }); load(); onNotify('Student charge saved.', 'success'); } catch (err) { onNotify(err.message, 'error'); } };
  const resend = async r => { try { await api.sendRecordToDepartment({ studentId: r.studentId, department: r.department }); load(); onNotify('Record sent again.', 'success'); } catch (err) { onNotify(err.message, 'error'); } };

  const columns = [col('id', 'Student ID'), col('name', 'Student'), col('course', 'Course'), col('year', 'Year level'), col('section', 'Section'), col('department', 'Department'), col('status', 'Status', { render: badge }),
    col('send', 'Action', { sortable: false, render: (_, r) => <Button variant="secondary" onClick={e => { e.stopPropagation(); setSendTo(r); setSendDept(r.department || ''); }}><Send size={14} /> Send to department</Button> })];
  const routingColumns = [col('studentId', 'Student ID'), col('name', 'Student'), col('department', 'Department'), col('source', 'Source'), col('createdAt', 'Sent', { render: when }), col('status', 'Status', { render: badge }), col('remarks', 'Department remarks'),
    col('act', 'Action', { sortable: false, render: (_, r) => r.status === 'Returned' ? <Button variant="secondary" onClick={() => resend(r)}>Send again</Button> : null })];

  return <>
    <SectionTitle eyebrow={`${role.toUpperCase()} WORKSPACE · STUDENT RECORDS`} title="Student records" description="Only the Registrar creates official student records. Each new record is sent to its department, which can accept or return it."
      action={<div className="form-actions"><Button variant="secondary" onClick={() => setChargeShow(true)}>Post student charge</Button><Button variant="secondary" onClick={() => exportReport('students').then(n => onNotify(`Exported ${n} student records.`, 'success')).catch(e => onNotify(e.message, 'error'))}><FileDown size={15} /> Export report</Button><Button onClick={() => setShow(true)}><Plus size={15} /> Add student record</Button></div>} />
    <section className="panel"><div className="panel-head"><div><span className="eyebrow">STUDENT DIRECTORY</span><h2>Official records</h2></div><div className="filter-chip"><label>Course</label><SelectField value={filter} onChange={e => setFilter(e.target.value)}><option>All courses</option>{courses.map(x => <option key={x}>{x}</option>)}</SelectField></div></div>
      <DataTable columns={columns} rows={visible.map(r => ({ ...r, send: '' }))} empty="No student records are available." exportName="student-records" /></section>
    <section className="panel"><div className="panel-head"><div><span className="eyebrow">DEPARTMENT ROUTING</span><h2>Records sent to departments</h2><p>Departments accept, return, or retrieve records. They cannot create them.</p></div></div>
      <DataTable columns={routingColumns} rows={routing.map(r => ({ ...r, act: '' }))} empty="No records have been sent to a department yet." exportName="department-routing" /></section>
    <section className="panel"><div className="panel-head"><div><span className="eyebrow">CHARGES</span><h2>Posted student fees</h2></div></div>
      <DataTable exportName="student-charges" rows={charges} empty="No charges have been posted." columns={[col('studentId', 'Student ID'), col('student', 'Student'), col('term', 'Term'), col('description', 'Description'), col('amountCents', 'Amount', { render: v => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format((v || 0) / 100), csv: v => ((Number(v) || 0) / 100).toFixed(2) })]} /></section>
    <section className="panel"><div className="panel-head"><div><span className="eyebrow">GRADE ENCODING</span><h2>Course grades</h2></div><Link className="button button-primary" to="/academics"><BookOpen size={15} /> Open grade encoding</Link></div></section>

    <Modal open={show} title="Add student record" onClose={() => setShow(false)}><form onSubmit={create}><div className="form-stack">
      {[['name', 'Student name'], ['email', 'University email'], ['id', 'Student ID'], ['course', 'Course'], ['year', 'Year level'], ['section', 'Section']].map(([key, label]) => <FormField key={key} label={label} required><input required type={key === 'email' ? 'email' : 'text'} value={form[key]} onChange={e => setForm({ ...form, [key]: e.target.value })} /></FormField>)}
      <FormField label="Department" required help="Choose an active department account so the record appears in its pending queue."><SelectField required value={form.department} onChange={e => setForm({ ...form, department: e.target.value })}><option value="">Select department</option>{departments.map(d => <option key={d} value={d}>{d}</option>)}</SelectField></FormField>
      <FormField label="Initial password" required help="Use at least 5 characters."><input required type="password" minLength={5} value={form.initialPassword} onChange={e => setForm({ ...form, initialPassword: e.target.value })} /></FormField></div>
      <div className="modal-actions"><Button type="button" variant="secondary" onClick={() => setShow(false)}>Cancel</Button><Button type="submit" disabled={busy}>Add official record</Button></div></form></Modal>
    <Modal open={chargeShow} title="Post student charge" onClose={() => setChargeShow(false)}><form onSubmit={postCharge}><div className="form-stack">
      <FormField label="Student" required><SelectField required value={charge.studentId} onChange={e => setCharge({ ...charge, studentId: e.target.value })}><option value="">Select a student record</option>{rows.map(s => <option key={s.id} value={s.id}>{s.id} · {s.name}</option>)}</SelectField></FormField>
      <FormField label="Academic term" required><input required value={charge.term} onChange={e => setCharge({ ...charge, term: e.target.value })} /></FormField>
      <FormField label="Fee or charge" required><input required value={charge.description} onChange={e => setCharge({ ...charge, description: e.target.value })} /></FormField>
      <FormField label="Amount (PHP)" required><input type="number" min="0.01" step="0.01" required value={charge.amount} onChange={e => setCharge({ ...charge, amount: e.target.value })} /></FormField></div>
      <div className="modal-actions"><Button type="button" variant="secondary" onClick={() => setChargeShow(false)}>Cancel</Button><Button type="submit">Save charge</Button></div></form></Modal>
    <Modal open={!!sendTo} title="Send record to a department" onClose={() => setSendTo(null)}><form onSubmit={send}><p className="modal-intro">{sendTo?.name} · {sendTo?.id}</p><div className="form-stack"><FormField label="Department" required><SelectField required value={sendDept} onChange={e => setSendDept(e.target.value)}><option value="">Select department</option>{departments.map(d => <option key={d} value={d}>{d}</option>)}</SelectField></FormField></div><div className="modal-actions"><Button type="button" variant="secondary" onClick={() => setSendTo(null)}>Cancel</Button><Button type="submit" disabled={busy}>Send record</Button></div></form></Modal>
  </>;
}

// ---------------------------------------------------------------- Grade encoding
export function GradeEncoding() {
  const { onNotify } = usePageContext();
  const [students, setStudents] = useState([]), [sid, setSid] = useState(''), [grades, setGrades] = useState([]), [dirty, setDirty] = useState(false);
  const [show, setShow] = useState(false), [subject, setSubject] = useState({ code: '', name: '', units: '3' });
  useEffect(() => { api.students().then(setStudents).catch(e => onNotify(e.message, 'error')); }, []);
  useEffect(() => { setDirty(false); if (!sid) { setGrades([]); return; } api.grades(sid).then(setGrades).catch(e => onNotify(e.message, 'error')); }, [sid]);
  const edit = (code, key, value) => { setDirty(true); setGrades(rows => rows.map(r => r.code === code ? { ...r, [key]: value } : r)); };
  const save = async () => { try { await api.updateGrades(sid, grades); setDirty(false); onNotify('Grades saved.', 'success'); } catch (e) { onNotify(e.message, 'error'); } };
  const add = async e => { e.preventDefault(); try { const item = await api.addGrade(sid, { ...subject, units: Number(subject.units) }); setGrades(rows => [...rows, item].sort((a, b) => a.code.localeCompare(b.code))); setShow(false); setSubject({ code: '', name: '', units: '3' }); onNotify('Subject added.', 'success'); } catch (err) { onNotify(err.message, 'error'); } };
  const student = students.find(s => s.id === sid);
  return <>
    <SectionTitle eyebrow="REGISTRAR WORKSPACE · ACADEMIC RECORDS" title="Grade encoding" description="Choose a student, then record subjects, midterm and final grades." action={sid && <Button onClick={() => setShow(true)}><Plus size={15} /> Add subject</Button>} />
    <section className="panel"><div className="form-grid"><FormField label="Student" required><SelectField value={sid} onChange={e => { if (!dirty || window.confirm('Discard unsaved grade changes?')) setSid(e.target.value); }}><option value="">Select a student record</option>{students.map(s => <option key={s.id} value={s.id}>{s.id} · {s.name}</option>)}</SelectField></FormField></div></section>
    {sid && <section className="panel"><div className="panel-head"><div><span className="eyebrow">{student?.course} · {student?.section}</span><h2>{student?.name}</h2></div><Button onClick={save} disabled={!dirty}>Save grades</Button></div>
      <DataTable searchable={false} pageSize={10} exportName={`grades-${sid}`} empty="No subjects are recorded for this student yet. Use Add subject." rows={grades.map(r => ({ ...r, id: r.code }))} columns={[col('code', 'Course code'), col('name', 'Subject'), col('units', 'Units'),
        col('midterm', 'Midterm', { render: (v, r) => <input className="grade-input" aria-label={`Midterm for ${r.code}`} maxLength={10} value={v ?? ''} onChange={e => edit(r.code, 'midterm', e.target.value)} />, csv: v => v }),
        col('final', 'Final', { render: (v, r) => <input className="grade-input" aria-label={`Final for ${r.code}`} maxLength={10} value={v ?? ''} onChange={e => edit(r.code, 'final', e.target.value)} />, csv: v => v }),
        col('grade', 'Final grade', { render: (v, r) => <input className="grade-input" aria-label={`Final grade for ${r.code}`} maxLength={10} value={v ?? ''} onChange={e => edit(r.code, 'grade', e.target.value)} />, csv: v => v }),
        col('status', 'Status', { render: (v, r) => <SelectField aria-label={`Status for ${r.code}`} value={v || 'In progress'} onChange={e => edit(r.code, 'status', e.target.value)}>{['In progress', 'Passed', 'Failed', 'Incomplete', 'Dropped'].map(s => <option key={s}>{s}</option>)}</SelectField>, csv: v => v })]} /></section>}
    <Modal open={show} title="Add subject" onClose={() => setShow(false)}><form onSubmit={add}><div className="form-stack">
      <FormField label="Course code" required><input required value={subject.code} onChange={e => setSubject({ ...subject, code: e.target.value })} /></FormField>
      <FormField label="Subject name" required><input required value={subject.name} onChange={e => setSubject({ ...subject, name: e.target.value })} /></FormField>
      <FormField label="Units" required><input required type="number" min="0" max="12" step="1" value={subject.units} onChange={e => setSubject({ ...subject, units: e.target.value })} /></FormField></div>
      <div className="modal-actions"><Button type="button" variant="secondary" onClick={() => setShow(false)}>Cancel</Button><Button type="submit">Add subject</Button></div></form></Modal>
  </>;
}

// ---------------------------------------------------------------- Enrollment summary
export function EnrollmentSummary() {
  const { onNotify } = usePageContext();
  const [items, setItems] = useState(null), [students, setStudents] = useState([]), [term, setTerm] = useState('');
  const [show, setShow] = useState(false), [form, setForm] = useState({ studentId: '', term: '', units: '21', status: 'Enrolled' });
  const load = () => { api.enrollmentList().then(setItems).catch(e => { setItems([]); onNotify(e.message, 'error'); }); };
  useEffect(() => { load(); api.students().then(setStudents).catch(() => {}); }, []);
  const terms = useMemo(() => [...new Set((items || []).map(i => i.term))], [items]);
  useEffect(() => { if (!term && terms.length) setTerm(terms[0]); }, [terms]);
  const scoped = (items || []).filter(i => i.term === term);
  const enrolled = scoped.filter(i => i.status === 'Enrolled');
  const unitsTotal = enrolled.reduce((n, i) => n + Number(i.units || 0), 0);
  const notEnrolled = students.filter(s => s.status === 'Active' && !enrolled.some(i => i.studentId === s.id)).length;
  const byCourse = useMemo(() => { const map = new Map(); for (const i of scoped) { const key = `${i.course || '—'}|${i.year || '—'}`; const row = map.get(key) || { id: key, course: i.course || '—', year: i.year || '—', students: 0, enrolled: 0, pending: 0, dropped: 0, units: 0 }; row.students++; if (i.status === 'Enrolled') { row.enrolled++; row.units += Number(i.units || 0); } if (i.status === 'Pending') row.pending++; if (i.status === 'Dropped') row.dropped++; map.set(key, row); } return [...map.values()].sort((a, b) => a.course.localeCompare(b.course) || a.year.localeCompare(b.year)); }, [items, term]);
  const save = async e => { e.preventDefault(); try { await api.saveEnrollment({ ...form, units: Number(form.units) }); setShow(false); setTerm(form.term.trim()); load(); onNotify('Enrollment saved.', 'success'); } catch (err) { onNotify(err.message, 'error'); } };
  return <>
    <SectionTitle eyebrow="REGISTRAR WORKSPACE · ENROLLMENT" title="Enrollment summary" description="Headcount, units, and status by term, course, and year level."
      action={<div className="form-actions"><Button variant="secondary" onClick={() => exportReport('enrollments').then(n => onNotify(`Exported ${n} enrollment records.`, 'success')).catch(e => onNotify(e.message, 'error'))}><FileDown size={15} /> Export report</Button><Button onClick={() => { setForm(f => ({ ...f, term: term || f.term })); setShow(true); }}><Plus size={15} /> Record enrollment</Button></div>} />
    <section className="panel"><div className="form-grid"><FormField label="Academic term"><SelectField value={term} onChange={e => setTerm(e.target.value)}>{terms.length===0&&<option value="">No enrollment terms yet</option>}{terms.map(t => <option key={t}>{t}</option>)}</SelectField></FormField></div></section>
    <div className="metric-grid"><MetricCard label="Enrolled students" value={enrolled.length} detail={term || 'No term selected'} icon={CalendarCheck2} /><MetricCard label="Total units" value={unitsTotal} detail="Across enrolled students" icon={BookOpen} /><MetricCard label="Pending" value={scoped.filter(i => i.status === 'Pending').length} detail="Awaiting confirmation" icon={Users} accent="gold" /><MetricCard label="Not yet enrolled" value={items ? notEnrolled : '—'} detail="Active students without an enrolled record" icon={Users} accent="gold" /></div>
    <section className="panel"><div className="panel-head"><div><span className="eyebrow">BREAKDOWN</span><h2>By course and year level</h2></div></div>
      <DataTable searchable={false} exportName="enrollment-by-course" rows={byCourse} empty="No enrollment records for this term." columns={[col('course', 'Course'), col('year', 'Year level'), col('students', 'Records'), col('enrolled', 'Enrolled'), col('pending', 'Pending'), col('dropped', 'Dropped'), col('units', 'Units')]} /></section>
    <section className="panel"><div className="panel-head"><div><span className="eyebrow">STUDENT ENROLLMENTS</span><h2>{term || 'All terms'}</h2></div></div>
      <DataTable exportName="enrollments" rows={scoped.map(i => ({ ...i, id: `${i.studentId}-${i.term}` }))} empty={items === null ? 'Loading…' : 'No enrollment records for this term.'} columns={[col('studentId', 'Student ID'), col('student', 'Student'), col('course', 'Course'), col('year', 'Year level'), col('section', 'Section'), col('units', 'Units'), col('date', 'Date'), col('status', 'Status', { render: badge })]} /></section>
    <Modal open={show} title="Record enrollment" onClose={() => setShow(false)}><form onSubmit={save}><div className="form-stack">
      <FormField label="Student" required><SelectField required value={form.studentId} onChange={e => setForm({ ...form, studentId: e.target.value })}><option value="">Select a student record</option>{students.map(s => <option key={s.id} value={s.id}>{s.id} · {s.name}</option>)}</SelectField></FormField>
      <FormField label="Academic term" required><input required list="term-options" value={form.term} placeholder="e.g. 1st Semester 2026-2027" onChange={e => setForm({ ...form, term: e.target.value })} /></FormField><datalist id="term-options">{terms.map(t => <option key={t} value={t} />)}</datalist>
      <FormField label="Registered units" required><input required type="number" min="0" max="40" step="1" value={form.units} onChange={e => setForm({ ...form, units: e.target.value })} /></FormField>
      <FormField label="Status" required><SelectField value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>{['Enrolled', 'Pending', 'Dropped'].map(s => <option key={s}>{s}</option>)}</SelectField></FormField></div>
      <div className="modal-actions"><Button type="button" variant="secondary" onClick={() => setShow(false)}>Cancel</Button><Button type="submit">Save enrollment</Button></div></form></Modal>
  </>;
}

// ---------------------------------------------------------------- Reports
export function Reports() {
  const { onNotify } = usePageContext();
  const [items, setItems] = useState([]), [busy, setBusy] = useState('');
  useEffect(() => { api.reports().then(setItems).catch(e => onNotify(e.message, 'error')); }, []);
  const run = async name => { setBusy(name); try { const n = await exportReport(name); onNotify(`Exported ${n} rows.`, 'success'); } catch (e) { onNotify(e.message, 'error'); } finally { setBusy(''); } };
  return <>
    <SectionTitle eyebrow="REGISTRAR WORKSPACE · REPORTS" title="Reports" description="Download registrar reports as CSV files that open in Excel or Google Sheets. Every table in the system also has its own Export CSV button." />
    <div className="role-cards">{items.map(r => <article key={r.name}><span><FileDown size={15} />{r.title}</span><p>{r.count} {r.count === 1 ? 'record' : 'records'}</p><Button variant="secondary" disabled={busy === r.name} onClick={() => run(r.name)}><Download size={14} /> {busy === r.name ? 'Preparing…' : 'Export CSV'}</Button></article>)}</div>
  </>;
}
