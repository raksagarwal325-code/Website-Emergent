import React from "react";
import WebsiteHealthAdminV2, { buildWebsiteHealth, groupFindings, productCompleteness } from "./WebsiteHealthAdminV2";

export { buildWebsiteHealth, groupFindings, productCompleteness };

export default function WebsiteHealthAdmin() {
  return <WebsiteHealthAdminV2 />;
}
