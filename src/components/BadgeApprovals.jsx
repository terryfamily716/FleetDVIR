import React, { useState, useEffect } from 'react';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../firebase';

const approveDriver = httpsCallable(functions, 'approveDriver);
const rejectDriver = httpsCallable(functions, 'rejectDriver);

function BadgeApprovals() {
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedSelfie, setSelectedSelfie] = useState(null);
  const [actionInFlight, setActionInFlight] = useState(null);

  useEffect(() => {
    const q = query(
      collection(db, 'drivers'),
      where('badgeStatus', '==', 'pending'),
      orderBy('createdAt', 'asc')
    );
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const rows = snapshot.docs.map((doc) => ({
          id: doc.id,
          firstName: doc.data().firstName,
          lastName: doc.data().lastName,
          selfieUrl: doc.data().selfieUrl,
          createdAt: doc.data().createdAt,
        }));
        setPending(rows);
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, []);

  const handleApprove = async (driverId) => {
    setActionInFlight(driverId);
    try {
      await approveDriver({ driverId });
    } catch (err) {
      setError(err.message);
    } finally {
      setActionInFlight(null);
    }
  };

  const handleReject = async (driverId) => {
    if (!window.confirm('Reject this driver? Their profile will be deleted.')) return;
    setActionInFlight(driverId);
    try {
      await rejectDriver({ driverId });
    } catch (err) {
      setError(err.message);
    } finally {
      setActionInFlight(null);
    }
  };

  return (
    <div className="badge-approvals">
      <h2>Badge Approvals</h2>
      {loading && <p>Loading...</p>}
      {error && <p className="error">{error}</p>}
      {!loading && !error && pending.length === 0 && (
        <p>No pending approvals.</p>
      )}
      {pending.map((driver) => (
        <div className="approval-row" key={driver.id} style={actionInFlight === driver.id ? { opacity: 0.5 } : {}}>
          <img
            src={driver.selfieUrl}
            alt={driver.firstName + ' ' + driver.lastName}
            className="selfie-thumb"
            onClick={() => setSelectedSelfie(driver.selfieUrl)}
          />
          <span>{driver.firstName} {driver.lastName}</span>
          <span>{driver.createdAt?.toDate?.().toLocaleString()}</span>
          <button
            className="approve-btn"
            onClick={() => handleApprove(driver.id)}
            disabled={actionInFlight === driver.id}
          >
            Approve
          </button>
          <button
            className="reject-btn"
            onClick={() => handleReject(driver.id)}
            disabled={actionInFlight === driver.id}
          >
            Reject
          </button>
        </div>
      ))}
      {selectedSelfie && (
        <div className="selfie-overlay" onClick={() => setSelectedSelfie(null)}>
          <img src={selectedSelfie} alt="Full size selfie" />
          <button className="close-btn" onClick={() => setSelectedSelfie(null)}>
            X
          </button>
        </div>
      )}
    </div>
  );
}

export default BadgeApprovals;
