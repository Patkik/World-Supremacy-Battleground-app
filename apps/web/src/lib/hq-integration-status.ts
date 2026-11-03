export type IntegrationStatus = {
  checked_at: number;
  release_ready: boolean;
  database: { project_id: string; storage_mode: string; reachable: boolean };
  paymongo: {
    checkout_configured: boolean;
    webhook_secret_configured: boolean;
    webhook_mode: "live" | "test" | "missing_or_invalid";
    webhook_ready: boolean;
    provider_connectivity_checked: boolean;
  };
  private_media: {
    storage_bucket_configured: boolean;
    storage_gateway_configured: boolean;
    malware_scanner_configured: boolean;
    external_connectivity_checked: boolean;
  };
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function isBooleanRecord(value: unknown, fields: string[]) {
  return isRecord(value) && fields.every(field => typeof value[field] === "boolean");
}

export function isIntegrationStatus(value: unknown): value is IntegrationStatus {
  if (!isRecord(value) || !isRecord(value.database)) return false;
  const database = value.database;
  return Number.isSafeInteger(value.checked_at) && Number(value.checked_at) > 0
    && typeof value.release_ready === "boolean"
    && typeof database.project_id === "string" && database.project_id.length > 0 && database.project_id.length <= 200
    && (database.storage_mode === "firestore" || database.storage_mode === "memory")
    && typeof database.reachable === "boolean"
    && isBooleanRecord(value.paymongo, ["checkout_configured", "webhook_secret_configured", "webhook_ready", "provider_connectivity_checked"])
    && isRecord(value.paymongo)
    && ["live", "test", "missing_or_invalid"].includes(String(value.paymongo.webhook_mode))
    && isBooleanRecord(value.private_media, ["storage_bucket_configured", "storage_gateway_configured", "malware_scanner_configured", "external_connectivity_checked"]);
}
