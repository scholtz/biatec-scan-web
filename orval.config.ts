import type { ConfigExternal } from "orval";

// Orval configuration for generating a typed Axios client from the Biatec Scan OpenAPI spec
const config: ConfigExternal = {
  api: {
    input: "https://algorand-trades.de-4.biatec.io/swagger/v1/swagger.json",
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
