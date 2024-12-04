import { getTemporalClient } from './client';

async function testConnection() {
    try {
        console.log('Attempting to connect to cloud Temporal server...');
        const cloudAddress = '35.159.193.134:7233';
        const client = await getTemporalClient(cloudAddress);
        console.log('Successfully connected to Temporal server at:', cloudAddress);
        
        // Try to list workflows as an additional connection test
        console.log('Attempting to query workflows...');
        const workflows = await client.searchWorkflows('');
        console.log('Successfully queried workflows:', workflows);
    } catch (error) {
        console.error('Failed to connect to Temporal server:', error);
        if (error instanceof Error) {
            console.error('Error details:', error.message);
            console.error('Stack trace:', error.stack);
            // Log the cause if it exists
            if ('cause' in error && error.cause instanceof Error) {
                console.error('Cause:', error.cause.message);
            }
        }
    }
}

testConnection();
