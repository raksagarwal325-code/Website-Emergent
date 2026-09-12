import React from "react";
import WebsiteHealthAdminV2, { buildWebsiteHealth, evaluateSopCompliance, groupFindings, productCompleteness, SOP_RULES } from "./WebsiteHealthAdminV2";

export { buildWebsiteHealth, evaluateSopCompliance, groupFindings, productCompleteness, SOP_RULES };

export default function WebsiteHealthAdmin() {
  return <WebsiteHealthAdminV2 />;
}
