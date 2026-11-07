import {before,after,beforeEach,test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {initializeTestEnvironment,assertSucceeds,assertFails} from '@firebase/rules-unit-testing';
import {doc,setDoc,getDoc,getDocs,collection,query,where,updateDoc,runTransaction,arrayUnion,increment} from 'firebase/firestore';
import {joinTripPatch} from '../src/invitations.js';
let env;
const token='a'.repeat(64),other='b'.repeat(64),owner='owner@example.com',friend='friend@example.com';
const user={email:friend,emailVerified:true,displayName:'Friend'};
function client(email,verified=true){return env.authenticatedContext(email,{email,email_verified:verified,firebase:{sign_in_provider:'google.com'}}).firestore()}
const tripData=(extra={})=>({name:'Smokies',destination:'Tennessee',startDate:'2026-11-07',endDate:'2026-11-10',currency:'USD',budget:100000,members:[{name:'Organizer',email:owner}],memberEmails:[owner],ownerEmail:owner,archived:false,createdAt:'now',updatedAt:'now',createdBy:owner,version:1,inviteToken:token,inviteExpiresAt:Date.now()+86400000,...extra});
const inviteData=(extra={})=>({tripId:'smokies',tripName:'Smokies',destination:'Tennessee',startDate:'2026-11-07',endDate:'2026-11-10',ownerName:'Organizer',expiresAt:Date.now()+86400000,createdAt:'now',...extra});
const patch=(extra={})=>({...joinTripPatch(user,token,'later',{arrayUnion,increment}),...extra});
before(async()=>{env=await initializeTestEnvironment({projectId:'demo-split-the-trip',firestore:{host:'127.0.0.1',port:8086,rules:fs.readFileSync('firestore.rules','utf8')}})});
after(async()=>{await env?.cleanup()});
beforeEach(async()=>{await env.clearFirestore();await env.withSecurityRulesDisabled(async context=>{const db=context.firestore();await setDoc(doc(db,'trips','smokies'),tripData());await setDoc(doc(db,'invites',token),inviteData());await setDoc(doc(db,'trips','other'),tripData({inviteToken:other}));await setDoc(doc(db,'invites',other),inviteData({tripId:'other'}))})});
test('signed-in invite holder previews only the invitation, not expenses or member emails',async()=>{
 const db=client(friend);await assertSucceeds(getDoc(doc(db,'invites',token)));await assertFails(getDoc(doc(db,'trips','smokies')));await assertFails(getDocs(collection(db,'trips','smokies','expenses')));await assertFails(getDocs(collection(db,'invites')));
});
test('anonymous and unverified accounts cannot preview or join',async()=>{
 for(const db of [env.unauthenticatedContext().firestore(),client(friend,false)]){await assertFails(getDoc(doc(db,'invites',token)));await assertFails(updateDoc(doc(db,'trips','smokies'),patch()))}
});
test('verified link holder joins and can query the same shared trip',async()=>{
 const db=client(friend);await assertSucceeds(updateDoc(doc(db,'trips','smokies'),patch()));
 const snap=await assertSucceeds(getDoc(doc(db,'trips','smokies')));assert.deepEqual(snap.data().memberEmails,[owner,friend]);assert.equal(snap.data().ownerEmail,owner);assert.equal(snap.data().budget,100000);
 const result=await assertSucceeds(getDocs(query(collection(db,'trips'),where('memberEmails','array-contains',friend))));assert.equal(result.docs.length,1);
});
test('joining grants permission to add valid shared expenses',async()=>{
 const db=client(friend);await assertSucceeds(updateDoc(doc(db,'trips','smokies'),patch()));
 await assertSucceeds(setDoc(doc(db,'trips','smokies','expenses','snacks'),{title:'Snacks',amount:101,originalAmount:101,originalCurrency:'USD',rate:1,paid:{[friend]:101},shares:{[owner]:51,[friend]:50},splitMode:'equal',category:'food',date:'2026-11-07',note:'',receiptUrl:'',recurrence:'none',createdAt:'now',updatedAt:'now',createdBy:friend,version:1}));
});
test('join requests cannot change trip settings, owner, or someone else’s membership',async()=>{
 const db=client(friend),ref=doc(db,'trips','smokies');
 await assertFails(updateDoc(ref,patch({ownerEmail:friend})));await assertFails(updateDoc(ref,patch({budget:1})));await assertFails(updateDoc(ref,patch({name:'Changed'})));await assertFails(updateDoc(ref,patch({memberEmails:[friend],members:[{email:friend,name:'Friend'}]})));await assertFails(updateDoc(ref,patch({memberEmails:arrayUnion('someone-else@example.com')})));
});
test('wrong, cross-trip, revoked, or expired tokens cannot join',async()=>{
 const db=client(friend),ref=doc(db,'trips','smokies');await assertFails(updateDoc(ref,patch({lastJoinToken:other})));await assertFails(updateDoc(ref,patch({lastJoinToken:'c'.repeat(64)})));
 await env.withSecurityRulesDisabled(async context=>updateDoc(doc(context.firestore(),'trips','smokies'),{inviteExpiresAt:Date.now()-1000}));await assertFails(updateDoc(ref,patch()));
 await env.withSecurityRulesDisabled(async context=>updateDoc(doc(context.firestore(),'trips','smokies'),{inviteToken:'',inviteExpiresAt:Date.now()+86400000}));await assertFails(updateDoc(ref,patch()));await assertFails(getDoc(doc(db,'invites',token)));
});
test('organizer can generate a replacement link atomically and the old link stops working',async()=>{
 const db=client(owner),replacement='d'.repeat(64),expiresAt=Date.now()+86400000;
 await assertSucceeds(runTransaction(db,async tx=>{const ref=doc(db,'trips','smokies');await tx.get(ref);tx.update(ref,{inviteToken:replacement,inviteExpiresAt:expiresAt,version:2,updatedAt:'later'});tx.set(doc(db,'invites',replacement),inviteData({expiresAt}))}));
 const peer=client(friend);await assertFails(getDoc(doc(peer,'invites',token)));await assertSucceeds(getDoc(doc(peer,'invites',replacement)));await assertSucceeds(updateDoc(doc(peer,'trips','smokies'),patch({lastJoinToken:replacement})));
});
test('non-organizers cannot create invite links or rotate access',async()=>{
 const db=client(friend);await assertFails(setDoc(doc(db,'invites','e'.repeat(64)),inviteData()));await assertFails(updateDoc(doc(db,'trips','smokies'),{inviteToken:other,version:increment(1)}));
});
test('joining is bounded to 12 people and cannot duplicate existing members',async()=>{
 const db=client(friend),ref=doc(db,'trips','smokies');await assertSucceeds(updateDoc(ref,patch()));await assertFails(updateDoc(ref,patch()));
 const names=Array.from({length:12},(_,i)=>({name:`Person ${i}`,email:i?`person${i}@example.com`:owner}));
 await env.withSecurityRulesDisabled(async context=>setDoc(doc(context.firestore(),'trips','smokies'),tripData({members:names,memberEmails:names.map(p=>p.email)})));await assertFails(updateDoc(ref,patch()));
});
test('concurrent friends can join without overwriting each other',async()=>{
 await Promise.all(['one@example.com','two@example.com'].map(email=>assertSucceeds(updateDoc(doc(client(email),'trips','smokies'),joinTripPatch({email,emailVerified:true,displayName:email},token,'later',{arrayUnion,increment})))));
 const data=(await getDoc(doc(client(owner),'trips','smokies'))).data();assert.equal(data.memberEmails.length,3);assert.equal(data.version,3);
});

test('expense validation supports all 12 friends and rejects forged totals',async()=>{
 const members=Array.from({length:12},(_,i)=>({name:`Friend ${i}`,email:i?`friend${i}@example.com`:owner}));
 await env.withSecurityRulesDisabled(async context=>setDoc(doc(context.firestore(),'trips','smokies'),tripData({members,memberEmails:members.map(m=>m.email)})));
 const ref=doc(client(owner),'trips','smokies','expenses','all-friends');
 const expense={title:'Cabin',amount:1200,originalAmount:1200,originalCurrency:'USD',rate:1,paid:Object.fromEntries(members.map(m=>[m.email,100])),shares:Object.fromEntries(members.map(m=>[m.email,100])),splitMode:'equal',category:'stay',date:'2026-11-07',note:'',receiptUrl:'',recurrence:'none',createdAt:'now',updatedAt:'now',createdBy:owner,version:1};
 await assertSucceeds(setDoc(ref,expense));await assertFails(setDoc(doc(client(owner),'trips','smokies','expenses','bad'),{...expense,shares:{[owner]:1199}}));
});
