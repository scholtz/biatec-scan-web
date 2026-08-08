import type { ConfigExternal } from "orval";

// Orval configuration for generating a typed Axios client from the Biatec Scan OpenAPI spec.
// Defaults to the production API spec; set ORVAL_INPUT to generate from another environment,
// e.g. stage (testnet) right after a backend API change was deployed there but not yet
// promoted to production:
//   ORVAL_INPUT=https://api.testnet.scan.biatec.io/swagger/v1/swagger.json npm run generate:api
const config: ConfigExternal = {
  api: {
    input: process.env.ORVAL_INPUT ?? "https://algorand-trades.de-4.biatec.io/swagger/v1/swagger.json",
    output: {
      target: "src/api/index.ts",
      schemas: "src/api/models",
      client: "axios",
      // No `baseUrl` here on purpose: it makes orval bake an absolute
      // https://algorand-trades.de-4.biatec.io/... URL into every generated
      // call, which silently overrides axios-instance.ts's env-driven
      // baseURL. Emitting relative paths lets the mutator's baseURL (backed
      // by VITE_API_BASE_URL) decide which network's API is actually called.
      override: {
        mutator: {
          path: "src/api/axios-instance.ts",
          name: "axiosInstance",
        },
      },
    },
  },
};

export default config;
