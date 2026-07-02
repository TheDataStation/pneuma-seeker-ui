const nextJest = require("next/jest");

const createJestConfig = nextJest({ dir: "./" });

/** @type {import('jest').Config} */
const config = {
  testEnvironment: "jsdom",
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
};

const finalConfig = createJestConfig(config);

// `marked` ships ESM-only; Jest ignores node_modules for transforms by
// default, so it needs to be opted back in to be parsed. Tests that mock
// "marked" outright are unaffected — mocks take precedence over transform.
// next/jest's default transformIgnorePatterns[0] already excepts a fixed
// list of packages (geist, next internals); appending our own array entry
// wouldn't help, since Jest ignores a file if *any* pattern matches — we
// have to replace that first pattern with one that also excepts "marked".
module.exports = async () => {
  const resolved = await finalConfig();
  return {
    ...resolved,
    transformIgnorePatterns: [
      "/node_modules/(?!.pnpm)(?!(geist|marked|next/dist/client|next/dist/shared/lib|next/src/client|next/src/shared/lib)/)",
      ...resolved.transformIgnorePatterns.slice(1),
    ],
  };
};
