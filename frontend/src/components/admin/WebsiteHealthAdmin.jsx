import React from "react";
import WebsiteHealthAdminV2, { buildWebsiteHealth, groupFindings, productCompleteness } from "./WebsiteHealthAdminV2";
import WebsiteHealthOpsPanels from "./WebsiteHealthOpsPanels";
import WebsiteHealthGrowthPanels from "./WebsiteHealthGrowthPanels";

export { buildWebsiteHealth, groupFindings, productCompleteness };

export default function WebsiteHealthAdmin() {
  return (
    <>
      <WebsiteHealthAdminV2 />
      <WebsiteHealthOpsPanels />
      <WebsiteHealthGrowthPanels />
    </>
  );
}
