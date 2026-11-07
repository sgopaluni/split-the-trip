import test from 'node:test';
import assert from 'node:assert/strict';
import {createEmptyWorkspace,removeSampleTrips} from '../src/local-data.js';
test('new workspaces contain no sample trips or financial records',()=>{
 assert.deepEqual(createEmptyWorkspace(),{trips:[],expenses:{},settlements:{},comments:{}});
 assert.deepEqual(removeSampleTrips(null),createEmptyWorkspace());
});
test('migration removes sample trips and records while preserving user-created trips',()=>{
 const own={id:'my-trip',name:'Our Smokies trip'};
 const before={trips:[{id:'demo-portugal'},{id:'demo-catskills'},{id:'demo-italy'},own],expenses:{'demo-portugal':[{id:'sample'}],'my-trip':[{id:'real'}]},settlements:{'demo-catskills':[{id:'sample'}],'my-trip':[{id:'payment'}]},comments:{'demo-italy':[{id:'sample'}],'my-trip':[{id:'note'}]}};
 const after=removeSampleTrips(before);
 assert.deepEqual(after.trips,[own]);
 assert.deepEqual(after.expenses,{'my-trip':[{id:'real'}]});
 assert.deepEqual(after.settlements,{'my-trip':[{id:'payment'}]});
 assert.deepEqual(after.comments,{'my-trip':[{id:'note'}]});
 assert.equal(before.trips.length,4);
 assert.deepEqual(removeSampleTrips(after),after);
});
