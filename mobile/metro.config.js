const path = require('path');
const { getSentryExpoConfig } = require('@sentry/react-native/metro');

const config = getSentryExpoConfig(__dirname, {
  // Keep RN bundles free of browser-only Sentry packages.
  includeWebReplay: false,
  includeWebFeedback: false,
});

// Metro can fail on @sentry-internal/* package "exports"; pin absolute paths.
const sentryInternals = [
  'browser-utils',
  'feedback',
  'replay',
  'replay-canvas',
];
config.resolver.extraNodeModules = {
  ...(config.resolver.extraNodeModules || {}),
  ...Object.fromEntries(
    sentryInternals.map((name) => [
      `@sentry-internal/${name}`,
      path.resolve(__dirname, `node_modules/@sentry-internal/${name}`),
    ])
  ),
};

module.exports = config;
