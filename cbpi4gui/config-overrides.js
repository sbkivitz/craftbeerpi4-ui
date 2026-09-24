/*
 * Webpack tweaks that Create React App does not allow directly.
 *
 * Two things here, and the second one is why the build stopped working.
 *
 * 1. Node core modules. CRA 5 / webpack 5 no longer polyfill them, and parts of
 *    this app still expect them, so they are provided explicitly.
 *
 * 2. Fully-specified ESM requests. react-router 7 ships real ES modules under
 *    dist/, and inside an ESM context webpack will not guess a file extension -
 *    a request has to name the file exactly. The ProvidePlugin below asked for
 *    'process/browser', which resolves fine from CommonJS and fails from ESM:
 *
 *      Module not found: Can't resolve 'process/browser' in
 *      '...\react-router\dist\development'
 *      Did you mean 'browser.js'?
 *
 *    The package last built in January against an older react-router, so this
 *    surfaced only when the dependency moved. require.resolve() hands webpack an
 *    absolute path, which is unambiguous from either module system, and the
 *    fullySpecified rule stops the same class of failure for every other
 *    dependency that ships ESM - which, over time, is all of them.
 */
const webpack = require("webpack");

module.exports = function override(config) {
  const fallback = config.resolve.fallback || {};
  Object.assign(fallback, {
    crypto: require.resolve("crypto-browserify"),
    stream: require.resolve("stream-browserify"),
    assert: require.resolve("assert"),
    http: require.resolve("stream-http"),
    https: require.resolve("https-browserify"),
    os: require.resolve("os-browserify"),
    url: require.resolve("url"),
  });
  config.resolve.fallback = fallback;

  // Let extensionless requests resolve inside packages that ship ESM.
  config.module.rules.push({
    test: /\.m?js$/,
    resolve: { fullySpecified: false },
  });

  config.plugins = (config.plugins || []).concat([
    new webpack.ProvidePlugin({
      // Absolute path, not the bare specifier: unambiguous from ESM and CJS.
      process: require.resolve("process/browser"),
      Buffer: ["buffer", "Buffer"],
    }),
  ]);

  return config;
};
