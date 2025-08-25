#!/usr/bin/env node

/**
 * Direct test of the Streaming Availability API to verify it's working
 */

const API_KEY = 'ce60f1a86bmshd4fe91f2ed5c2ffp1d72b8jsn3e0ee0d6e66e';

async function testStreamingAPI() {
  const title = process.argv[2] || 'The Matrix';
  
  console.log(`\n🔍 Testing Streaming Availability API directly for: "${title}"\n`);

  try {
    // Try the basic search endpoint
    const params = new URLSearchParams({
      country: 'us',
      services: 'netflix,prime,disney,hbo,hulu,peacock,paramount,apple',
      type: 'movie',
      keyword: title,
      output_language: 'en'
    });

    const response = await fetch(`https://streaming-availability.p.rapidapi.com/search/basic?${params}`, {
      method: 'GET',
      headers: {
        'X-RapidAPI-Key': API_KEY,
        'X-RapidAPI-Host': 'streaming-availability.p.rapidapi.com'
      }
    });

    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ API Error:', errorText);
      return;
    }

    const data = await response.json();
    console.log('\n✅ API Response received\n');
    
    if (data.result && data.result.length > 0) {
      const show = data.result[0];
      console.log('Title:', show.title);
      console.log('Year:', show.year);
      console.log('Type:', show.type);
      
      if (show.streamingInfo && show.streamingInfo.us) {
        console.log('\n🎬 US Streaming Options:');
        
        for (const [service, info] of Object.entries(show.streamingInfo.us)) {
          console.log(`\n  ${service}:`);
          
          if (typeof info === 'object' && info !== null) {
            const serviceInfo = info;
            
            // Check different availability types
            if (serviceInfo.subscription) {
              console.log(`    Subscription: ${serviceInfo.subscription.link || 'link not provided'}`);
            }
            if (serviceInfo.rent) {
              console.log(`    Rent ($${serviceInfo.rent.price || '?'}): ${serviceInfo.rent.link || 'link not provided'}`);
            }
            if (serviceInfo.buy) {
              console.log(`    Buy ($${serviceInfo.buy.price || '?'}): ${serviceInfo.buy.link || 'link not provided'}`);
            }
            if (serviceInfo.link && !serviceInfo.subscription && !serviceInfo.rent && !serviceInfo.buy) {
              console.log(`    Link: ${serviceInfo.link}`);
            }
          }
        }
      } else {
        console.log('\n❌ No US streaming info found');
      }
    } else {
      console.log('❌ No results found');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testStreamingAPI();