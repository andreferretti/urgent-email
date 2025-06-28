import * as dotenv from 'dotenv';
dotenv.config();

// Simulate the Vercel function locally
import handler from './api/check-emails';

async function testProductionFunction() {
  console.log('🧪 Testing production function locally...');
  console.log('This simulates what cron-job.org will call');
  
  // Mock Vercel request/response objects
  const mockReq = {} as any;
  const mockRes = {
    status: (code: number) => ({
      json: (data: any) => {
        console.log(`\n📊 Response (${code}):`, JSON.stringify(data, null, 2));
        return mockRes;
      }
    })
  } as any;
  
  await handler(mockReq, mockRes);
}

testProductionFunction();