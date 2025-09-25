import axios from 'axios';
import { performance } from 'perf_hooks';

interface LoadTestConfig {
  baseUrl: string;
  concurrency: number;
  duration: number; // seconds
  endpoints: Array<{
    path: string;
    method: 'GET' | 'POST' | 'PUT';
    data?: any;
    headers?: any;
  }>;
}

interface TestResult {
  endpoint: string;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  requestsPerSecond: number;
  errors: Array<{
    message: string;
    count: number;
  }>;
}

class LoadTester {
  private config: LoadTestConfig;
  private results: Map<string, TestResult> = new Map();

  constructor(config: LoadTestConfig) {
    this.config = config;
  }

  async runLoadTest(): Promise<Map<string, TestResult>> {
    console.log(`🚀 Starting load test with ${this.config.concurrency} concurrent users for ${this.config.duration} seconds`);
    
    const startTime = performance.now();
    const endTime = startTime + (this.config.duration * 1000);

    // Create workers for each endpoint
    const workers = this.config.endpoints.map(endpoint => 
      this.createWorker(endpoint, endTime)
    );

    // Wait for all workers to complete
    await Promise.all(workers);

    console.log('✅ Load test completed');
    return this.results;
  }

  private createWorker(endpoint: any, endTime: number): Promise<void> {
    return new Promise((resolve) => {
      const worker = async () => {
        const endpointResults: TestResult = {
          endpoint: endpoint.path,
          totalRequests: 0,
          successfulRequests: 0,
          failedRequests: 0,
          averageResponseTime: 0,
          minResponseTime: Infinity,
          maxResponseTime: 0,
          requestsPerSecond: 0,
          errors: []
        };

        const responseTimes: number[] = [];
        const errorCounts: Map<string, number> = new Map();

        while (performance.now() < endTime) {
          const requestStart = performance.now();
          
          try {
            const response = await this.makeRequest(endpoint);
            const responseTime = performance.now() - requestStart;
            
            endpointResults.totalRequests++;
            endpointResults.successfulRequests++;
            responseTimes.push(responseTime);
            
            endpointResults.minResponseTime = Math.min(endpointResults.minResponseTime, responseTime);
            endpointResults.maxResponseTime = Math.max(endpointResults.maxResponseTime, responseTime);
            
          } catch (error: any) {
            endpointResults.totalRequests++;
            endpointResults.failedRequests++;
            
            const errorMessage = error.message || 'Unknown error';
            errorCounts.set(errorMessage, (errorCounts.get(errorMessage) || 0) + 1);
          }

          // Small delay to prevent overwhelming the server
          await new Promise(resolve => setTimeout(resolve, 10));
        }

        // Calculate final metrics
        if (responseTimes.length > 0) {
          endpointResults.averageResponseTime = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
          endpointResults.requestsPerSecond = endpointResults.totalRequests / (this.config.duration);
        }

        // Convert error counts to array
        endpointResults.errors = Array.from(errorCounts.entries()).map(([message, count]) => ({
          message,
          count
        }));

        this.results.set(endpoint.path, endpointResults);
        resolve();
      };

      // Start multiple concurrent workers for this endpoint
      const workers = Array(this.config.concurrency).fill(null).map(() => worker());
      Promise.all(workers).then(() => resolve());
    });
  }

  private async makeRequest(endpoint: any): Promise<any> {
    const url = `${this.config.baseUrl}${endpoint.path}`;
    
    const config = {
      method: endpoint.method,
      url,
      data: endpoint.data,
      headers: {
        'Content-Type': 'application/json',
        ...endpoint.headers
      },
      timeout: 10000 // 10 second timeout
    };

    const response = await axios(config);
    return response.data;
  }

  printResults(): void {
    console.log('\n📊 Load Test Results');
    console.log('='.repeat(80));

    this.results.forEach((result, endpoint) => {
      console.log(`\n🔗 Endpoint: ${endpoint}`);
      console.log(`   Total Requests: ${result.totalRequests}`);
      console.log(`   Successful: ${result.successfulRequests} (${((result.successfulRequests / result.totalRequests) * 100).toFixed(1)}%)`);
      console.log(`   Failed: ${result.failedRequests} (${((result.failedRequests / result.totalRequests) * 100).toFixed(1)}%)`);
      console.log(`   Requests/sec: ${result.requestsPerSecond.toFixed(2)}`);
      console.log(`   Avg Response Time: ${result.averageResponseTime.toFixed(2)}ms`);
      console.log(`   Min Response Time: ${result.minResponseTime === Infinity ? 'N/A' : result.minResponseTime.toFixed(2)}ms`);
      console.log(`   Max Response Time: ${result.maxResponseTime.toFixed(2)}ms`);

      if (result.errors.length > 0) {
        console.log(`   Errors:`);
        result.errors.forEach(error => {
          console.log(`     - ${error.message}: ${error.count} times`);
        });
      }
    });

    // Overall summary
    const totalRequests = Array.from(this.results.values()).reduce((sum, result) => sum + result.totalRequests, 0);
    const totalSuccessful = Array.from(this.results.values()).reduce((sum, result) => sum + result.successfulRequests, 0);
    const totalFailed = Array.from(this.results.values()).reduce((sum, result) => sum + result.failedRequests, 0);
    const avgResponseTime = Array.from(this.results.values()).reduce((sum, result) => sum + result.averageResponseTime, 0) / this.results.size;

    console.log('\n📈 Overall Summary');
    console.log('='.repeat(40));
    console.log(`Total Requests: ${totalRequests}`);
    console.log(`Success Rate: ${((totalSuccessful / totalRequests) * 100).toFixed(1)}%`);
    console.log(`Failure Rate: ${((totalFailed / totalRequests) * 100).toFixed(1)}%`);
    console.log(`Average Response Time: ${avgResponseTime.toFixed(2)}ms`);
  }
}

// Load test configurations
const loadTestConfigs = {
  // Basic API load test
  basic: {
    baseUrl: 'http://localhost:3000',
    concurrency: 10,
    duration: 30, // 30 seconds
    endpoints: [
      { path: '/health', method: 'GET' },
      { path: '/api/settings', method: 'GET' },
      { path: '/api/stats', method: 'GET' }
    ]
  },

  // Webhook load test
  webhook: {
    baseUrl: 'http://localhost:3000',
    concurrency: 5,
    duration: 60, // 1 minute
    endpoints: [
      {
        path: '/webhooks/orders/updated',
        method: 'POST',
        data: {
          id: 12345,
          name: '1001',
          customer: {
            first_name: 'John',
            last_name: 'Doe',
            email: 'john@example.com'
          },
          fulfillments: [],
          fulfillment_status: 'unfulfilled'
        },
        headers: {
          'X-Shopify-Shop-Domain': 'test-shop.myshopify.com',
          'X-Shopify-Hmac-Sha256': 'test-hmac'
        }
      }
    ]
  },

  // Stress test
  stress: {
    baseUrl: 'http://localhost:3000',
    concurrency: 50,
    duration: 120, // 2 minutes
    endpoints: [
      { path: '/health', method: 'GET' },
      { path: '/api/settings', method: 'GET' },
      { path: '/api/stats', method: 'GET' },
      {
        path: '/api/test-delay',
        method: 'POST',
        data: {
          trackingNumber: '1Z999AA1234567890',
          carrierCode: 'ups'
        }
      }
    ]
  }
};

async function runLoadTest(testName: keyof typeof loadTestConfigs) {
  const config = loadTestConfigs[testName];
  const tester = new LoadTester(config);
  
  try {
    await tester.runLoadTest();
    tester.printResults();
  } catch (error) {
    console.error('❌ Load test failed:', error);
    process.exit(1);
  }
}

// Run load test based on command line argument
const testName = process.argv[2] as keyof typeof loadTestConfigs || 'basic';

if (!loadTestConfigs[testName]) {
  console.error(`❌ Unknown test: ${testName}`);
  console.error(`Available tests: ${Object.keys(loadTestConfigs).join(', ')}`);
  process.exit(1);
}

console.log(`🎯 Running ${testName} load test...`);
runLoadTest(testName);
