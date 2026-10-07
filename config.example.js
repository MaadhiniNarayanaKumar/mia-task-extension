/**
 * Copy to config.js and fill in your Firebase web credentials:
 *   cp config.example.js config.js
 *
 * config.js is gitignored — never commit real keys or passwords.
 */
export const CONFIG = {
  /** Firebase web API key (Project settings → Your apps → Web) */
  apiKey: 'YOUR_FIREBASE_WEB_API_KEY',
  /** Firebase project id */
  projectId: 'YOUR_FIREBASE_PROJECT_ID',
  /**
   * Firestore path users/{uid}/tasks — must match the Flutter app guest uid.
   * With skipSignIn this is usually "local-guest".
   */
  uid: 'local-guest',

  /**
   * Auth (pick one):
   * A) Leave email/password empty and enable Anonymous in Firebase Console, OR
   * B) Set email + password for a Firebase Auth user you create.
   */
  email: '',
  password: '',
};
