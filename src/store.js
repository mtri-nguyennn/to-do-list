import { initializeApp } from 'firebase/app';
import { initializeAuth, browserSessionPersistence, setPersistence, createUserWithEmailAndPassword, signInWithEmailAndPassword, sendEmailVerification, sendPasswordResetEmail, signOut, onAuthStateChanged, reload, getIdToken } from 'firebase/auth';
import { getFirestore, collection, doc, getDocs, getDoc, setDoc, updateDoc, deleteDoc, writeBatch, query, where, serverTimestamp } from 'firebase/firestore';
import { text, deadline } from './validation.js';
const config = __FIREBASE_CONFIG__;
export let configured=Boolean(config.apiKey&&config.authDomain&&config.projectId&&config.appId);
let auth,db;
if(configured){try{const app=initializeApp(config);auth=initializeAuth(app,{persistence:browserSessionPersistence});db=getFirestore(app);}catch{configured=false;}}
export const currentUser=()=>auth?.currentUser;
export function watchAuth(callback){return onAuthStateChanged(auth,callback);}
export async function login(email,password){await setPersistence(auth,browserSessionPersistence);return signInWithEmailAndPassword(auth,email.trim(),password);}
export async function signup(email,password){await setPersistence(auth,browserSessionPersistence);const credential=await createUserWithEmailAndPassword(auth,email.trim(),password);await sendEmailVerification(credential.user);}
export const logout=()=>signOut(auth);
export const resend=()=>sendEmailVerification(auth.currentUser);
export const resetPassword=email=>sendPasswordResetEmail(auth,text(email,320));
export async function checkVerification(){await reload(auth.currentUser);await getIdToken(auth.currentUser,true);return auth.currentUser.emailVerified;}
function owner(){const user=auth?.currentUser;if(!user?.emailVerified)throw Error('Verify your email before opening your courses.');return user.uid;}
const base=(uid,name)=>collection(db,'users',uid,name);
function record(uid,name,id){if(typeof id!=='string'||!id||id.includes('/'))throw Error('Invalid item.');return doc(db,'users',uid,name,id);}
export async function loadWorkspace(){
 const uid=owner();const [courses,tasks]=await Promise.all([getDocs(base(uid,'courses')),getDocs(base(uid,'tasks'))]);
 if(auth.currentUser?.uid!==uid)throw Error('Your session changed. Sign in again.');
 const rows=snapshot=>snapshot.docs.map(d=>({...d.data(),id:d.id})).sort((a,b)=>(a.created_at?.seconds||0)-(b.created_at?.seconds||0)||a.id.localeCompare(b.id));
 return {courses:rows(courses),tasks:rows(tasks)};
}
export async function mutate(body){
 const uid=owner();
 switch(body.action){
 case 'createCourse': {
  const color=['blue','purple','orange','green','pink'].includes(body.color)?body.color:'blue';
  await setDoc(doc(base(uid,'courses')),{name:text(body.name,80),description:(body.description||'').trim().slice(0,160),color,deleting:false,created_at:serverTimestamp()});break;
 }
 case 'renameCourse':await updateDoc(record(uid,'courses',body.id),{name:text(body.name,80)});break;
 case 'deleteCourse': {
  const course=record(uid,'courses',body.id);
  // Mark first: rules prevent concurrent creation of tasks while deletion is in progress.
  await updateDoc(course,{deleting:true});
  const tasks=await getDocs(query(base(uid,'tasks'),where('course_id','==',body.id)));
  for(let i=0;i<tasks.docs.length;i+=400){const batch=writeBatch(db);tasks.docs.slice(i,i+400).forEach(t=>batch.delete(t.ref));await batch.commit();}
  await deleteDoc(course);break;
 }
 case 'createTask': {
  const parent=await getDoc(record(uid,'courses',body.course_id));
  if(!parent.exists()||parent.data().deleting)throw Error('This course is being deleted.');
  await setDoc(doc(base(uid,'tasks')),{course_id:body.course_id,title:text(body.title,300),done:false,due_date:deadline(body.due_date),created_at:serverTimestamp()});break;
 }
 case 'editTask':await updateDoc(record(uid,'tasks',body.id),{title:text(body.title,300),due_date:deadline(body.due_date)});break;
 case 'toggleTask':if(typeof body.done!=='boolean')throw Error('Invalid completion state.');await updateDoc(record(uid,'tasks',body.id),{done:body.done});break;
 case 'deleteTask':await deleteDoc(record(uid,'tasks',body.id));break;
 default:throw Error('Unknown action.');
 }
}
export function friendlyError(error){
 const messages={
 'auth/invalid-credential':'Email or password is incorrect.', 'auth/wrong-password':'Email or password is incorrect.',
 'auth/user-not-found':'Email or password is incorrect.', 'auth/invalid-email':'Enter a valid email address.',
 'auth/email-already-in-use':'Unable to create this account. Try signing in or resetting your password.',
 'auth/weak-password':'Use a password with at least 12 characters.', 'auth/too-many-requests':'Too many attempts. Please wait and try again.',
 'auth/network-request-failed':'Unable to connect. Check your internet connection.', 'auth/user-disabled':'This account is disabled.',
 'auth/operation-not-allowed':'Email sign-in is not enabled. Contact the site owner.',
 'permission-denied':'Access denied. Verify your email, then sign in again. If this continues, contact the site owner.',
 'unavailable':'Unable to connect to the database. Please try again.', 'resource-exhausted':'The service has reached its usage limit. Please try again later.'
 };
 return messages[error.code] || (error.code?'Unable to complete this request. Please try again.':error.message);
}
