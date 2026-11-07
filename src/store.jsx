import {useEffect,useState,useCallback} from 'react';
import {onAuthStateChanged} from 'firebase/auth';
import {collection,query,where,onSnapshot,doc,setDoc,deleteDoc,runTransaction,getDoc,updateDoc,arrayUnion,increment} from 'firebase/firestore';
import {auth,db,configured,googleLogin,logout} from './firebase';
import {LOCAL_USER,createEmptyWorkspace,removeSampleTrips} from './local-data';
import {id} from './domain';
import {createInviteToken,validInviteToken,INVITE_LIFETIME,joinTripPatch} from './invitations';
const STORAGE='roam-demo-v1';
function readDemo(){try{return removeSampleTrips(JSON.parse(localStorage.getItem(STORAGE)))}catch{return createEmptyWorkspace()}}
export function useSplitTheTrip(){
 const [demo,setDemo]=useState(!configured),[user,setUser]=useState(!configured?LOCAL_USER:null),[data,setData]=useState(readDemo),[trips,setTrips]=useState([]),[tripId,setTripId]=useState(''),[expenses,setExpenses]=useState([]),[settlements,setSettlements]=useState([]),[comments,setComments]=useState([]),[error,setError]=useState(''),[loading,setLoading]=useState(configured),[synced,setSynced]=useState(true);
 const email=user?.email?.toLowerCase();
 useEffect(()=>{if(!configured)return;return onAuthStateChanged(auth,u=>{if(!demo){setUser(u);setLoading(false)}})},[demo]);
 useEffect(()=>{if(demo){setUser(LOCAL_USER);setLoading(false);return;}if(!user){setTrips([]);return;}setLoading(true);return onSnapshot(query(collection(db,'trips'),where('memberEmails','array-contains',email)),snap=>{setTrips(snap.docs.map(d=>({...d.data(),id:d.id})));setLoading(false);setSynced(!snap.metadata.fromCache)},e=>{setError(e.message);setLoading(false)})},[demo,email]);
 const visibleTrips=demo?data.trips:trips;
 const selected=visibleTrips.find(t=>t.id===tripId)||visibleTrips.find(t=>!t.archived)||visibleTrips[0];
 const activeId=selected?.id;
 useEffect(()=>{if(demo||!activeId){setExpenses([]);setSettlements([]);setComments([]);return;}const subscriptions=['expenses','settlements','comments'].map((name,i)=>onSnapshot(collection(db,'trips',activeId,name),snap=>{[setExpenses,setSettlements,setComments][i](snap.docs.map(d=>({...d.data(),id:d.id})));setSynced(!snap.metadata.fromCache)},e=>setError(e.message)));return()=>subscriptions.forEach(unsub=>unsub())},[activeId,demo]);
 useEffect(()=>{if(demo)try{localStorage.setItem(STORAGE,JSON.stringify(data))}catch{setError('Browser storage is full. Export a backup before closing this tab.')}},[data,demo]);
 const mutate=useCallback(async(kind,record,remove=false)=>{
 const stamp=new Date().toISOString();const recordId=record.id||id();
 if(demo){setData(prev=>{if(kind==='trips'){return {...prev,trips:remove?prev.trips.filter(t=>t.id!==recordId):prev.trips.some(t=>t.id===recordId)?prev.trips.map(t=>t.id===recordId?{...record,id:recordId,updatedAt:stamp}:t):[...prev.trips,{...record,id:recordId,createdAt:stamp}]};}const key=kind;const list=prev[key][activeId]||[];return{...prev,[key]:{...prev[key],[activeId]:remove?list.filter(r=>r.id!==recordId):list.some(r=>r.id===recordId)?list.map(r=>r.id===recordId?{...record,id:recordId,updatedAt:stamp,version:(record.version||0)+1}:r):[...list,{...record,id:recordId,createdAt:stamp,updatedAt:stamp,createdBy:email,version:1}]}}});return recordId;}
 if(!user)throw new Error('Please sign in first.');
 const ref=kind==='trips'?doc(db,'trips',recordId):doc(db,'trips',activeId,kind,recordId);
 // A new trip cannot be read before it exists: membership rules apply to reads.
 if(kind==='trips'&&!record.id&&!remove){await setDoc(ref,{...record,createdAt:stamp,updatedAt:stamp,createdBy:email,version:1});return recordId;}
 if(remove){if(kind==='expenses'){await runTransaction(db,async tx=>{const snap=await tx.get(ref);if(snap.exists()&&snap.data().version!==record.version)throw new Error('This expense changed. Reopen it and try again.');tx.delete(ref)})}else await deleteDoc(ref);return recordId;}
 await runTransaction(db,async tx=>{const snap=await tx.get(ref);if(snap.exists()&&record.version!=null&&snap.data().version!==record.version)throw new Error('Someone edited this record. Reopen it to see the latest version.');const next={...record,updatedAt:stamp};delete next.id;tx.set(ref,snap.exists()?{...next,createdAt:snap.data().createdAt,createdBy:snap.data().createdBy,version:(snap.data().version||0)+1}:{...next,createdAt:stamp,createdBy:email,version:1});});return recordId;
 },[demo,activeId,user,email]);
 const createInvite=useCallback(async(rotate=false)=>{
  if(demo)throw new Error('Sign in with Google and open a shared trip to invite friends.');
  if(!selected||selected.ownerEmail!==email)throw new Error('Only the trip organizer can manage invite links.');
  return runTransaction(db,async tx=>{
   const ref=doc(db,'trips',selected.id);const snapshot=await tx.get(ref);const current=snapshot.data();
   if(!current)throw new Error('This trip is no longer available.');
   if(!rotate&&validInviteToken(current.inviteToken)&&current.inviteExpiresAt>Date.now())return {token:current.inviteToken,expiresAt:current.inviteExpiresAt};
   const token=createInviteToken(),expiresAt=Date.now()+INVITE_LIFETIME,stamp=new Date().toISOString();
   tx.update(ref,{inviteToken:token,inviteExpiresAt:expiresAt,version:(current.version||0)+1,updatedAt:stamp});
   tx.set(doc(db,'invites',token),{tripId:selected.id,tripName:current.name,destination:current.destination,startDate:current.startDate,endDate:current.endDate,ownerName:(user.displayName||'Your friend').slice(0,80),expiresAt,createdAt:stamp});
   return {token,expiresAt};
  });
 },[demo,selected?.id,email,user?.displayName]);
 const disableInvite=useCallback(async()=>{
  if(demo||!selected||selected.ownerEmail!==email)throw new Error('Only the trip organizer can manage invite links.');
  await runTransaction(db,async tx=>{const ref=doc(db,'trips',selected.id);const snap=await tx.get(ref);if(!snap.exists())throw new Error('Trip not found.');tx.update(ref,{inviteToken:'',inviteExpiresAt:0,version:(snap.data().version||0)+1,updatedAt:new Date().toISOString()})});
 },[demo,selected?.id,email]);
 const loadInvite=useCallback(async token=>{
  if(!user||demo)throw new Error('Sign in with Google to open this invitation.');
  if(!validInviteToken(token))throw new Error('This invitation is invalid. Ask the organizer for a new link.');
  try{const snap=await getDoc(doc(db,'invites',token));if(!snap.exists()||snap.data().expiresAt<=Date.now())throw new Error('expired');return snap.data()}
  catch(e){if(e.code==='unavailable')throw new Error('You’re offline. Reconnect to open this invitation.');throw new Error('This invite has expired or been turned off. Ask the organizer for a new link.');}
 },[user?.uid,demo]);
 const joinInvite=useCallback(async token=>{
  const invitation=await loadInvite(token);const ref=doc(db,'trips',invitation.tripId);
  if(!trips.some(trip=>trip.id===invitation.tripId)){
   try{await updateDoc(ref,joinTripPatch(user,token,new Date().toISOString(),{arrayUnion,increment}))}
   catch(e){ // A retry after another tab already joined should just reopen the trip.
    try{const existing=await getDoc(ref);if(!existing.exists()||!existing.data().memberEmails.includes(email))throw e}
    catch{if(e.code==='permission-denied')throw new Error('This trip is full or the invite is no longer active. Ask the organizer for a new link.');throw e}
   }
  }
  setTripId(invitation.tripId);return invitation.tripId;
 },[loadInvite,trips,user,email]);
 return{createInvite,disableInvite,loadInvite,joinInvite,demo,user,email,configured,loading,synced,error,setError,trips:visibleTrips,trip:selected,selectTrip:setTripId,expenses:demo?(data.expenses[activeId]||[]):expenses,settlements:demo?(data.settlements[activeId]||[]):settlements,comments:demo?(data.comments[activeId]||[]):comments,mutate,login:async()=>{const result=await googleLogin();setDemo(false);setUser(result.user)},logout:async()=>{await logout();setDemo(false);setUser(null)},enterDemo:()=>{setDemo(true);setUser(LOCAL_USER);setTripId('')},exportData:()=>demo?data:{trip:selected,expenses,settlements,comments}};
}
