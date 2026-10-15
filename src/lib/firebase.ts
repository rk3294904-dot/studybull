import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Firebase web config is public by design; access is controlled by Firestore security rules.
const firebaseConfig = {
  apiKey: 'AIzaSyCEEIPr27eyXRna1H1x7IT6Vvf3ViD1Nhs',
  authDomain: 'skill-wave-d8570.firebaseapp.com',
  projectId: 'skill-wave-d8570',
  storageBucket: 'skill-wave-d8570.firebasestorage.app',
  messagingSenderId: '676834080521',
  appId: '1:676834080521:web:67f280b392dc816bcec5d8',
  measurementId: 'G-5K4P4SD3GF',
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

if (typeof window !== 'undefined') {
  import('firebase/analytics')
    .then(({ getAnalytics, isSupported }) => isSupported().then((ok) => ok && getAnalytics(app)))
    .catch(() => {});
}
