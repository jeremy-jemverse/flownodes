import { Context } from '@temporalio/activity';
import { TestWorkflowEnvironment } from '@temporalio/testing';
import '@testing-library/jest-dom';

// Mock the Temporal context
jest.mock('@temporalio/activity', () => ({
  Context: {
    current: {
      info: {
        workflowExecution: {
          workflowId: 'test-workflow',
          runId: 'test-run'
        },
        activityInfo: {
          activityId: 'test-activity',
          attempt: 1
        }
      }
    }
  }
}));

// Set longer timeout for Temporal tests
jest.setTimeout(30000);

// Clean up test environment
afterAll(async () => {
  const testEnv = await TestWorkflowEnvironment.createLocal();
  await testEnv.teardown();
});

// Add custom Jest matchers
declare global {
  namespace jest {
    interface Matchers<R> {
      toHaveBeenCalledAfter: (mock: jest.Mock) => R;
    }
  }
}

// Custom matcher to check if a mock was called after another mock
expect.extend({
  toHaveBeenCalledAfter(received: jest.Mock, other: jest.Mock) {
    const receivedCalls = received.mock.invocationCallOrder;
    const otherCalls = other.mock.invocationCallOrder;

    if (receivedCalls.length === 0) {
      return {
        message: () => `Expected mock to be called after ${other.getMockName()}, but it was never called`,
        pass: false,
      };
    }

    if (otherCalls.length === 0) {
      return {
        message: () => `Expected mock to be called after ${other.getMockName()}, but ${other.getMockName()} was never called`,
        pass: false,
      };
    }

    const pass = Math.min(...receivedCalls) > Math.max(...otherCalls);

    return {
      message: () => pass
        ? `Expected mock not to be called after ${other.getMockName()}`
        : `Expected mock to be called after ${other.getMockName()}`,
      pass,
    };
  },
});
