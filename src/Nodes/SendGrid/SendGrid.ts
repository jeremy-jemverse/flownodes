import sgMail, { MailDataRequired } from '@sendgrid/mail';
import { SendGridParameters, SendGridResponse } from './types';

export class SendGrid {
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

  private validateParameters(params: SendGridParameters): void {
    console.log('[SendGrid] Validating parameters:', JSON.stringify(params, null, 2));
    
    // Default to "body" type if undefined or empty
    if (!params.type) {
      params.type = 'body';
    }
    
    if (!params.apiKey) {
      throw new Error('SendGrid API key is required');
    }

    if (!params.from) {
      throw new Error('From email is required');
    }

    if (!params.to) {
      throw new Error('To email is required');
    }

    if (params.type === 'template' && !params.templateId) {
      throw new Error('Template ID is required for template emails');
    }

    if (params.type === 'body' && !params.text && !params.html) {
      throw new Error('Either HTML or text body is required for body emails');
    }
  }

  private formatRequestBody(params: SendGridParameters): MailDataRequired {
    console.log('[SendGrid] Formatting request body');
    const msg: Partial<MailDataRequired> = {
      to: this.formatRecipients(params.to),
      from: this.formatEmailAddress(params.from),
      subject: params.subject?.trim(),
    };

    if (params.type === 'template') {
      console.log('[SendGrid] Processing template email');
      return {
        ...msg,
        templateId: params.templateId,
        dynamicTemplateData: params.dynamicTemplateData
      } as MailDataRequired;
    } else {
      console.log('[SendGrid] Processing body email');
      const content = [];
      
      if (params.text) {
        content.push({ type: 'text/plain', value: params.text });
      }
      if (params.html) {
        content.push({ type: 'text/html', value: params.html });
      }

      // Ensure at least one content type is present
      if (content.length === 0) {
        content.push({ type: 'text/plain', value: ' ' });
      }
      
      return {
        ...msg,
        content
      } as MailDataRequired;
    }
  }

  public static fromWorkflowData(workflowData: any): SendGridParameters {
    console.log('[SendGrid] Processing workflow data:', JSON.stringify(workflowData, null, 2));
    
    // Find the SendGrid node in the workflow
    if (!workflowData?.nodes) {
      throw new Error('Invalid workflow data: missing nodes array');
    }

    const sendGridNode = workflowData.nodes.find((node: any) => node.type === 'sendgrid');
    if (!sendGridNode) {
      throw new Error('No SendGrid node found in workflow');
    }

    // Validate node structure
    if (!sendGridNode.data?.config) {
      throw new Error('Invalid node data structure: missing data.config');
    }

    const { config } = sendGridNode.data;
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
      sgMail.setApiKey(params.apiKey);
      console.log('[SendGrid] API key set');

      // Send email
      console.log('[SendGrid] Sending email');
      try {
        const [response] = await sgMail.send(requestBody);
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
