export class OmadaError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly retryable = false,
    public readonly omadaErrorCode?: number,
  ) {
    super(sanitizeOmadaMessage(message));
    this.name = "OmadaError";
  }
}

export class OmadaNotConfiguredError extends OmadaError {
  constructor(message = "Omada Cloud Access is not configured.") {
    super(message, "OMADA_NOT_CONFIGURED", false);
    this.name = "OmadaNotConfiguredError";
  }
}

/** Cloud Access reports this when the controller session has ended. */
export const OMADA_SESSION_EXPIRED_CODE = -1200;

export function isOmadaSessionExpired(error: OmadaError): boolean {
  return error.omadaErrorCode === OMADA_SESSION_EXPIRED_CODE || error.code === "OMADA_SESSION_EXPIRED";
}

export function sanitizeOmadaMessage(message: string): string {
  return message
    .replace(/([?&]token=)[^&#\s]+/gi, "$1[redacted]")
    .replace(/(session_code=)[^&#\s]+/gi, "$1[redacted]")
    .replace(/(AccessToken=)[^\s&]+/gi, "$1[redacted]")
    .replace(/(TPOMADA_SESSIONID=)[^;\s]+/gi, "$1[redacted]")
    .replace(/(Csrf-Token:\s*)\S+/gi, "$1[redacted]")
    .replace(/(Authorization:\s*)\S+/gi, "$1[redacted]")
    .replace(/(access_token=)[^&#\s]+/gi, "$1[redacted]");
}

export const OMADA_FUNCTION_UNAVAILABLE_MESSAGE =
  "This function is currently not available. Please try again later.";

export function describeTpLinkIdLoginError(
  _errorCode?: number,
  _msg?: string,
  _result?: unknown,
): string {
  return OMADA_FUNCTION_UNAVAILABLE_MESSAGE;
}
