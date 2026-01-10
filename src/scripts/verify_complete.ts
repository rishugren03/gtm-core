import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';

const BASE_URL = 'http://localhost:3000';

const logSection = (title: string) => console.log(`\n${'='.repeat(50)}\n${title}\n${'='.repeat(50)}`);
const logReq = (data: any) => console.log(`📤 Sending Request:`, JSON.stringify(data, null, 2));
const logRes = (res: any) => console.log(`📥 Received Response (${res.status}):`, JSON.stringify(res.data, null, 2));

async function verifyComplete() {
  console.log('🚀 Starting Complete Verification Suite (Functionality + Delayed Campaigns)...\n');
  const userId = `user_complete_${Math.floor(Math.random() * 10000)}`;
  const signupEventId = uuidv4();

  // Test 1: Lifecycle Violation (Activation before Signup)
  logSection(`[Test 1] Activation BEFORE Signup (User: ${userId})`);
  try {
    const payload = {
      event: 'activated',
      event_id: uuidv4(),
      user_id: userId,
      product: 'gtm-core',
      properties: {}
    };
    logReq(payload);
    
    const res = await axios.post(`${BASE_URL}/events`, payload);
    logRes(res);
    
    if (res.data.status === 'ignored' && res.data.reason === 'invalid_transition') {
        console.log('✅ PASS: Correctly rejected invalid transition.');
    } else {
        console.error('❌ FAIL: Expected invalid_transition.');
    }
  } catch (err: any) { console.error('❌ FAIL: Request error:', err.message); }


  // Test 2: Valid Signup (Immediate Campaign)
  logSection(`[Test 2] Valid Signup (Immediate Campaign)`);
  try {
    const payload = {
      event: 'signup_completed',
      event_id: signupEventId,
      user_id: userId,
      product: 'gtm-core',
      properties: { email: 'complete@example.com' }
    };
    logReq(payload);

    const res = await axios.post(`${BASE_URL}/events`, payload);
    logRes(res);

    if (res.data.status === 'received') {
        console.log('✅ PASS: Signup accepted.');
    } else {
        console.error('❌ FAIL: Expected received.');
    }
  } catch (err: any) { console.error('❌ FAIL: Request error:', err.message); }


  // Test 3: Idempotency
  logSection(`[Test 3] Idempotency (Duplicate Signup)`);
  try {
     const payload = {
      event: 'signup_completed',
      event_id: signupEventId, 
      user_id: userId,
      product: 'gtm-core',
      properties: {}
    };
    logReq(payload);

    const res = await axios.post(`${BASE_URL}/events`, payload);
    logRes(res);

    if (res.data.status === 'ignored' && res.data.reason === 'duplicate') {
        console.log('✅ PASS: Correctly deduplicated event.');
    } else {
        console.error('❌ FAIL: Expected duplicate ignored.');
    }
  } catch (err: any) { console.error('❌ FAIL: Request error:', err.message); }


  // Test 4: Delayed Campaign Scheduling
  logSection(`[Test 4] Delayed Campaign Scheduling`);
  try {
      // Event: signup_completed_delayed (triggers activation_nudge_v1 with 24h delay)
      const payload = {
          event: "signup_completed_delayed",
          event_id: uuidv4(),
          user_id: userId,
          product: 'gtm-core',
          timestamp: new Date().toISOString(),
          properties: {}
      };
      
      logReq(payload);
      const res = await axios.post(`${BASE_URL}/events`, payload);
      logRes(res);
      
      if (res.data.status === 'received') {
           console.log('✅ PASS: Delayed event accepted. Check server logs for "campaign_scheduled".');
      } else {
          console.error('❌ FAIL: Delayed event rejected.');
      }
  } catch (err: any) { console.error('❌ FAIL: Request error:', err.message); }


  // Test 5: Duplicate Delayed Campaign Prevention
  logSection(`[Test 5] Duplicate Delayed Campaign Prevention`);
  try {
      const payload = {
          event: "signup_completed_delayed",
          event_id: uuidv4(),
          user_id: userId,
          product: 'gtm-core',
          timestamp: new Date().toISOString(),
          properties: {}
      };
      
      logReq(payload);
      const res = await axios.post(`${BASE_URL}/events`, payload);
      logRes(res);
      
      // The server response is 'received' because the event itself is valid 
      // but logic internal to decision engine handles the duplicate check.
      // We rely on server logs here: "campaign_duplicate_prevented".
      console.log('ℹ️  INFO: Check server logs for "campaign_duplicate_prevented". Status:', res.data.status);
      
  } catch (err: any) { console.error('❌ FAIL: Request error:', err.message); }


  // Test 6: Cancellation Logic
  logSection(`[Test 6] Cancellation Logic`);
  try {
      // Event: first_value_action (cancels activation_nudge_v1)
      const payload = {
          event: "first_value_action",
          event_id: uuidv4(),
          user_id: userId,
          product: 'gtm-core',
          timestamp: new Date().toISOString(),
          properties: {}
      };
      
      logReq(payload);
      const res = await axios.post(`${BASE_URL}/events`, payload);
      logRes(res);

      if (res.data.status === 'received') {
           console.log('✅ PASS: Cancellation event accepted. Check server logs for "campaign_cancelled".');
      } else {
          console.error('❌ FAIL: Cancellation event rejected.');
      }
  } catch (err: any) { console.error('❌ FAIL: Request error:', err.message); }

  console.log('\n🏁 Complete Verification Suite Finished.');
  console.log('Please inspect server logs to confirm "campaign_scheduled", "campaign_duplicate_prevented", and "campaign_cancelled" entries.');
}

verifyComplete();
