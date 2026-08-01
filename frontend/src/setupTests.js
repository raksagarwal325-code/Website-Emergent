// Node <18 / older jsdom used by CRA doesn't polyfill TextEncoder — react-router v7
// pulls it in at import time, so provide it globally before anything else runs.
const { TextEncoder, TextDecoder } = require("util");
if (typeof global.TextEncoder === "undefined") global.TextEncoder = TextEncoder;
if (typeof global.TextDecoder === "undefined") global.TextDecoder = TextDecoder;

// Jest DOM matchers (toBeInTheDocument, toBeVisible, etc.). Loaded
// automatically by CRA when this file is named `src/setupTests.js`.
require("@testing-library/jest-dom");
