import { useEffect, useState } from 'react';
import { Link, Navigate, NavLink, Outlet, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { Bell, BookOpen, BriefcaseBusiness, Building2, CalendarDays, ChartNoAxesColumn, CheckCircle2, ClipboardList, CreditCard, FileDown, FileText, GraduationCap, LayoutDashboard, LogOut, Menu, PanelLeftClose, Search, Settings, ShieldCheck, UserRound, Users, X } from 'lucide-react';
import Login from './pages/Login.jsx';
import { Dashboard, Profile, Academics, Schedule, Documents, Enrollments, Payments, Clearance, StudentPaymentManagement, Cashier, Department, Admin } from './pages/Pages.jsx';
import { Registrar, GradeEncoding, EnrollmentSummary, Reports } from './pages/RegistrarPages.jsx';
import { DepartmentRecords } from './pages/DepartmentPages.jsx';
import { Notice } from './components/ui.jsx';
import { api } from './services/api.js';

const iconMap={Dashboard:LayoutDashboard, 'My profile':UserRound, 'Grades & subjects':BookOpen, 'Document requests':FileText, Enrollment:CalendarDays, Payments:CreditCard, Clearance:ShieldCheck, 'Student records':Users, 'Grade encoding':ChartNoAxesColumn, 'Request queue':ClipboardList, 'Payment records':CreditCard, 'Clearance review':CheckCircle2, 'User management':Settings, 'Course code':BookOpen, 'Student payment management':CreditCard, 'Enrollment summary':CalendarDays, Reports:FileDown};
const navFor={
  Student:[['STUDENT SERVICES',[['Dashboard','/dashboard'],['My profile','/profile'],['Grades & subjects','/academics'],['Course code','/schedule'],['Document requests','/documents'],['Enrollment','/enrollment'],['Payments','/payments'],['Clearance','/clearance']]]],
  Registrar:[['REGISTRAR WORKSPACE',[['Dashboard','/dashboard'],['Student records','/registrar'],['Grade encoding','/academics'],['Request queue','/documents'],['Enrollment summary','/enrollment'],['Reports','/reports']]]],
  Cashier:[['CASHIER WORKSPACE',[['Dashboard','/dashboard'],['Payment records','/cashier'],['Student payment management','/cashier/payments']]]],
  Department:[['DEPARTMENT WORKSPACE',[['Dashboard','/dashboard'],['Clearance review','/department'],['Student records','/department/records']]]],
  Admin:[['ADMIN WORKSPACE',[['Dashboard','/dashboard'],['User management','/admin'],['Student records','/registrar'],['Grade encoding','/academics'],['Enrollment summary','/enrollment'],['Request queue','/documents'],['Payment records','/cashier'],['Clearance review','/department'],['Reports','/reports']]]],
};

function Shell({role, identity, studentId, onLogout, onNotify}) {
  const [menuOpen,setMenuOpen]=useState(false); const [profileOpen,setProfileOpen]=useState(false); const location=useLocation();
  const roleNav=navFor[role]||navFor.Student;
  const titleFor=roleNav.flatMap(group=>group[1]).find(([,path])=>path===location.pathname)?.[0]||'Dashboard';
  return <div className="app-shell"><div className={`mobile-shade ${menuOpen?'show':''}`} onClick={()=>setMenuOpen(false)} />
    <aside className={`sidebar ${menuOpen?'sidebar-open':''}`}>
      <div className="brand"><div className="brand-mark"><GraduationCap size={21}/></div><div><strong>SSIS</strong><span>BCCD University</span></div><button className="sidebar-close icon-button" aria-label="Close navigation" onClick={()=>setMenuOpen(false)}><X size={18}/></button></div>
      <div className="workspace-label"><span className="live-dot"/> {role.toUpperCase()} WORKSPACE</div>
      <nav className="side-nav" aria-label="Main navigation">{roleNav.map(([group,links])=><div className="nav-group" key={group}><div className="nav-caption">{group}</div>{links.map(([label,path])=>{const Icon=iconMap[label]||LayoutDashboard;return <NavLink key={path+label} to={path} onClick={()=>setMenuOpen(false)} end={path==='/dashboard'} className={({isActive})=>`nav-link ${isActive?'active':''}`}><Icon size={17}/><span>{label}</span></NavLink>})}</div>)}</nav>
      <div className="sidebar-bottom"><div className="help-card"><span>Need a hand?</span><strong>Service desk · Mon–Fri</strong><small>8:00 AM–5:00 PM</small><a href="mailto:helpdesk@bccd.edu.ph">Contact support ↗</a></div><div className="secure-note"><ShieldCheck size={15}/><div><b>Secure workspace</b><small>Role based access</small></div></div></div>
    </aside>
    <main className="main-area"><header className="topbar"><button className="mobile-menu icon-button" aria-label="Open navigation" onClick={()=>setMenuOpen(true)}><Menu size={20}/></button><div className="topbar-actions"><button className="user-menu" onClick={()=>setProfileOpen(v=>!v)}><span className="avatar">{identity.name.split(' ').map(x=>x[0]).slice(0,2).join('')}</span><span className="user-menu-copy"><b>{identity.name}</b><small>{role}</small></span><span className="chevron">⌄</span></button>{profileOpen&&<div className="profile-popover"><span className="eyebrow">SIGNED IN AS</span><b>{identity.name}</b><small>{identity.email}</small><button onClick={onLogout}><LogOut size={15}/> Sign out</button></div>}</div></header>
      <div className="breadcrumb"><span>SSIS</span><span>/</span><span>{role}</span><span>/</span><b>{titleFor}</b></div>
      <div className="page-content"><Outlet context={{role,identity,studentId,onNotify}}/></div>
      <footer className="page-footer"><span>© 2026 BCCD University · Student Services Information System</span><span>{role} workspace</span></footer>
    </main><Notice notice={null}/>
  </div>;
}

function ProtectedShell({session,authReady,setNotice,onLogout}) { if(!authReady)return null; return session?<Shell {...session} onLogout={onLogout} onNotify={(message,type='success')=>setNotice({message,type})}/>:<Navigate to="/login" replace/>; }

export default function App(){
  const [session,setSession]=useState(null); const [authReady,setAuthReady]=useState(false); const [notice,setNotice]=useState(null); const navigate=useNavigate();
  useEffect(()=>{const handler=e=>setNotice(e.detail);window.addEventListener('ssis-notice',handler);return()=>window.removeEventListener('ssis-notice',handler)},[]);
  useEffect(()=>{let active=true;api.me().then(user=>{if(active)setSession({role:user.role,identity:{name:user.name,email:user.email},studentId:user.studentId,userId:user.id})}).catch(()=>{}).finally(()=>{if(active)setAuthReady(true)});return()=>{active=false}},[]);
  const login=(user)=>{const details={role:user.role,identity:{name:user.name,email:user.email},studentId:user.studentId,userId:user.id};setSession(details);setNotice({message:`Welcome to your ${details.role.toLowerCase()} workspace, ${details.identity.name.split(' ')[0]}.`,type:'success'});navigate('/dashboard')};
  const logout=async()=>{try{await api.logout()}catch{}setSession(null);navigate('/login')};
  return <><Routes><Route path="/login" element={!authReady?null:session?<Navigate to="/dashboard" replace/>:<Login onLogin={login} onNotify={(message,type='error')=>setNotice({message,type})}/>}/><Route element={<ProtectedShell session={session} authReady={authReady} setNotice={setNotice} onLogout={logout}/> }>
    <Route path="/dashboard" element={<Dashboard/>}/><Route path="/profile" element={session?.role==='Student'?<Profile/>:<Navigate to="/dashboard" replace/>}/><Route path="/academics" element={session?.role==='Student'?<Academics/>:['Registrar','Admin'].includes(session?.role)?<GradeEncoding/>:<Navigate to="/dashboard" replace/>}/><Route path="/schedule" element={session?.role==='Student'?<Schedule/>:<Navigate to="/dashboard" replace/>}/><Route path="/documents" element={session?.role==='Student'||session?.role==='Registrar'||session?.role==='Admin'?<Documents/>:<Navigate to="/dashboard" replace/>}/><Route path="/enrollment" element={session?.role==='Student'?<Enrollments/>:['Registrar','Admin'].includes(session?.role)?<EnrollmentSummary/>:<Navigate to="/dashboard" replace/>}/><Route path="/reports" element={['Registrar','Admin'].includes(session?.role)?<Reports/>:<Navigate to="/dashboard" replace/>}/><Route path="/payments" element={session?.role==='Student'?<Payments/>:<Navigate to="/dashboard" replace/>}/><Route path="/clearance" element={session?.role==='Student'?<Clearance/>:<Navigate to="/dashboard" replace/>}/><Route path="/registrar" element={['Admin','Registrar'].includes(session?.role)?<Registrar/>:<Navigate to="/dashboard" replace/>}/><Route path="/department/records" element={session?.role==='Department'?<DepartmentRecords/>:<Navigate to="/dashboard" replace/>}/><Route path="/cashier" element={['Cashier','Admin'].includes(session?.role)?<Cashier/>:<Navigate to="/dashboard" replace/>}/><Route path="/cashier/payments" element={['Cashier','Admin'].includes(session?.role)?<StudentPaymentManagement/>:<Navigate to="/dashboard" replace/>}/><Route path="/department" element={session?.role==='Department'||session?.role==='Admin'?<Department/>:<Navigate to="/dashboard" replace/>}/><Route path="/admin" element={session?.role==='Admin'?<Admin/>:<Navigate to="/dashboard" replace/>}/><Route path="*" element={<Navigate to={session?'/dashboard':'/login'} replace/>}/>
  </Route></Routes><Notice notice={notice} onClose={()=>setNotice(null)}/></>;
}



