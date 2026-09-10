import Constants from 'expo-constants';

type SentryModule = typeof import('@sentry/react-native');

const dsn =
  process.env.EXPO_PUBLIC_SENTRY_DSN ||
  (Constants.expoConfig?.extra as { sentryDsn?: string } | undefined)?.sentryDsn ||
  '';

const noop = {
  init: () => {},
  wrap: <T,>(component: T) => component,
  captureException: () => {},
} as Pick<SentryModule, 'init' | 'wrap' | 'captureException'>;

function loadSentry(): Pick<SentryModule, 'init' | 'wrap' | 'captureException'> {
  try {
    // Native binary must include RNSentry (dev client / release rebuild).
    // Soft-fail so Expo Go or stale installs still boot.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('@sentry/react-native') as SentryModule;
  } catch {
    return noop;
  }
}

export const Sentry = loadSentry();

let started = false;

/** Soft-init: no-op without DSN so local/dev builds never crash. */
export function initSentry() {
  if (started || !dsn) return;
  started = true;
  try {
    Sentry.init({
      dsn,
      enabled: !__DEV__,
      tracesSampleRate: 0.12,
      sendDefaultPii: false,
      enableAutoSessionTracking: true,
      environment: __DEV__ ? 'development' : 'production',
    });
  } catch {
    // Native Sentry missing — continue without crash reporting.
  }
}

export function captureException(error: unknown, context?: Record<string, unknown>) {
  if (!dsn) return;
  try {
    Sentry.captureException(error, context ? { extra: context } : undefined);
  } catch {
    // ignore
  }
}
