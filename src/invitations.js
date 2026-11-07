export const INVITE_LIFETIME = 7 * 24 * 60 * 60 * 1000;
export function createInviteToken() {
 return Array.from(crypto.getRandomValues(new Uint8Array(32)),byte=>byte.toString(16).padStart(2,'0')).join('');
}
export const validInviteToken = token => typeof token === 'string' && /^[a-f0-9]{64}$/.test(token);
export function parseInviteToken(hash) {
 if (!hash.startsWith('#join=')) return null;
 const token=hash.slice(6);
 return validInviteToken(token)?token:'';
}
export function inviteLink(base,token) {
 if (!validInviteToken(token)) throw new Error('Invalid invitation.');
 const url=new URL(base);url.hash=`join=${token}`;return url.toString();
}
export function joiningMember(user) {
 if (!user?.email || !user.emailVerified) throw new Error('Sign in with a verified Google account to join this trip.');
 const email=user.email.toLowerCase();
 return {name:(user.displayName||email.split('@')[0]).slice(0,80),email};
}
export function joinTripPatch(user,token,stamp,operations) {
 if(!validInviteToken(token)) throw new Error('This invitation is invalid. Ask the organizer for a new link.');
 const person=joiningMember(user);
 return {members:operations.arrayUnion(person),memberEmails:operations.arrayUnion(person.email),lastJoinToken:token,updatedAt:stamp,version:operations.increment(1)};
}
