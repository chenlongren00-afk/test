import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Activity, ClipboardList, RefreshCw, ShieldCheck, Users } from 'lucide-react';
import './styles.css';

type Task = { id: string; title: string; category?: string; suburb?: string; budget?: number; status: string };
const API = import.meta.env.VITE_API_URL || 'http://localhost:4242';

function AdminApp() {
  const [tasks, setTasks] = useState<Task[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState('');
  const load = async () => { setLoading(true); setError(''); try { const response = await fetch(`${API}/api/app/tasks`); if (!response.ok) throw new Error('API unavailable'); setTasks(await response.json()); } catch { setError('Unable to reach the marketplace API.'); } finally { setLoading(false); } };
  useEffect(() => { void load(); }, []);
  const stats = useMemo(() => ({ open: tasks.filter(t => t.status === 'open').length, value: tasks.reduce((sum, t) => sum + (t.budget || 0), 0) }), [tasks]);
  return <div className="shell"><aside><div className="brand"><span className="mark">AH</span><div><strong>Australian Helper</strong><small>Operations</small></div></div><nav><a className="active"><ClipboardList size={17}/>Tasks</a><a><Users size={17}/>Users</a><a><ShieldCheck size={17}/>Trust & Safety</a></nav><div className="side-foot"><span className="dot"/>System online</div></aside><main><header><div><p className="eyebrow">OPERATIONS / MARKETPLACE</p><h1>Task overview</h1><p className="muted">Monitor the live task feed while modules migrate.</p></div><button className="icon-button" title="Refresh" onClick={() => void load()}><RefreshCw size={18}/></button></header><section className="metrics"><div><Activity/><span>Open tasks</span><b>{stats.open}</b></div><div><ClipboardList/><span>Visible task value</span><b>${stats.value.toFixed(0)}</b></div><div><ShieldCheck/><span>API status</span><b>{error ? 'Attention' : 'Healthy'}</b></div></section><section className="panel"><div className="panel-head"><div><h2>Live task feed</h2><p className="muted">Public marketplace records from the compatibility API.</p></div><button className="outline" onClick={() => void load()}><RefreshCw size={15}/> Refresh</button></div>{loading ? <p className="empty">Loading tasks...</p> : error ? <p className="empty error">{error}</p> : <div className="table-wrap"><table><thead><tr><th>Task</th><th>Category</th><th>Location</th><th>Budget</th><th>Status</th></tr></thead><tbody>{tasks.map(task => <tr key={task.id}><td><strong>{task.title}</strong><small>{task.id}</small></td><td>{task.category || 'Others'}</td><td>{task.suburb || 'Australia wide'}</td><td>{task.budget ? `$${task.budget}` : 'Discuss'}</td><td><span className="status">{task.status}</span></td></tr>)}</tbody></table></div>}</section></main></div>;
}
createRoot(document.getElementById('root')!).render(<React.StrictMode><AdminApp/></React.StrictMode>);
