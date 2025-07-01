import * as dotenv from 'dotenv';
dotenv.config();

// Simulate the Vercel function locally
import handler from './api/check-emails';

async function testProductionFunction() {
  console.log('🧪 Testing production function locally...');
  
  // Get hours from command line argument (default: 24)
  const hours = process.argv[2] ? parseInt(process.argv[2]) : 24;
  console.log(`📅 Checking emails from last ${hours} hours`);
  
  // Mock Vercel request/response objects
  const mockReq = { query: { hours: hours.toString() } } as any;
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