export type OmadaHttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export type OmadaApiEnvelope<T> = {
  errorCode: number;
  msg?: string;
  result?: T;
};

export type OmadaCloudAccount = {
  baseUrl: string;
  username: string;
  password: string;
};

export type OmadaControllerIds = {
  deviceId: string;
  omadaId: string;
};

export type OmadaCloudConfig = OmadaCloudAccount & OmadaControllerIds;

export type OmadaCloudSession = {
  cookie: string;
  csrfToken?: string;
  authorization?: string;
};

export type OmadaSite = {
  id: string;
  name: string;
};

export type OmadaPortal = {
  id: string;
  name: string;
};

export type OmadaConnectionTest = {
  connected: true;
  siteCount: number;
  sites: OmadaSite[];
};
