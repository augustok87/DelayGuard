import { performance } from 'perf_hooks';

describe('Performance Tests', () => {
  describe('API Response Times', () => {
    it('should respond to health check within 100ms', async() => {
      const start = performance.now();
      
      const response = await fetch('/health');
      const data = await response.json();
      
      const end = performance.now();
      const responseTime = end - start;
      
      expect(response.ok).toBe(true);
      expect(responseTime).toBeLessThan(100);
    });

    it('should respond to API status within 200ms', async() => {
      const start = performance.now();
      
      const response = await fetch('/api');
      const data = await response.json();
      
      const end = performance.now();
      const responseTime = end - start;
      
      expect(response.ok).toBe(true);
      expect(responseTime).toBeLessThan(200);
    });
  });

  describe('Concurrent Request Handling', () => {
    it('should handle 10 concurrent requests', async() => {
      const start = performance.now();
      
      const promises = Array.from({ length: 10 }, () => fetch('/health'));
      const responses = await Promise.all(promises);
      
      const end = performance.now();
      const totalTime = end - start;
      
      expect(responses).toHaveLength(10);
      expect(responses.every(r => r.ok)).toBe(true);
      expect(totalTime).toBeLessThan(1000); // All requests within 1 second
    });

    it('should handle 50 concurrent requests', async() => {
      const start = performance.now();
      
      const promises = Array.from({ length: 50 }, () => fetch('/api'));
      const responses = await Promise.all(promises);
      
      const end = performance.now();
      const totalTime = end - start;
      
      expect(responses).toHaveLength(50);
      expect(responses.every(r => r.ok)).toBe(true);
      expect(totalTime).toBeLessThan(2000); // All requests within 2 seconds
    });
  });

  describe('Memory Usage', () => {
    it('should not leak memory during multiple requests', async() => {
      const initialMemory = process.memoryUsage();
      
      // Make 100 requests
      for (let i = 0; i < 100; i++) {
        await fetch('/health');
      }
      
      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      
      // Memory increase should be reasonable (less than 10MB)
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);
    });
  });

  describe('Error Recovery', () => {
    it('should recover quickly from errors', async() => {
      // First, make a request that might fail
      try {
        await fetch('/nonexistent-endpoint');
      } catch (error) {
        // Expected to fail
      }
      
      const start = performance.now();
      
      // Then make a successful request
      const response = await fetch('/health');
      
      const end = performance.now();
      const responseTime = end - start;
      
      expect(response.ok).toBe(true);
      expect(responseTime).toBeLessThan(100);
    });
  });
});
