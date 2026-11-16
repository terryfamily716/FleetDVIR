import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getFunctions } from 'firebase/functions';

const firebaseConfig = {
  apiKey: 'YOUR_API_KEY',
  authDomain: 'fleetdvir.firebaseapp.com',
  projectId: 'fleetdvir',
  storageBucket: 'fleetdvir.appspot.com',
  messagingSenderId: 'YOUR_SENDER_ID',
  appId: 'YOUR_APP_ID'
);

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const storage = getStorage(app);
export const functions = getFunctions(app);

export const db = getFirestore(app);

// Enable offline persistence for Firestore
// Cached data survives app restarts; writes queue locally and sync when online
enableIndexedDbPersistence(db).catch((err) => {
  if (err.code === 'failed-precondition') {
    // Multiple tabs open, persistence can only be enabled in one tab at a time
    console.warn('Offline persistence unavailable: another tab is open.');
  } else if (err.code === 'unavailable') {
    // Browser does not support IndexedDB
    console.warn('Offline persistence unavailable: browser lacks IndexedDB support.');
  }
});

export default app;