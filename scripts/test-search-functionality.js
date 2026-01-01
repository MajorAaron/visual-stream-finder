#!/usr/bin/env node

/**
 * Test script for unified-search edge function
 * Tests various search query types: IMDb URLs, titles, descriptions, etc.
 * 
 * Usage:
 *   node scripts/test-search-functionality.js [local|production]
 * 
 * Defaults to production if no argument provided
 */

const SUPABASE_URL_PROD = "https://mrkcgfsbdcukufgwvjap.supabase.co";
const SUPABASE_URL_LOCAL = "http://127.0.0.1:54321";
const SUPABASE_ANON_KEY_PROD = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ya2NnZnNiZGN1a3VmZ3d2amFwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU3NTA5NTQsImV4cCI6MjA3MTMyNjk1NH0.-c6rqPPi0ieADLRfjBKc7tWIzkIlZnDs057vuo2ioEg";
// Local Supabase uses the demo anon key
const SUPABASE_ANON_KEY_LOCAL = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";

// Test cases: { query, expectedTitle, expectedYear?, description }
const TEST_CASES = [
  // IMDb URLs
  {
    query: "https://www.imdb.com/title/tt0133093/",
    expectedTitle: "The Matrix",
    expectedYear: 1999,
    description: "IMDb URL - The Matrix"
  },
  {
    query: "https://imdb.com/title/tt0816692",
    expectedTitle: "Interstellar",
    expectedYear: 2014,
    description: "IMDb URL - Interstellar (no trailing slash)"
  },
  {
    query: "imdb.com/title/tt0944947",
    expectedTitle: "Game of Thrones",
    expectedYear: 2011,
    description: "IMDb URL - Game of Thrones (no protocol)"
  },

  // Simple titles
  {
    query: "The Matrix",
    expectedTitle: "The Matrix",
    expectedYear: 1999,
    description: "Simple title - The Matrix"
  },
  {
    query: "Inception",
    expectedTitle: "Inception",
    expectedYear: 2010,
    description: "Simple title - Inception"
  },
  {
    query: "Breaking Bad",
    expectedTitle: "Breaking Bad",
    expectedYear: 2008,
    description: "Simple title - Breaking Bad (TV show)"
  },
  {
    query: "Stranger Things",
    expectedTitle: "Stranger Things",
    expectedYear: 2016,
    description: "Simple title - Stranger Things"
  },
  {
    query: "The Dark Knight",
    expectedTitle: "The Dark Knight",
    expectedYear: 2008,
    description: "Simple title - The Dark Knight"
  },

  // Titles with year
  {
    query: "Pulp Fiction 1994",
    expectedTitle: "Pulp Fiction",
    expectedYear: 1994,
    description: "Title with year - Pulp Fiction 1994"
  },
  {
    query: "The Office (2005)",
    expectedTitle: "The Office",
    expectedYear: 2005,
    description: "Title with year in parentheses - The Office (2005)"
  },

  // Descriptions
  {
    query: "A movie about a hacker who discovers reality is a simulation",
    expectedTitle: "The Matrix",
    expectedYear: 1999,
    description: "Description - Matrix plot description"
  },
  {
    query: "Christopher Nolan movie about dreams within dreams",
    expectedTitle: "Inception",
    expectedYear: 2010,
    description: "Description - Inception plot description"
  },
  {
    query: "TV show about a high school chemistry teacher who becomes a drug dealer",
    expectedTitle: "Breaking Bad",
    expectedYear: 2008,
    description: "Description - Breaking Bad plot description"
  },
  {
    query: "Sci-fi show set in the 80s with kids and supernatural forces",
    expectedTitle: "Stranger Things",
    expectedYear: 2016,
    description: "Description - Stranger Things plot description"
  },

  // Partial/misspelled titles
  {
    query: "Matrix",
    expectedTitle: "The Matrix",
    expectedYear: 1999,
    description: "Partial title - Matrix"
  },
  {
    query: "Dark Knight",
    expectedTitle: "The Dark Knight",
    expectedYear: 2008,
    description: "Partial title - Dark Knight"
  },

  // Different movie/show types
  {
    query: "Parasite",
    expectedTitle: "Parasite",
    expectedYear: 2019,
    description: "International film - Parasite"
  },
  {
    query: "The Crown",
    expectedTitle: "The Crown",
    expectedYear: 2016,
    description: "TV series - The Crown"
  },
  {
    query: "Dune",
    expectedTitle: "Dune",
    expectedYear: 2021,
    description: "Recent film - Dune (2021)"
  },
  {
    query: "The Mandalorian",
    expectedTitle: "The Mandalorian",
    expectedYear: 2019,
    description: "TV series - The Mandalorian"
  },
  {
    query: "Everything Everywhere All at Once",
    expectedTitle: "Everything Everywhere All at Once",
    expectedYear: 2022,
    description: "Long title - Everything Everywhere All at Once"
  }
];

// Helper function to normalize title for comparison (case-insensitive, trim)
function normalizeTitle(title) {
  return title.toLowerCase().trim();
}

// Helper function to check if result matches expected
function checkResult(result, expectedTitle, expectedYear) {
  const normalizedResultTitle = normalizeTitle(result.title);
  const normalizedExpectedTitle = normalizeTitle(expectedTitle);
  
  const titleMatch = normalizedResultTitle === normalizedExpectedTitle;
  const yearMatch = expectedYear ? result.year === expectedYear : true;
  
  return {
    titleMatch,
    yearMatch,
    passed: titleMatch && yearMatch,
    actualTitle: result.title,
    actualYear: result.year
  };
}

// Make search request to edge function
async function searchContent(query, baseUrl, anonKey) {
  const url = `${baseUrl}/functions/v1/unified-search`;
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': anonKey,
        'Authorization': `Bearer ${anonKey}`
      },
      body: JSON.stringify({ query })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    
    if (data.error) {
      throw new Error(data.error);
    }

    return data.results || [];
  } catch (error) {
    throw error;
  }
}

// Run a single test case
async function runTest(testCase, baseUrl, anonKey, index, total) {
  const { query, expectedTitle, expectedYear, description } = testCase;
  
  console.log(`\n${'='.repeat(80)}`);
  console.log(`Test ${index + 1}/${total}: ${description}`);
  console.log(`${'='.repeat(80)}`);
  console.log(`Query: "${query}"`);
  console.log(`Expected: "${expectedTitle}"${expectedYear ? ` (${expectedYear})` : ''}`);
  
  try {
    const startTime = Date.now();
    const results = await searchContent(query, baseUrl, anonKey);
    const duration = Date.now() - startTime;
    
    if (results.length === 0) {
      console.log(`❌ FAILED: No results returned`);
      console.log(`⏱️  Duration: ${duration}ms`);
      return { passed: false, duration, error: 'No results' };
    }

    const topResult = results[0];
    const check = checkResult(topResult, expectedTitle, expectedYear);
    
    console.log(`\nResult:`);
    console.log(`  Title: "${topResult.title}"`);
    console.log(`  Year: ${topResult.year}`);
    console.log(`  Type: ${topResult.type}`);
    console.log(`  Confidence: ${(topResult.confidence * 100).toFixed(1)}%`);
    if (topResult.poster) {
      console.log(`  Poster: ${topResult.poster.substring(0, 60)}...`);
    }
    if (topResult.streamingSources && topResult.streamingSources.length > 0) {
      console.log(`  Streaming: ${topResult.streamingSources.length} source(s) found`);
    }
    
    console.log(`\nValidation:`);
    console.log(`  Title match: ${check.titleMatch ? '✅' : '❌'} ${check.titleMatch ? 'PASS' : `FAIL (expected "${expectedTitle}", got "${check.actualTitle}")`}`);
    if (expectedYear) {
      console.log(`  Year match:  ${check.yearMatch ? '✅' : '❌'} ${check.yearMatch ? 'PASS' : `FAIL (expected ${expectedYear}, got ${check.actualYear})`}`);
    }
    
    const status = check.passed ? '✅ PASSED' : '❌ FAILED';
    console.log(`\n${status}`);
    console.log(`⏱️  Duration: ${duration}ms`);
    
    if (results.length > 1) {
      console.log(`\nNote: ${results.length - 1} additional result(s) returned (showing first only)`);
    }
    
    return { 
      passed: check.passed, 
      duration, 
      result: topResult,
      check
    };
  } catch (error) {
    console.log(`❌ ERROR: ${error.message}`);
    return { passed: false, duration: 0, error: error.message };
  }
}

// Main test runner
async function runTests() {
  const environment = process.argv[2] || 'production';
  const isLocal = environment === 'local';
  const baseUrl = isLocal ? SUPABASE_URL_LOCAL : SUPABASE_URL_PROD;
  const anonKey = isLocal ? SUPABASE_ANON_KEY_LOCAL : SUPABASE_ANON_KEY_PROD;
  
  console.log(`\n${'='.repeat(80)}`);
  console.log(`🧪 SEARCH FUNCTIONALITY TEST SUITE`);
  console.log(`${'='.repeat(80)}`);
  console.log(`Environment: ${environment.toUpperCase()}`);
  console.log(`Base URL: ${baseUrl}`);
  console.log(`Test Cases: ${TEST_CASES.length}`);
  console.log(`${'='.repeat(80)}\n`);

  const results = [];
  const startTime = Date.now();

  for (let i = 0; i < TEST_CASES.length; i++) {
    const testResult = await runTest(TEST_CASES[i], baseUrl, anonKey, i, TEST_CASES.length);
    results.push(testResult);
    
    // Small delay between tests to avoid rate limiting
    if (i < TEST_CASES.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  const totalDuration = Date.now() - startTime;
  
  // Summary
  console.log(`\n\n${'='.repeat(80)}`);
  console.log(`📊 TEST SUMMARY`);
  console.log(`${'='.repeat(80)}`);
  
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const avgDuration = results.reduce((sum, r) => sum + r.duration, 0) / results.length;
  
  console.log(`Total Tests: ${results.length}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`⏱️  Average Duration: ${avgDuration.toFixed(0)}ms`);
  console.log(`⏱️  Total Duration: ${(totalDuration / 1000).toFixed(1)}s`);
  console.log(`Success Rate: ${((passed / results.length) * 100).toFixed(1)}%`);
  
  if (failed > 0) {
    console.log(`\n❌ Failed Tests:`);
    TEST_CASES.forEach((testCase, index) => {
      if (!results[index].passed) {
        console.log(`  ${index + 1}. ${testCase.description}`);
        console.log(`     Query: "${testCase.query}"`);
        if (results[index].error) {
          console.log(`     Error: ${results[index].error}`);
        } else if (results[index].check) {
          if (!results[index].check.titleMatch) {
            console.log(`     Expected title: "${testCase.expectedTitle}", Got: "${results[index].check.actualTitle}"`);
          }
          if (testCase.expectedYear && !results[index].check.yearMatch) {
            console.log(`     Expected year: ${testCase.expectedYear}, Got: ${results[index].check.actualYear}`);
          }
        }
      }
    });
  }
  
  console.log(`${'='.repeat(80)}\n`);
  
  // Exit with appropriate code
  process.exit(failed > 0 ? 1 : 0);
}

// Run tests
runTests().catch(error => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});
