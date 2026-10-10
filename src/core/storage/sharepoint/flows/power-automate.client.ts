import { Injectable } from '@nestjs/common';
import { SharePointFlowException } from './errors/sharepoint-flow.exception';

/** A flow runs for at most 120 s (Power Automate limit), so waiting longer is pointless. */
const FLOW_TIMEOUT_MS = 120_000;

/** The statuses the mobile app treats as success for these flows. */
const SUCCESS_STATUSES = [200, 201, 204];

/** Sends requests to Power Automate flows and checks their answers. Knows nothing about files. */
@Injectable()
export class PowerAutomateClient {
  /**
   * Posts a JSON body to a flow and waits for its answer.
   * 200/201/204 → the response · other status → SharePointFlowException with that status · no answer within 120 s → SharePointFlowException without status
   */
  async post(flowUrl: string, body: object): Promise<Response> {
    let response: Response;
    try {
      response = await fetch(flowUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(FLOW_TIMEOUT_MS),
      });
    } catch (error) {
      throw new SharePointFlowException('The flow did not answer', undefined, {
        cause: error,
      });
    }
    if (!SUCCESS_STATUSES.includes(response.status)) {
      throw new SharePointFlowException(
        `The flow answered ${response.status}`,
        response.status,
      );
    }
    return response;
  }
}
