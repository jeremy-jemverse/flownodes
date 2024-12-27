import { executeSendGridNode } from '../activities';

async function testSendGrid() {
  console.log('Starting SendGrid test with workflow input...');

  const apiKey = process.env.SENDGRID_API_KEY;
  if (!apiKey) {
    throw new Error('SENDGRID_API_KEY environment variable is required');
  }

  const workflowInput = {
    id: 'sendgrid-55669de5-7f89-48f3-9aff-a659d74a3080',
    type: 'sendgrid',
    category: 'sendgrid',
    data: {
      label: 'sendgrid',
      nodeType: 'sendgrid',
      category: 'sendgrid',
      config: {
        label: 'SendGrid Email',
        description: '',
        email: {
          type: 'body',
          to: 'jeremy.snyman@gmail.com',
          from: 'jsnyman@1digit.co.uk',
          subject: 'Subject',
          body: {
            html: '',
            text: 'Body'
          }
        },
        connection: {
          id: '53439936-980a-444d-9823-0ccfe3a91d35',
          apiKey
        }
      }
    }
  };

  try {
    const result = await executeSendGridNode(workflowInput);
    console.log('SendGrid test result:', result);
  } catch (error) {
    console.error('SendGrid test failed:', error);
    throw error;
  }
}

testSendGrid();
