export const CURRENCIES = ['USD'];
export const CATEGORIES = [
 {id:'food',name:'Food & drink',icon:'Utensils',color:'#c38455'},
 {id:'stay',name:'Accommodation',icon:'BedDouble',color:'#8a89ad'},
 {id:'transport',name:'Transport',icon:'Car',color:'#7c9ab2'},
 {id:'flights',name:'Flights',icon:'Plane',color:'#a0af83'},
 {id:'groceries',name:'Groceries',icon:'ShoppingBasket',color:'#8ca77b'},
 {id:'activities',name:'Activities',icon:'Ticket',color:'#d2aa63'},
 {id:'shopping',name:'Shopping',icon:'ShoppingBag',color:'#c3889d'},
 {id:'entertainment',name:'Entertainment',icon:'Music',color:'#a68db9'},
 {id:'health',name:'Health & medical',icon:'HeartPulse',color:'#bc8181'},
 {id:'utilities',name:'Utilities',icon:'Zap',color:'#b4a263'},
 {id:'insurance',name:'Insurance & fees',icon:'Shield',color:'#849f99'},
 {id:'gifts',name:'Gifts & donations',icon:'Gift',color:'#b89b87'},
 {id:'other',name:'Other',icon:'Shapes',color:'#929992'},
];
export const id = () => crypto.randomUUID();
export const today = () => new Date().toLocaleDateString('en-CA');
export function digits(currency){ return new Intl.NumberFormat('en',{style:'currency',currency}).resolvedOptions().maximumFractionDigits; }
export function toMinor(value,currency='USD'){ const n=Number(value); if(!Number.isFinite(n)||n<0)throw new Error('Enter a valid, positive amount.'); const result=Math.round(n*10**digits(currency)); if(!Number.isSafeInteger(result)||result>1e11)throw new Error('Amount is too large.'); return result; }
export function money(cents,currency='USD'){return new Intl.NumberFormat('en-US',{style:'currency',currency,maximumFractionDigits:digits(currency)}).format(cents/10**digits(currency));}
export function convert(amount,from,to,rate){ if(!(Number(rate)>0))throw new Error('Exchange rate must be greater than zero.');return Math.round(amount/10**digits(from)*Number(rate)*10**digits(to)); }
export function splitAmount(total,people,mode='equal',values={}){
 if(!Number.isSafeInteger(total)||total<=0)throw new Error('Amount must be greater than zero.');
 if(!people.length)throw new Error('Select at least one person.');
 if(new Set(people).size!==people.length)throw new Error('Each person may appear only once.');
 let weights=people.map(p=>mode==='equal'?1:Number(values[p]??0));
 if(weights.some(w=>!Number.isFinite(w)||w<0))throw new Error('Split amounts must be zero or positive.');
 const sum=weights.reduce((a,b)=>a+b,0);
 if(mode==='exact'){if(weights.some(w=>!Number.isSafeInteger(w))||sum!==total)throw new Error('Exact amounts must add up to the total.');return Object.fromEntries(people.map((p,i)=>[p,weights[i]]));}
 if(mode==='percent'&&Math.abs(sum-100)>0.00001)throw new Error('Percentages must add up to 100.');
 if(sum<=0)throw new Error('Add at least one share.');
 const raw=weights.map(w=>total*w/sum), amounts=raw.map(Math.floor);
 const remainder=total-amounts.reduce((a,b)=>a+b,0);
 const order=people.map((_,i)=>i).sort((a,b)=>(raw[b]-amounts[b])-(raw[a]-amounts[a]));
 for(let j=0;j<remainder;j++) amounts[order[j%order.length]]++;
 return Object.fromEntries(people.map((p,i)=>[p,amounts[i]]));
}
export function balances(trip,expenses,settlements){
 const result=Object.fromEntries(trip.members.map(m=>[m.email,0]));
 for(const e of expenses){for(const [p,a]of Object.entries(e.paid))result[p]=(result[p]||0)+a;for(const[p,a]of Object.entries(e.shares))result[p]=(result[p]||0)-a;}
 for(const s of settlements.filter(s=>s.status==='confirmed')){result[s.from]=(result[s.from]||0)+s.amount;result[s.to]=(result[s.to]||0)-s.amount;}
 return result;
}
export function simplifyDebts(balance){
 const debtors=Object.entries(balance).filter(([,v])=>v<0).map(([p,v])=>({p,v:-v})).sort((a,b)=>b.v-a.v);
 const creditors=Object.entries(balance).filter(([,v])=>v>0).map(([p,v])=>({p,v})).sort((a,b)=>b.v-a.v);
 const result=[];let i=0,j=0;
 while(i<debtors.length&&j<creditors.length){const amount=Math.min(debtors[i].v,creditors[j].v);if(amount)result.push({from:debtors[i].p,to:creditors[j].p,amount});debtors[i].v-=amount;creditors[j].v-=amount;if(!debtors[i].v)i++;if(!creditors[j].v)j++;}return result;
}
export function directDebts(expenses,settlements){
 const pairs=new Map(); const add=(from,to,amount)=>{if(from===to||!amount)return;const [a,b]=[from,to].sort();const key=JSON.stringify([a,b]);pairs.set(key,(pairs.get(key)||0)+(from===a?amount:-amount));};
 for(const e of expenses){const net={};for(const[p,n]of Object.entries(e.paid))net[p]=(net[p]||0)+n;for(const[p,n]of Object.entries(e.shares))net[p]=(net[p]||0)-n;for(const d of simplifyDebts(net))add(d.from,d.to,d.amount);}
 for(const s of settlements.filter(s=>s.status==='confirmed'))add(s.to,s.from,s.amount);
 return [...pairs].filter(([,v])=>v).map(([key,v])=>{const[a,b]=JSON.parse(key);return{from:v>0?a:b,to:v>0?b:a,amount:Math.abs(v)}});
}
export function expenseTotal(expenses){return expenses.reduce((s,e)=>s+e.amount,0);}
export function csv(rows){return rows.map(row=>row.map(v=>{let s=String(v??'');if(/^[=+\-@\t\r]/.test(s))s="'"+s;return '"'+s.replaceAll('"','""')+'"';}).join(',')).join('\r\n');}
export function validEmail(email){return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);}
