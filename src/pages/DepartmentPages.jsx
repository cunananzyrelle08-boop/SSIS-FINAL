import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Check, Download } from 'lucide-react';
import { Button, DataTable, FormField, MetricCard, Modal, SectionTitle, StatusBadge } from '../components/ui.jsx';
import { api } from '../services/api.js';
import { Users, Clock3 } from 'lucide-react';

const col = (key, label, extra = {}) => ({ key, label, ...extra });
const when = value => (value ? new Date(value).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' }) : '');

// Departments never create student records: they accept or return what the Registrar sends, or retrieve an existing record by student ID.
export function DepartmentRecords() {
  const { onNotify } = useOutletContext() || { onNotify: () => {} };
  const [rows, setRows] = useState([]), [active, setActive] = useState(null), [remarks, setRemarks] = useState(''), [retrieve, setRetrieve] = useState(false), [studentId, setStudentId] = useState('');
  const load = () => api.departmentRecords().then(setRows).catch(e => onNotify(e.message, 'error'));
  useEffect(() => { load(); }, []);
  const decide = async status => { try { await api.decideDepartmentRecord(active.id, { status, remarks }); setActive(null); setRemarks(''); load(); onNotify(status === 'Accepted' ? 'Record accepted. A clearance item was opened for this student.' : 'Record returned to the Registrar.', 'success'); } catch (e) { onNotify(e.message, 'error'); } };
  const fetchRecord = async e => { e.preventDefault(); try { await api.retrieveDepartmentRecord({ studentId: studentId.trim() }); setRetrieve(false); setStudentId(''); load(); onNotify('Record retrieved from the Registrar.', 'success'); } catch (err) { onNotify(err.message, 'error'); } };
  const pending = rows.filter(r => r.status === 'Pending').length;
  return <>
    <SectionTitle eyebrow="DEPARTMENT WORKSPACE · STUDENT RECORDS" title="Student records" description="Accept or return records sent by the Registrar, or retrieve an existing record by student ID. Departments cannot create student records." action={<Button onClick={() => setRetrieve(true)}><Download size={15} /> Retrieve a record</Button>} />
    <div className="metric-grid"><MetricCard label="Waiting for you" value={pending} detail="Sent by the Registrar" icon={Clock3} accent="gold" /><MetricCard label="Accepted records" value={rows.filter(r => r.status === 'Accepted').length} detail="In your department" icon={Users} /></div>
    <section className="panel"><div className="panel-head"><div><span className="eyebrow">FROM THE REGISTRAR</span><h2>Department records</h2></div></div>
      <DataTable exportName="department-records" rows={rows} empty="No records have been sent to your department." columns={[col('studentId', 'Student ID'), col('name', 'Student'), col('course', 'Course'), col('year', 'Year level'), col('section', 'Section'), col('source', 'Source'), col('createdAt', 'Sent', { render: when }), col('status', 'Status', { render: v => <StatusBadge status={v} /> }), col('remarks', 'Remarks'),
        col('act', 'Action', { sortable: false, render: (_, r) => r.status === 'Pending' ? <Button variant="secondary" onClick={() => { setActive(r); setRemarks(''); }}>Review</Button> : null })]} /></section>
    <Modal open={!!active} title="Review student record" onClose={() => setActive(null)}><div className="request-detail"><div className="request-detail-top"><span className="request-id">{active?.studentId}</span><StatusBadge status={active?.status || ''} /></div>
      <div className="detail-grid">{[['Student', active?.name], ['Email', active?.email], ['Course', active?.course], ['Year level', active?.year], ['Section', active?.section], ['Sent by', active?.sentBy]].map(([k, v]) => <div key={k}><small>{k}</small><b>{v || '—'}</b></div>)}</div>
      <FormField label="Remarks" help="Required when returning a record to the Registrar."><textarea rows="3" value={remarks} onChange={e => setRemarks(e.target.value)} /></FormField></div>
      <div className="modal-actions"><Button variant="danger" onClick={() => decide('Returned')}>Return to Registrar</Button><Button onClick={() => decide('Accepted')}><Check size={15} /> Accept record</Button></div></Modal>
    <Modal open={retrieve} title="Retrieve a student record" onClose={() => setRetrieve(false)}><form onSubmit={fetchRecord}><p className="modal-intro">Enter the student ID of an official record held by the Registrar. If no record exists, ask the Registrar to create it.</p><div className="form-stack"><FormField label="Student ID" required><input required value={studentId} onChange={e => setStudentId(e.target.value)} /></FormField></div><div className="modal-actions"><Button type="button" variant="secondary" onClick={() => setRetrieve(false)}>Cancel</Button><Button type="submit">Retrieve record</Button></div></form></Modal>
  </>;
}
