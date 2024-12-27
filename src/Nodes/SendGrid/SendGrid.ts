import sgMail, { MailDataRequired } from '@sendgrid/mail';
import { SendGridParameters, SendGridResponse } from './types';

interface MailContent {
  type: string;
  value: string;
}

export class SendGrid {
  private readonly client: typeof sgMail;

  constructor() {
    this.client = sgMail;
  }

  private validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private formatEmailAddress(email: string): string {
    if (!this.validateEmail(email)) {
      throw new Error(`Invalid email address: ${email}`);
    }
    return email;
  }

  private formatRecipients(to: string | string[]): string[] {
    const recipients = Array.isArray(to) ? to : [to];
    return recipients.map(recipient => this.formatEmailAddress(recipient));
  }

  public validateParameters(params: SendGridParameters): void {
    console.log('[SendGrid] Validating parameters:', params);

    if (!params.apiKey) {
      throw new Error('SendGrid API key is required');
    }

    if (!params.to) {
      throw new Error('Recipient email is required');
    }

    if (!params.from) {
      throw new Error('Sender email is required');
    }

    if (!params.subject) {
      throw new Error('Email subject is required');
    }

    if (!params.type || !['body', 'template'].includes(params.type)) {
      throw new Error(`Invalid email type: ${params.type}`);
    }

    if (params.type === 'body' && !params.text && !params.html) {
      throw new Error('Either HTML or text body is required for body emails');
    }

    if (params.type === 'template' && !params.templateId) {
      throw new Error('Template ID is required for template emails');
    }
  }

  private formatRequestBody(params: SendGridParameters): MailDataRequired {
    console.log('[SendGrid] Formatting request body');
    
    let requestBody: Partial<MailDataRequired> = {
      to: Array.isArray(params.to) ? params.to : [params.to],
      from: params.from,
      subject: params.subject,
    };

    if (params.type === 'body') {
      console.log('[SendGrid] Processing body email');
      
      const content: MailContent[] = [];
      
      if (params.text) {
        content.push({
          type: 'text/plain',
          value: params.text
        });
      }

      if (params.html) {
        content.push({
          type: 'text/html',
          value: params.html
        });
      }

      // Ensure at least one content type is present
      if (content.length === 0) {
        content.push({
          type: 'text/plain',
          value: ' '
        });
      }

      requestBody.content = content;
    } else if (params.type === 'template') {
      console.log('[SendGrid] Processing template email');
      requestBody.templateId = params.templateId;
      
      if (params.dynamicTemplateData) {
        requestBody.dynamicTemplateData = params.dynamicTemplateData;
      }
    }

    console.log('[SendGrid] Request body prepared:', JSON.stringify(requestBody, null, 2));
    return requestBody as MailDataRequired;
  }

  public static fromWorkflowData(workflowData: any): SendGridParameters {
    console.log('[SendGrid] Processing workflow data:', JSON.stringify(workflowData, null, 2));
    
    // Find SendGrid node in workflow data
    const node = workflowData.nodes?.find((n: any) => n.type.toLowerCase() === 'sendgrid');
    if (!node) {
      throw new Error('No SendGrid node found in workflow');
    }

    if (!node.data?.config) {
      throw new Error('Invalid node data structure: missing data.config');
    }

    const { config } = node.data;
    if (!config.email || !config.connection) {
      throw new Error('Invalid config structure: missing email or connection configuration');
    }

    // Transform to SendGrid parameters
    const params = {
      apiKey: config.connection.apiKey,
      to: config.email.to,
      from: config.email.from,
      subject: config.email.subject,
      type: config.email.type,
      text: config.email.body?.text || '',
      html: config.email.body?.html || ''
    };

    console.log('[SendGrid] Transformed parameters:', JSON.stringify({
      ...params,
      apiKey: '***' // Hide API key in logs
    }, null, 2));

    return params;
  }

  public async execute(params: SendGridParameters): Promise<SendGridResponse> {
    try {
      console.log('[SendGrid] Starting execution');
      
      // Validate parameters
      this.validateParameters(params);

      // Format request body
      const requestBody = this.formatRequestBody(params);
      console.log('[SendGrid] Request body prepared:', JSON.stringify(requestBody, null, 2));

      // Set API key
      this.client.setApiKey(params.apiKey);
      console.log('[SendGrid] API key set');

      // Send email
      console.log('[SendGrid] Sending email');
      try {
        const [response] = await this.client.send(requestBody);
        console.log('[SendGrid] Email sent successfully');

        return {
          success: true,
          statusCode: response.statusCode,
          message: 'Email sent successfully'
        };
      } catch (error: any) {
        console.error('[SendGrid] Error details:', {
          message: error.message,
          code: error.code,
          response: error.response?.body,
          errors: error.response?.body?.errors
        });
        throw error;
      }

    } catch (error) {
      console.error('[SendGrid] Error:', error);
      throw error;
    }
  }
}
