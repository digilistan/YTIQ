import http from 'http';

function makeRequest(url) {
  return new Promise((resolve) => {
    const req = http.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const body = JSON.parse(data);
          resolve({
            status: res.statusCode,
            success: res.statusCode === 200,
            database: body.database,
            dbStatus: body.status,
          });
        } catch (err) {
          resolve({
            status: res.statusCode,
            success: false,
            error: 'Failed to parse JSON: ' + err.message,
          });
        }
      });
    });
    
    req.on('error', (err) => {
      resolve({
        status: 0,
        success: false,
        error: err.message,
      });
    });
  });
}

async function runConcurrencyTest() {
  const url = 'http://localhost:5000/api/health';
  const concurrencyCount = 50;
  console.log(`Starting concurrency test on ${url} with ${concurrencyCount} parallel requests using http.get...`);

  const promises = [];
  const start = Date.now();

  for (let i = 0; i < concurrencyCount; i++) {
    promises.push(makeRequest(url));
  }

  const results = await Promise.all(promises);
  const duration = Date.now() - start;

  console.log(`\nCompleted ${concurrencyCount} requests in ${duration}ms.`);

  let succeeded = 0;
  let failed = 0;
  const errors = [];

  for (let i = 0; i < results.length; i++) {
    const res = results[i];
    if (res.success && res.status === 200 && res.database === 'CONNECTED' && res.dbStatus === 'UP') {
      succeeded++;
    } else {
      failed++;
      errors.push({ id: i + 1, ...res });
    }
  }

  console.log(`Success rate: ${succeeded}/${concurrencyCount} (200 OK & Database CONNECTED)`);
  console.log(`Failure rate: ${failed}/${concurrencyCount}`);

  if (failed > 0) {
    console.error('Failed requests details:', JSON.stringify(errors, null, 2));
    process.exit(1);
  } else {
    console.log('PASS: All concurrent requests returned 200 OK and verified database connectivity successfully without crashing the server!');
    process.exit(0);
  }
}

runConcurrencyTest();
