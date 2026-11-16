import React, { useState, useEffect } from 'react';
import { collection, query, where, orderBy, onSnapshot, getDocs } from 'firebase/firestore';
import { db } from '../firebase';

function AdminAnalytics() {
  const [drivers, setDrivers] = useState([]);
  const [dvirs, setDvirs] = useState([]);
  const [defects, setDefects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const unsubDrivers = onSnapshot(
      collection(db, 'drivers'),
      (snap) => {
        setDrivers(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      },
      (err) => setError(err.message)
    );
    const unsubDvirs = onSnapshot(
      query(collection(db, 'dvirs'), orderBy('createdAt', 'desc')),
      (snap) => {
        setDvirs(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      },
      (err) => setError(err.message)
    );
    const unsubDefects = onSnapshot(
      collection(db, 'defects'),
      (snap) => {
        setDefects(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoading(false);
      },
      (err) => setError(err.message)
    );
    return () => {
      unsubDrivers();
      unsubDvirs();
      unsubDefects();
    };
  }, []);

  if (loading) return <p>Loading analytics...</p>;
  if (error) return <p className="error">{error}</p>;

  const totalDrivers = drivers.length;
  const activeToday = drivers.filter((d) => {
    if (!d.lastLogin) return false;
    const last = d.lastLogin.toDate ? d.lastLogin.toDate() : new Date(d.lastLogin);
    const now = new Date();
    return last.toDateString() === now.toDateString();
  }).length;
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const dvirsThisWeek = dvirs.filter((d) => {
    const created = d.createdAt?.toDate ? d.createdAt.toDate() : new Date(d.createdAt);
    return created >= weekAgo;
  }).length;
  const openDefects = defects.filter((d) => d.status === 'open').length;

  // Per-driver table
  const driverRows = drivers.map((d) => {
    const myDvirs = dvirs.filter((dv) => dv.driverId === d.id);
    const myDefects = defects.filter((df) => myDvirs.some((dv) => dv.id === df.dvirId));
    const resolved = myDefects.filter((df) => df.status === 'resolved').length;
    return {
      name: d.firstName + ' ' + d.lastName,
      role: d.role,
      lastLogin: d.lastLogin?.toDate ? d.lastLogin.toDate().toLocaleString() : 'Never',
      dvirs: myDvirs.length,
      defectsFound: myDefects.length,
      defectsResolved: resolved,
    };
  });

  // Defect trends by type
  const trendMap = {};
  defects.forEach((df) => {
    trendMap[df.defectType] = (trendMap[df.defectType] || 0) + 1;
  });
  const trends = Object.entries(trendMap)
    .sort((a, b) => b[1] - a[1])
    .map(([type, count]) => ({ type, count }));

  // Equipment health
  const equipMap = {};
  defects.forEach((df) => {
    const key = df.tractorNumber + ' / ' + df.trailerNumber;
    if (!equipMap[key]) equipMap[key] = { open: 0, resolved: 0 };
    if (df.status === 'open') equipMap[key].open += 1;
    else equipMap[key].resolved += 1;
  });
  const equipment = Object.entries(equipMap)
    .map(([unit, counts]) => ({ unit, ...counts }))
    .sort((a, b) => b.open - a.open);

  return (
    <div className="admin-analytics">
      <h2>Admin Analytics</h2>

      <div className="summary-cards">
        <div className="card"><h3>Total Drivers</h3><p>{totalDrivers}</p></div>
        <div className="card"><h3>Active Today</h3><p>{activeToday}</p></div>
        <div className="card"><h3>DVIRs This Week</h3><p>{dvirsThisWeek}</p></div>
        <div className="card"><h3>Open Defects</h3><p>{openDefects}</p></div>
      </div>

      <h3>Per-Driver Activity</h3>
      <table className="driver-table">
        <thead>
          <tr>
            <th>Name</th><th>Role</th><th>Last Login</th><th>DVIRs</th><th>Defects Found</th><th>Defects Resolved</th>
          </tr>
        </thead>
        <tbody>
          {driverRows.map((row, i) => (
            <tr key={i} style={row.role === 'admin' ? { fontWeight: 'bold' } : {}}>
              <td>{row.name}</td><td>{row.role}</td><td>{row.lastLogin}</td><td>{row.dvirs}</td><td>{row.defectsFound}</td><td>{row.defectsResolved}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h3>Defect Trends by Type</h3>
      <ul className="trend-list">
        {trends.map((t) => (
          <li key={t.type}>{t.type}: {t.count}</li>
        ))}
        {trends.length === 0 && <li>No defects logged yet.</li>}
      </ul>

      <h3>Equipment Health</h3>
      <table className="equipment-table">
        <thead>
          <tr><th>Tractor / Trailer</th><th>Open Defects</th><th>Resolved</th></tr>
        </thead>
        <tbody>
          {equipment.map((eq, i) => (
            <tr key={i} style={eq.open > 0 ? { background: '#3a1a1a' } : {}}>
              <td>{eq.unit}</td><td>{eq.open}</td><td>{eq.resolved}</td>
            </tr>
          ))}
          {equipment.length === 0 && <tr><td colSpan={3}>No equipment defects yet.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

export default AdminAnalytics;
