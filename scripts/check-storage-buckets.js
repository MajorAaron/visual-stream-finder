#!/usr/bin/env node

/**
 * Script to check existing storage buckets in Supabase
 */

async function checkBuckets() {
  const SUPABASE_URL = "https://mrkcgfsbdcukufgwvjap.supabase.co";
  const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ya2NnZnNiZGN1a3VmZ3d2amFwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU3NTA5NTQsImV4cCI6MjA3MTMyNjk1NH0.-c6rqPPi0ieADLRfjBKc7tWIzkIlZnDs057vuo2ioEg";

  console.log('🔍 Checking storage buckets in Supabase...\n');

  try {
    // Try to list buckets via REST API
    const response = await fetch(`${SUPABASE_URL}/storage/v1/bucket`, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.log('⚠️  Cannot list buckets with anon key (this is expected)');
      console.log('Response:', errorText);
    } else {
      const buckets = await response.json();
      console.log('📦 Storage buckets found:');
      buckets.forEach(bucket => {
        console.log(`  - ${bucket.name} (${bucket.public ? 'public' : 'private'})`);
      });
    }

    // Try to check if avatars bucket exists by attempting to list files
    console.log('\n🔍 Checking if avatars bucket exists...');
    const avatarResponse = await fetch(`${SUPABASE_URL}/storage/v1/object/list/avatars`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        prefix: '',
        limit: 1
      })
    });

    if (avatarResponse.status === 400) {
      const error = await avatarResponse.json();
      if (error.error === 'Bucket not found') {
        console.log('❌ Avatars bucket does not exist');
        console.log('\n📝 To create the avatars bucket:');
        console.log('1. Go to your Supabase dashboard: https://supabase.com/dashboard/project/mrkcgfsbdcukufgwvjap');
        console.log('2. Navigate to Storage in the left sidebar');
        console.log('3. Click "New bucket"');
        console.log('4. Enter these settings:');
        console.log('   - Name: avatars');
        console.log('   - Public: Yes (toggle on)');
        console.log('   - File size limit: 5MB');
        console.log('   - Allowed MIME types: image/jpeg, image/jpg, image/png, image/webp');
        console.log('5. Click "Create bucket"');
      } else {
        console.log('Error:', error);
      }
    } else if (avatarResponse.ok) {
      console.log('✅ Avatars bucket exists and is accessible');
    } else {
      console.log('⚠️  Unexpected response:', avatarResponse.status);
      const text = await avatarResponse.text();
      console.log(text);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Run the check
checkBuckets();