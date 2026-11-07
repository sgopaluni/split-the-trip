import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { projectConfig } from './firebase-config';
const env=import.meta.env;
const config={...projectConfig,apiKey:env.VITE_FIREBASE_API_KEY||projectConfig.apiKey,authDomain:env.VITE_FIREBASE_AUTH_DOMAIN||projectConfig.authDomain,projectId:env.VITE_FIREBASE_PROJECT_ID||projectConfig.projectId,appId:env.VITE_FIREBASE_APP_ID||projectConfig.appId};
export const configured=Boolean(config.apiKey&&config.authDomain&&config.projectId&&config.appId);
const app=configured?initializeApp(config):null;
export const auth=app?getAuth(app):null;
export const db=app?getFirestore(app):null;
export async function googleLogin(){if(!auth)throw new Error('Google sign-in needs Firebase configuration. See the setup guide in the project.');const provider=new GoogleAuthProvider();provider.setCustomParameters({prompt:'select_account'});return signInWithPopup(auth,provider);}
export const logout=()=>auth?signOut(auth):Promise.resolve();
