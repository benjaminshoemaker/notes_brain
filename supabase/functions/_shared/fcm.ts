// FCM HTTP v1 API helper
// See: https://firebase.google.com/docs/cloud-messaging/send-message

export type FCMMessage = {
  token: string;
  notification: {
    title: string;
    body: string;
  };
  data?: Record<string, string>;
  android?: {
    priority?: "high" | "normal";
  };
};

export type FCMSendRequest = {
  fetchFn: typeof fetch;
  projectId: string;
  accessToken: string;
  message: FCMMessage;
};

export type FCMSendResult = {
  success: boolean;
  messageId?: string;
  error?: string;
};

type ServiceAccountKey = {
  type: string;
  project_id: string;
  private_key_id: string;
  private_key: string;
  client_email: string;
  client_id: string;
  auth_uri: string;
  token_uri: string;
  auth_provider_x509_cert_url: string;
  client_x509_cert_url: string;
};

// Generate JWT for FCM authentication
async function createJWT(
  serviceAccount: ServiceAccountKey,
  scope: string
): Promise<string> {
  const header = {
    alg: "RS256",
    typ: "JWT"
  };

  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: serviceAccount.client_email,
    sub: serviceAccount.client_email,
    aud: serviceAccount.token_uri,
    iat: now,
    exp: now + 3600,
    scope
  };

  console.log("FCM createJWT header:", header);
  console.log("FCM createJWT payload:", payload);
  console.log(
    `FCM createJWT exp check: now=${now} exp=${payload.exp} in_future=${payload.exp > now}`
  );

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const unsignedToken = `${encodedHeader}.${encodedPayload}`;

  const signature = await signRS256(unsignedToken, serviceAccount.private_key);
  return `${unsignedToken}.${signature}`;
}

function base64UrlEncode(str: string): string {
  const base64 = btoa(str);
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function signRS256(data: string, privateKeyPem: string): Promise<string> {
  // Parse the PEM private key
  const pemContents = privateKeyPem
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\s/g, "");

  const binaryKey = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0));

  const key = await crypto.subtle.importKey(
    "pkcs8",
    binaryKey,
    {
      name: "RSASSA-PKCS1-v1_5",
      hash: "SHA-256"
    },
    false,
    ["sign"]
  );

  const encoder = new TextEncoder();
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    encoder.encode(data)
  );

  return base64UrlEncode(String.fromCharCode(...new Uint8Array(signature)));
}

export async function getAccessToken(
  fetchFn: typeof fetch,
  serviceAccountJson: string
): Promise<string> {
  console.log("FCM getAccessToken called");

  let serviceAccount: ServiceAccountKey;
  try {
    serviceAccount = JSON.parse(serviceAccountJson);
    // Fix escaped newlines in private key (common when storing as env var)
    if (serviceAccount.private_key) {
      serviceAccount.private_key = serviceAccount.private_key
        .replace(/\\\\n/g, "\n")
        .replace(/\\n/g, "\n");
    }
  } catch {
    throw new Error("Invalid service account JSON");
  }

  console.log(`FCM service account client_email: ${serviceAccount.client_email}`);

  if (serviceAccount.private_key) {
    const previewStart = serviceAccount.private_key.slice(0, 50);
    const previewEnd = serviceAccount.private_key.slice(-50);
    console.log(
      `FCM private_key preview: start="${previewStart}" end="${previewEnd}" length=${serviceAccount.private_key.length}`
    );
  } else {
    console.log("FCM private_key is missing after parsing");
  }

  const jwt = await createJWT(
    serviceAccount,
    "https://www.googleapis.com/auth/firebase.messaging"
  );

  const response = await fetchFn(serviceAccount.token_uri, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt
    })
  });

  const responseText = await response.text().catch(() => "");
  console.log("FCM token exchange response:", {
    status: response.status,
    body: responseText
  });

  if (!response.ok) {
    throw new Error(`Failed to get access token: ${response.status} ${responseText}`);
  }

  let data: { access_token?: string } = {};
  try {
    data = responseText ? JSON.parse(responseText) : {};
  } catch (error) {
    throw new Error(`Failed to parse access token response: ${String(error)}`);
  }

  if (!data.access_token) {
    throw new Error("Access token missing from response");
  }

  return data.access_token;
}

export async function sendFCMMessage({
  fetchFn,
  projectId,
  accessToken,
  message
}: FCMSendRequest): Promise<FCMSendResult> {
  const url = `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`;
  const tokenStart = message.token.slice(0, 10);
  const tokenEnd = message.token.slice(-10);
  console.log(
    `FCM sendFCMMessage called: projectId=${projectId} token="${tokenStart}...${tokenEnd}"`
  );

  const response = await fetchFn(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ message })
  });

  const responseText = await response.text().catch(() => "");
  console.log("FCM sendFCMMessage response:", {
    status: response.status,
    body: responseText
  });

  if (!response.ok) {
    return {
      success: false,
      error: `FCM request failed: ${response.status} ${responseText}`
    };
  }

  let data: { name?: string } = {};
  try {
    data = responseText ? JSON.parse(responseText) : {};
  } catch {
    data = {};
  }

  return {
    success: true,
    messageId: data.name
  };
}
