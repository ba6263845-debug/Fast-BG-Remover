/**
 * Basic API Endpoints Verification Suite
 * Can be run with: npx tsx tests/api.test.ts
 */

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';

async function runTests() {
  console.log(`Starting CutOut Pro API validation tests against ${BASE_URL}...`);
  let passed = 0;
  let failed = 0;

  // 1. Health check test
  try {
    const res = await fetch(`${BASE_URL}/api/health`);
    const data = await res.json();
    if (res.status === 200 && data.status === 'healthy' && Array.isArray(data.supportedModels)) {
      console.log('✔ Test 1: GET /api/health returned healthy status');
      passed++;
    } else {
      console.error('❌ Test 1 Failed: unexpected response', data);
      failed++;
    }
  } catch (err: any) {
    console.error('❌ Test 1 Failed:', err.message);
    failed++;
  }

  // 2. Remove-bg endpoint test with sample pixel
  try {
    const samplePixel = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    const res = await fetch(`${BASE_URL}/api/remove-bg`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image: samplePixel,
        model: 'BiRefNet-General',
        feather: 2,
      }),
    });
    const data = await res.json();
    if (res.status === 200 && data.success === true && typeof data.resultImage === 'string') {
      console.log('✔ Test 2: POST /api/remove-bg processed image successfully');
      passed++;
    } else {
      console.error('❌ Test 2 Failed:', data);
      failed++;
    }
  } catch (err: any) {
    console.error('❌ Test 2 Failed:', err.message);
    failed++;
  }

  // 3. API Key Generation test
  try {
    const res = await fetch(`${BASE_URL}/api/auth/generate-key`, { method: 'POST' });
    const data = await res.json();
    if (res.status === 200 && data.apiKey?.startsWith('sk_cutout_')) {
      console.log('✔ Test 3: POST /api/auth/generate-key generated free unlimited key');
      passed++;
    } else {
      console.error('❌ Test 3 Failed:', data);
      failed++;
    }
  } catch (err: any) {
    console.error('❌ Test 3 Failed:', err.message);
    failed++;
  }

  // 4. Free AI Backdrop Generation test
  try {
    const res = await fetch(`${BASE_URL}/api/generate-backdrop`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: 'Minimalist white marble podium',
        width: 800,
        height: 800,
      }),
    });
    const data = await res.json();
    if (res.status === 200 && data.success === true && typeof data.backdropUrl === 'string') {
      console.log('✔ Test 4: POST /api/generate-backdrop generated free studio backdrop successfully');
      passed++;
    } else {
      console.error('❌ Test 4 Failed:', data);
      failed++;
    }
  } catch (err: any) {
    console.error('❌ Test 4 Failed:', err.message);
    failed++;
  }

  console.log(`\nTest results: ${passed} passed, ${failed} failed.`);
  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
