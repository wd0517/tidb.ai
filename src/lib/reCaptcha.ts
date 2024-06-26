// import { RecaptchaEnterpriseServiceClient } from '@google-cloud/recaptcha-enterprise';
import {getOptionsByGroup} from "@/core/repositories/option";
import { NextRequest, NextResponse } from 'next/server';
import {
  RECAPTCHA_INVALID_MODE_ERROR,
  RECAPTCHA_INVALID_TOKEN_ERROR,
  RECAPTCHA_REQUIRE_TOKEN_ERROR,
  RECAPTCHA_RETRIEVE_CONFIG_ERROR
} from "@/lib/errors/api_errors";

/**
 * Create an assessment to analyze the risk of a UI action.
 *
 * projectID: Your Google Cloud Project ID.
 * recaptchaSiteKey: The reCAPTCHA key associated with the site/app
 * token: The generated token obtained from the client.
 * recaptchaAction: Action name corresponding to the token.
 */
// export async function createAssessment({
//   // TODO: Replace the token and reCAPTCHA action variables before running the sample.
//   projectID = 'project-id',
//   recaptchaKey = 'site-key',
//   token = 'action-token',
//   recaptchaAction = 'action-name',
// }) {
//   // Create the reCAPTCHA client.
//   // TODO: Cache the client generation code (recommended) or call client.close() before exiting the method.
//   const client = new RecaptchaEnterpriseServiceClient();
//   const projectPath = client.projectPath(projectID);

//   // Build the assessment request.
//   const request = {
//     assessment: {
//       event: {
//         token: token,
//         siteKey: recaptchaKey,
//       },
//     },
//     parent: projectPath,
//   };

//   const [response] = await client.createAssessment(request);

//   // Check if the token is valid.
//   if (!response?.tokenProperties?.valid) {
//     console.log(
//       `The CreateAssessment call failed because the token was: ${response?.tokenProperties?.invalidReason}`
//     );
//     return null;
//   }

//   // Check if the expected action was executed.
//   // The `action` property is set by user client in the grecaptcha.enterprise.execute() method.
//   if (response.tokenProperties.action === recaptchaAction) {
//     // Get the risk score and the reason(s).
//     // For more information on interpreting the assessment, see:
//     // https://cloud.google.com/recaptcha-enterprise/docs/interpret-assessment
//     console.log(`The reCAPTCHA score is: ${response?.riskAnalysis?.score}`);
//     response?.riskAnalysis?.reasons?.forEach((reason) => {
//       console.log(reason);
//     });

//     return response?.riskAnalysis?.score;
//   } else {
//     console.log(
//       'The action attribute in your reCAPTCHA tag does not match the action you are expecting to score'
//     );
//     return null;
//   }
// }

export const RECAPTCHA_V3_VERIFY_HOST = 'https://www.google.com';
export const RECAPTCHA_V3_VERIFY_API = `${RECAPTCHA_V3_VERIFY_HOST}/recaptcha/api/siteverify`;
export const RECAPTCHA_ENTERPRISE_VERIFY_HOST =
  'https://recaptchaenterprise.googleapis.com';
export const RECAPTCHA_ENTERPRISE_VERIFY_API = `${RECAPTCHA_ENTERPRISE_VERIFY_HOST}/v1/projects/{PROJECT_ID}/assessments?key={API_KEY}`;

/**
 * Verify the reCAPTCHA V3 token.
 * @param secret: The shared key between your site and reCAPTCHA.
 * @param token: The token generated by the reCAPTCHA client-side integration on your site.
 * @param remoteip: The user's IP address.
 * @returns The score of the reCAPTCHA V3 token.
 *
 * The score is a value between 0.0 (likely a bot) and 1.0 (likely a human).
 */
export async function createV3Assessment({
  secret = 'site-key',
  token = 'action-token',
}) {
  const url = RECAPTCHA_V3_VERIFY_API;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `secret=${secret}&response=${token}`,
  });
  const data: {
    success: boolean;
    challenge_ts: string; // timestamp of the challenge load (ISO format yyyy-MM-dd'T'HH:mm:ssZZ)
    hostname: string; // the hostname of the site where the reCAPTCHA was solved
    score: number; // the score for this request (0.0 - 1.0)
    action: string; // the action name for this request
    'error-codes'?: any; // optional
  } = await response.json();
  if (data) {
    return data.success;
  } else {
    return null;
  }
}

export async function createEnterpriseAssessment({
  // TODO: Replace the token and reCAPTCHA action variables before running the sample.
  projectID = 'project-id',
  recaptchaKey = 'site-key',
  gcloudAPIKey = 'api-key',
  token = 'action-token',
  recaptchaAction = 'action-name',
}) {
  const url = RECAPTCHA_ENTERPRISE_VERIFY_API.replace(
    '{PROJECT_ID}',
    projectID
  ).replace('{API_KEY}', gcloudAPIKey);
  const res = await fetch(url, {
    method: 'POST',
    body: JSON.stringify({
      event: {
        token,
        expectedAction: recaptchaAction,
        siteKey: recaptchaKey,
      },
    }),
  });
  const response = await res.json();

  // Check if the token is valid.
  if (!response?.tokenProperties?.valid) {
    console.log(
      `The CreateAssessment call failed because the token was: ${response?.tokenProperties?.invalidReason}`
    );
    return null;
  }

  // Check if the expected action was executed.
  // The `action` property is set by user client in the grecaptcha.enterprise.execute() method.
  if (response.tokenProperties.action === recaptchaAction) {
    // Get the risk score and the reason(s).
    // For more information on interpreting the assessment, see:
    // https://cloud.google.com/recaptcha-enterprise/docs/interpret-assessment
    console.log(`The reCAPTCHA score is: ${response?.riskAnalysis?.score}`);
    response?.riskAnalysis?.reasons?.forEach((reason: any) => {
      console.log(reason);
    });

    return response?.riskAnalysis?.score;
  } else {
    console.log(
      'The action attribute in your reCAPTCHA tag does not match the action you are expecting to score'
    );
    return null;
  }
}

export async function validateNextRequestWithReCaptcha(req: NextRequest) {
  const reCaptchaCfg = await getOptionsByGroup('security');
  const reCaptchaSiteKey = reCaptchaCfg
    ?.find((item) => item.option_name === 'google_recaptcha_site_key')
    ?.option_value?.toString();

  // Skip if reCaptcha is not configured
  if (!reCaptchaSiteKey) {
    return null;
  }

  const reCaptchaToken = req.headers.get('X-ReCaptcha-Token');
  const reCaptchaAction = req.headers.get('X-ReCaptcha-Action');

  if (!reCaptchaToken || !reCaptchaAction) {
    return RECAPTCHA_REQUIRE_TOKEN_ERROR.toResponse();
  }

  const reCaptchaMode = reCaptchaCfg
    ?.find((item) => item.option_name === 'google_recaptcha')
    ?.option_value?.toString();
  const reCaptchaSecretKey = reCaptchaCfg
    ?.find((item) => item.option_name === 'google_recaptcha_secret_key')
    ?.option_value?.toString();
  const reCaptchaEnterpriseProjectId = reCaptchaCfg
    ?.find(
      (item) => item.option_name === 'google_recaptcha_enterprise_project_id'
    )
    ?.option_value?.toString();
  if (
    !reCaptchaSiteKey ||
    !reCaptchaMode ||
    !reCaptchaSecretKey ||
    !reCaptchaEnterpriseProjectId
  ) {
    return RECAPTCHA_RETRIEVE_CONFIG_ERROR.toResponse();
  }

  if (reCaptchaMode === 'v3') {
    const result = await createV3Assessment({
      secret: reCaptchaSecretKey,
      token: reCaptchaToken,
    });
    if (result) {
      return null;
    } else {
      return RECAPTCHA_INVALID_TOKEN_ERROR.toResponse();
    }
  } else if (reCaptchaMode === 'enterprise') {
    const result = await createEnterpriseAssessment({
      recaptchaKey: reCaptchaSiteKey,
      gcloudAPIKey: reCaptchaSecretKey,
      token: reCaptchaToken,
      recaptchaAction: reCaptchaAction,
      projectID: reCaptchaEnterpriseProjectId,
    });
    if (result) {
      return null;
    } else {
      return RECAPTCHA_INVALID_TOKEN_ERROR.toResponse();
    }
  } else {
    return RECAPTCHA_INVALID_MODE_ERROR.toResponse();
  }
}
