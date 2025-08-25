#!/usr/bin/env node

/**
 * Script to set up avatar bucket RLS policies
 * This uses the Supabase REST API to execute SQL
 */

const SUPABASE_URL = "https://mrkcgfsbdcukufgwvjap.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ya2NnZnNiZGN1a3VmZ3d2amFwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU3NTA5NTQsImV4cCI6MjA3MTMyNjk1NH0.-c6rqPPi0ieADLRfjBKc7tWIzkIlZnDs057vuo2ioEg";

console.log('📝 Setting up avatar bucket RLS policies...\n');
console.log('⚠️  Note: This script can only verify the bucket exists.');
console.log('To apply RLS policies, you need to:');
console.log('');
console.log('1. Go to: https://supabase.com/dashboard/project/mrkcgfsbdcukufgwvjap/storage/buckets/avatars');
console.log('2. Click on the "Policies" tab');
console.log('3. Click "New policy" and create these policies:\n');

const policies = [
  {
    name: 'Allow authenticated uploads',
    description: 'Give users INSERT access',
    type: 'INSERT',
    target: 'Authenticated users only',
    check: 'Leave empty or add: bucket_id = \'avatars\''
  },
  {
    name: 'Allow authenticated updates', 
    description: 'Give users UPDATE access',
    type: 'UPDATE',
    target: 'Authenticated users only',
    using: 'bucket_id = \'avatars\'',
    check: 'bucket_id = \'avatars\''
  },
  {
    name: 'Allow authenticated deletes',
    description: 'Give users DELETE access',
    type: 'DELETE', 
    target: 'Authenticated users only',
    using: 'bucket_id = \'avatars\''
  },
  {
    name: 'Allow public viewing',
    description: 'Give everyone SELECT access',
    type: 'SELECT',
    target: 'Public (anyone)',
    using: 'bucket_id = \'avatars\''
  }
];

console.log('📋 Policies to create:\n');
policies.forEach((policy, index) => {
  console.log(`Policy ${index + 1}: ${policy.name}`);
  console.log(`  - Operation: ${policy.type}`);
  console.log(`  - For: ${policy.target}`);
  if (policy.using) console.log(`  - Using: ${policy.using}`);
  if (policy.check) console.log(`  - With check: ${policy.check}`);
  console.log('');
});

// Verify bucket exists
async function verifyBucket() {
  try {
    const response = await fetch(`${SUPABASE_URL}/storage/v1/object/list/avatars`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ prefix: '', limit: 1 })
    });

    if (response.ok) {
      console.log('✅ Avatars bucket exists!\n');
      console.log('Now please create the policies above in your Supabase dashboard.');
      console.log('\nDirect link to policies page:');
      console.log('https://supabase.com/dashboard/project/mrkcgfsbdcukufgwvjap/storage/policies');
    } else {
      const error = await response.json();
      console.log('❌ Avatars bucket not found:', error.error);
      console.log('\nPlease create the bucket first in your dashboard.');
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

verifyBucket();