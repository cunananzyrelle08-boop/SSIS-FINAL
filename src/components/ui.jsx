import { useMemo, useState } from 'react';
import { Search, X, ChevronDown, ChevronLeft, ChevronRight, ArrowUpDown, Check, Info, AlertCircle, Eye, EyeOff, Download } from 'lucide-react';
import { downloadCsv } from '../services/exportCsv.js';

export function StatusBadge({status}) {
  const s = String(status||'');
  // Order matters: "Inactive"/"Unpaid"/"Partially Paid" must not be caught by the plain "active"/"paid" checks.
  const tone = /inactive|reject|overdue|unpaid|fail|returned|dropped/i.test(s) ? 'danger'
    : /pending|review|processing|progress|partial|incomplete|ready/i.test(s) ? 'warning'
    : /paid|passed|cleared|completed|enrolled|active|approved|accepted/i.test(s) ? 'success' : 'neutral';
  return <span className={`badge badge-${tone}`}><i />{s}</span>;
}

export function Button({children, variant='primary', className='', ...props}) { return <button className={`button button-${variant} ${className}`} {...props}>{children}</button>; }

export function Notice({notice, onClose}) {
  if (!notice) return null;
  const Icon = notice.type === 'error' ? AlertCircle : notice.type === 'info' ? Info : Check;
  return <div className={`toast toast-${notice.type || 'success'}`} role="status"><Icon size={18}/><span>{notice.message}</span><button aria-label="Dismiss notification" onClick={onClose}><X size={16}/></button></div>;
}

export function Modal({open, title, children, onClose, wide=false}) {
  if (!open) return null;
  return <div className="modal-backdrop" onMouseDown={e=>e.target===e.currentTarget && onClose()}><section className={`modal ${wide?'modal-wide':''}`} role="dialog" aria-modal="true" aria-label={title}><header className="modal-head"><div><span className="eyebrow">SSIS · BCCD University</span><h2>{title}</h2></div><button className="icon-button" aria-label="Close dialog" onClick={onClose}><X size={19}/></button></header>{children}</section></div>;
}

const slug = text => String(text||'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');

export function DataTable({columns, rows, searchable=true, pageSize=5, empty='No records to show', onRowClick, exportName}) {
  const [query,setQuery]=useState(''); const [sort,setSort]=useState(null); const [page,setPage]=useState(0);
  const filtered = useMemo(()=>{
    let data=rows.filter(row=>!query || Object.values(row).join(' ').toLowerCase().includes(query.toLowerCase()));
    if(sort) data=[...data].sort((a,b)=>String(a[sort.key]??'').localeCompare(String(b[sort.key]??''),undefined,{numeric:true})*(sort.dir==='asc'?1:-1));
    return data;
  },[rows,query,sort]);
  const pages=Math.max(1,Math.ceil(filtered.length/pageSize));
  const current=Math.min(page,pages-1);
  const exportable=columns.filter(col=>col.exportable!==false&&!/^(action|actions|details)$/i.test(col.label));
  const exportRows=()=>{
    const name=exportName||slug(document.querySelector('.section-title h1')?.textContent)||'export';
    downloadCsv(`ssis-${name}-${new Date().toISOString().slice(0,10)}.csv`,exportable.map(col=>col.label),filtered.map(row=>exportable.map(col=>col.csv?col.csv(row[col.key],row):row[col.key])));
  };
  return <div className="table-wrap"><div className="table-toolbar">{searchable?<label className="search-field"><Search size={16}/><input value={query} onChange={e=>{setQuery(e.target.value);setPage(0)}} placeholder="Search records" aria-label="Search records"/></label>:<span/>}<span className="muted small">{filtered.length} {filtered.length===1?'record':'records'}</span><button type="button" className="button button-secondary export-button" onClick={exportRows} disabled={!filtered.length} title="Download the records shown here as a CSV file"><Download size={14}/> Export CSV</button></div>
    <div className="table-scroll"><table><thead><tr>{columns.map((col,i)=><th key={`${col.key}-${i}`}><button className="sort-button" onClick={()=>{setPage(0);setSort(s=>s?.key===col.key?{key:col.key,dir:s.dir==='asc'?'desc':'asc'}:{key:col.key,dir:'asc'})}}>{col.label}{col.sortable!==false&&<ArrowUpDown size={12}/>}</button></th>)}</tr></thead><tbody>{filtered.slice(current*pageSize,(current+1)*pageSize).map((row,i)=><tr key={row.id||i} onClick={()=>onRowClick?.(row)} className={onRowClick?'clickable-row':''}>{columns.map((col,ci)=><td key={`${col.key}-${ci}`}>{col.render?col.render(row[col.key],row):row[col.key]}</td>)}</tr>)}{filtered.length===0&&<tr><td colSpan={columns.length} className="empty-cell">{empty}</td></tr>}</tbody></table></div>
    <div className="table-footer"><span>Showing {filtered.length? current*pageSize+1:0}–{Math.min((current+1)*pageSize,filtered.length)} of {filtered.length}</span><div className="pagination"><button aria-label="Previous page" disabled={current===0} onClick={()=>setPage(current-1)}><ChevronLeft size={16}/></button><span>{current+1} / {pages}</span><button aria-label="Next page" disabled={current>=pages-1} onClick={()=>setPage(current+1)}><ChevronRight size={16}/></button></div></div>
  </div>;
}

export function FormField({label,error,help,children,required}) { return <label className={`form-field ${error?'has-error':''}`}><span>{label}{required&&<b className="required"> *</b>}</span>{children}{help&&<small className="field-help">{help}</small>}{error&&<small className="field-error">{error}</small>}</label>; }

export function PasswordField(props) { const [show,setShow]=useState(false); return <div className="password-field"><input {...props} type={show?'text':'password'} /><button type="button" aria-label={show?'Hide password':'Show password'} onClick={()=>setShow(v=>!v)}>{show?<EyeOff size={17}/>:<Eye size={17}/>}</button></div>; }

export function SelectField({children,...props}) { return <div className="select-wrap"><select {...props}>{children}</select><ChevronDown size={15}/></div>; }

export function SectionTitle({eyebrow,title,description,action,children}) { return <>{<div className="section-title"><div>{eyebrow&&<span className="eyebrow">{eyebrow}</span>}<h1>{title}</h1>{description&&<p>{description}</p>}</div>{action}</div>}{children}</>; }

export function MetricCard({label,value,detail,icon:Icon,accent='green'}) { return <article className={`metric-card metric-${accent}`}><div className="metric-top"><span>{label}</span><span className="metric-icon">{Icon&&<Icon size={17}/>}</span></div><strong>{value}</strong><small>{detail}</small></article>; }
