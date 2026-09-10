import { test } from 'node:test';
import assert from 'node:assert/strict';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, connectAuthEmulator, createUserWithEmailAndPassword, sendEmailVerification, applyActionCode, reload, getIdToken, signOut, signInWithEmailAndPassword, sendPasswordResetEmail, confirmPasswordReset } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator, doc, setDoc, getDoc, serverTimestamp, terminate } from 'firebase/firestore';

test('signup, verification gate, persistent account data, sign-in and password reset',async()=>{
 const app=initializeApp({apiKey:'demo-api-key',projectId:'demo-coursework'},'auth-integration');
 const auth=getAuth(app);connectAuthEmulator(auth,'http://127.0.0.1:9099',{disableWarnings:true});
 const db=getFirestore(app);connectFirestoreEmulator(db,'127.0.0.1',8080);
 const email=`student-${Date.now()}@example.com`,password='test-password-12345';
 const codes=async()=>{const response=await fetch('http://127.0.0.1:9099/emulator/v1/projects/demo-coursework/oobCodes');return (await response.json()).oobCodes;};
 try{
  const {user}=await createUserWithEmailAndPassword(auth,email,password);
  assert.equal(user.emailVerified,false);
  const ref=doc(db,`users/${user.uid}/courses/bus`);
  const course={name:'BUS 1299',description:'',color:'blue',deleting:false,created_at:serverTimestamp()};
  await assert.rejects(setDoc(ref,course),e=>e.code==='permission-denied');
  await sendEmailVerification(user);
  const verification=(await codes()).find(c=>c.email===email&&c.requestType==='VERIFY_EMAIL');assert.ok(verification);
  await applyActionCode(auth,verification.oobCode);await reload(user);await getIdToken(user,true);
  assert.equal(user.emailVerified,true);await setDoc(ref,course);
  await signOut(auth);await assert.rejects(getDoc(ref),e=>e.code==='permission-denied');
  await assert.rejects(signInWithEmailAndPassword(auth,email,'wrong-password'));
  await signInWithEmailAndPassword(auth,email,password);assert.equal((await getDoc(ref)).data().name,'BUS 1299');
  await sendPasswordResetEmail(auth,email);
  const reset=(await codes()).find(c=>c.email===email&&c.requestType==='PASSWORD_RESET');assert.ok(reset);
  await confirmPasswordReset(auth,reset.oobCode,'replacement-password-12345');await signOut(auth);
  await signInWithEmailAndPassword(auth,email,'replacement-password-12345');assert.equal((await getDoc(ref)).data().name,'BUS 1299');
 }finally{await signOut(auth);await terminate(db);await deleteApp(app);}
});
