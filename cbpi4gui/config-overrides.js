/*
 * Webpack tweaks that Create React App does not allow directly.
 *
 * Two things here.
 * (A third, below, keeps the brew-day screen's stylesheets as they are.)
 *
 * 1. Node core modules. CRA 5 / webpack 5 no longer polyfill them, and parts of
 *    this app still expect them, so they are provided explicitly.
 *
 * 2. Fully-specified ESM requests. react-router 7 ships real ES modules under
 *    dist/, and inside an ESM context webpack will not guess a file extension -
 *    a request has to name the file exactly. A bare 'process/browser' in the
 *    ProvidePlugin resolves fine from CommonJS and fails from ESM:
 *
 *      Module not found: Can't resolve 'process/browser' in
 *      '...\react-router\dist\development'
 *      Did you mean 'browser.js'?
 *
 *    require.resolve() hands webpack an absolute path, which is unambiguous
 *    from either module system, and the fullySpecified rule stops the same
 *    class of failure for every other dependency that ships ESM - which, over
 *    time, is all of them.
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

  // 3. The brew-day screen's stylesheets, as text, untouched. It must look
  //    exactly like the brew-day mockup, and the CSS pipeline does not leave a
  //    stylesheet alone: the minifier rewrites the mockup's rgb(0 0 0/.26) as
  //    #00000042, an alpha of 66/255 instead of .26,
  //    and Chrome draws gradients with the difference. screen.js puts the text
  //    in a <style> element as it is. (Its fonts, fonts/barlow.css, still go
  //    through the pipeline, which bundles the font files.) The same goes for
  //    the Settings page's (its mockup approved on 11 Nov 2026): page.js puts
  //    settings.css in its shadow root and settings-frame.css in the document.
  const oneOf = config.module.rules.find((rule) => Array.isArray(rule.oneOf));
  if (!oneOf) throw new Error("config-overrides: no oneOf rule in the webpack config");
  oneOf.oneOf.unshift({
    test: /components[\\/](brewday[\\/]brewday(-extra)?|settings[\\/]settings(-frame)?)\.css$/,
    type: "asset/source",
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
