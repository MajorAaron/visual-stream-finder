#!/usr/bin/env node

/**
 * Script to create the avatars storage bucket in Supabase
 * Run this to set up the avatar storage bucket if it doesn't exist
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://mrkcgfsbdcukufgwvjap.supabase.co";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_SERVICE_KEY) {
  console.error('❌ Please set SUPABASE_SERVICE_KEY environment variable');
  console.error('You can find this in your Supabase dashboard under Settings > API');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function createAvatarBucket() {
  console.log('🚀 Creating avatars storage bucket...');
  
  try {
    // Create the bucket
    const { data, error } = await supabase.storage.createBucket('avatars', {
      public: true,
      allowedMimeTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
      fileSizeLimit: 5242880 // 5MB
    });

    if (error) {
      if (error.message.includes('already exists')) {
        console.log('✅ Avatars bucket already exists');
      } else {
        console.error('❌ Error creating bucket:', error.message);
        process.exit(1);
      }
    } else {
      console.log('✅ Avatars bucket created successfully');
    }

    // List buckets to verify
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      console.error('❌ Error listing buckets:', listError.message);
    } else {
      console.log('\n📦 Storage buckets:');
      buckets.forEach(bucket => {
        console.log(`  - ${bucket.name} (${bucket.public ? 'public' : 'private'})`);
      });
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  }
}

// Run the script
createAvatarBucket();