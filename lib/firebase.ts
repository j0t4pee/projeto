import { initializeApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyDHy_P4U6IC50FAIYpR6lBNLyo5OskloJg",
  authDomain: "acolitos-27f14.firebaseapp.com",
  projectId: "acolitos-27f14",
  storageBucket: "acolitos-27f14.firebasestorage.app",
  messagingSenderId: "638857959286",
  appId: "1:638857959286:web:519afb1104e4b83f720c57",
  measurementId: "G-PJ3Z0VQBK9"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db = getFirestore(app);
const auth = getAuth(app);

export { app, db, auth };