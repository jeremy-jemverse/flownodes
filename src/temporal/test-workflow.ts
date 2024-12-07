import { getTemporalClient } from './client';

// Test workflow schema
const testSchema = {
  workflowId: `test-workflow-${Date.now()}`,
  name: "SendGrid Test Workflow",
  description: "Test workflow for SendGrid email sending",
  version: "1.0.0",
  nodes: [
    {
      id: "sendgrid-1",
      type: "sendgrid",
      data: {
        apiKey: process.env.SENDGRID_API_KEY,
        to: "test@example.com",
        from: "your-verified-sender@yourdomain.com",
        subject: "Test Email from Workflow",
        type: "body",
        body: {
          content: "This is a test email from the Temporal workflow"
        }
      }
    }
  ],
  edges: [],
  execution: {
    mode: "sequential",
    retryPolicy: {
      maxAttempts: 3,
      initialInterval: "1s"
    }
  }
};

async function runWorkflowTest() {
  try {
    console.log('Starting workflow test...');
    
    // Connect to Temporal server
    const client = await getTemporalClient();
    console.log('Connected to Temporal server');

    // Start the workflow
    console.log('Starting workflow with ID:', testSchema.workflowId);
    const handle = await client.startWorkflow(
      testSchema.workflowId,
      'processWorkflow',
      [testSchema],
      {
        taskQueue: 'flownodes-queue'
      }
    );

    console.log('Workflow started');

    // Get workflow handle
    const workflowHandle = await client.getWorkflowHandle(testSchema.workflowId);

    // Poll workflow status every second for up to 60 seconds
    for (let i = 0; i < 60; i++) {
      try {
        const result = await workflowHandle.result();
        console.log('Workflow completed successfully');
        return result;
      } catch (error) {
        if (error instanceof Error && error.message.includes('COMPLETED')) {
          console.log('Workflow completed successfully');
          return;
        }
        
        if (error instanceof Error && 
           (error.message.includes('FAILED') || 
            error.message.includes('TERMINATED') || 
            error.message.includes('TIMED_OUT'))) {
          throw new Error(`Workflow failed: ${error.message}`);
        }
        
        // If workflow is still running, wait and try again
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    throw new Error('Workflow monitoring timed out after 60 seconds');
  } catch (error) {
    console.error('Workflow test failed:', error);
    if (error instanceof Error) {
      console.error('Error details:', error.message);
      console.error('Stack trace:', error.stack);
    }
    throw error;
  }
}

// Run the test
console.log('Initializing workflow test...');
runWorkflowTest()
  .then(() => {
    console.log('Test completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Test failed:', error);
    process.exit(1);
  });
