// Keep the local identity stable so previously created local trips retain ownership.
export const LOCAL_USER = {email:'alex@example.com',displayName:'Trip Organizer',uid:'local-organizer'};
export const createEmptyWorkspace = () => ({trips:[],expenses:{},settlements:{},comments:{}});
const SAMPLE_TRIP_IDS = new Set(['demo-portugal','demo-catskills','demo-italy']);
export function removeSampleTrips(data) {
 if (!data || !Array.isArray(data.trips)) return createEmptyWorkspace();
 const clean = {...data,trips:data.trips.filter(trip=>!SAMPLE_TRIP_IDS.has(trip.id))};
 for (const collection of ['expenses','settlements','comments']) {
  clean[collection] = Object.fromEntries(Object.entries(data[collection] || {}).filter(([tripId])=>!SAMPLE_TRIP_IDS.has(tripId)));
 }
 return clean;
}
