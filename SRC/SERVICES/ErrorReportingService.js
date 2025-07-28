import React from 'react'; // <-- Added for HOC use

import { auth, db } from '../firebase-config';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

const logErrorToFirebase = async (error, info = {}) => {
  try {
    const user = auth.currentUser;
    await addDoc(collection(db, 'errors'), {
      error: error.toString(),
      info,
      user: user ? user.uid : null,
      timestamp: serverTimestamp(),
      agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
      connection: typeof navigator !== "undefined" && navigator.connection ? navigator.connection.effectiveType : null,
      screen: typeof window !== "undefined" && window.screen ? `${window.screen.width}x${window.screen.height}` : null,
    });
  } catch (e) {
    // Fallback: log to console if Firebase fails
    console.error('Failed to log error to Firebase:', e);
  }
};

export function reportError(error, info = {}) {
  // Sentry support (optional chaining for safety)
  if (typeof window !== "undefined" && window.Sentry) {
    window.Sentry.captureException(error, { extra: info });
  }
  logErrorToFirebase(error, info);
}

export function withAdminErrorBoundary(Component) {
  return function AdminErrorBoundaryWrapper(props) {
    return (
      <React.Suspense fallback={null}>
        <Component {...props} />
      </React.Suspense>
    );
  };
}
