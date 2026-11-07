import test from 'node:test';
import assert from 'node:assert/strict';
import {createInviteToken,parseInviteToken,inviteLink,joiningMember,joinTripPatch} from '../src/invitations.js';
test('invites use random 256-bit tokens and preserve the GitHub Pages subpath',()=>{
 const tokens=Array.from({length:100},createInviteToken);assert.equal(new Set(tokens).size,100);
 for(const token of tokens){assert.match(token,/^[a-f0-9]{64}$/);assert.equal(parseInviteToken('#join='+token),token)}
 assert.equal(inviteLink('https://sgopaluni.com/split-the-trip/#old',tokens[0]),`https://sgopaluni.com/split-the-trip/#join=${tokens[0]}`);
 assert.equal(parseInviteToken(''),null);assert.equal(parseInviteToken('#join=wrong'),'');
});
test('joining uses the verified account identity, not organizer-entered emails',()=>{
 assert.deepEqual(joiningMember({email:'Friend@Gmail.com',displayName:'Friend',emailVerified:true}),{email:'friend@gmail.com',name:'Friend'});
 assert.throws(()=>joiningMember({email:'friend@gmail.com',emailVerified:false}),/verified/);
});
test('joining only appends membership and never rewrites expense records or settings',()=>{
 const operations={arrayUnion:value=>({arrayUnion:value}),increment:value=>({increment:value})};
 const patch=joinTripPatch({email:'friend@gmail.com',emailVerified:true,displayName:'Friend'},'a'.repeat(64),'now',operations);
 assert.deepEqual(Object.keys(patch).sort(),['lastJoinToken','memberEmails','members','updatedAt','version']);
 assert.deepEqual(patch.memberEmails,{arrayUnion:'friend@gmail.com'});assert.deepEqual(patch.version,{increment:1});
});
