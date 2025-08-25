#!/usr/bin/env node

/**
 * Test script for the search-content edge function locally
 * This allows debugging without needing Docker or the full Supabase stack
 */

const searchQuery = process.argv[2] || "The Matrix";

async function testSearchContent() {
  console.log(`\n🔍 Testing search-content function with query: "${searchQuery}"\n`);

  try {
    // Call the production edge function for now
    // Update this URL to http://localhost:54321 when Supabase is running locally
    const response = await fetch('https://mrkcgfsbdcukufgwvjap.supabase.co/functions/v1/search-content', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ya2NnZnNiZGN1a3VmZ3d2amFwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU3NTA5NTQsImV4cCI6MjA3MTMyNjk1NH0.-c6rqPPi0ieADLRfjBKc7tWIzkIlZnDs057vuo2ioEg'
      },
      body: JSON.stringify({ query: searchQuery })
    });

    if (!response.ok) {
      console.error('❌ Response not OK:', response.status, response.statusText);
      const errorText = await response.text();
      console.error('Error response:', errorText);
      return;
    }

    const data = await response.json();
    
    console.log('✅ Response received\n');
    console.log('Number of results:', data.results?.length || 0);
    
    if (data.results && data.results.length > 0) {
      data.results.forEach((result, index) => {
        console.log(`\n--- Result ${index + 1} ---`);
        console.log('Title:', result.title);
        console.log('Year:', result.year);
        console.log('Type:', result.type);
        console.log('Rating:', result.rating);
        console.log('Genres:', result.genre?.join(', '));
        console.log('Plot:', result.plot?.substring(0, 100) + '...');
        
        if (result.streamingSources && result.streamingSources.length > 0) {
          console.log('Streaming Sources:');
          result.streamingSources.forEach(source => {
            console.log(`  - ${source.name}: ${source.url}`);
          });
        } else {
          console.log('Streaming Sources: None found');
        }
      });
    } else {
      console.log('No results found');
    }
    
  } catch (error) {
    console.error('❌ Error calling function:', error);
  }
}

// Run the test
testSearchContent();