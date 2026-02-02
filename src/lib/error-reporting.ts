// Error reporting abstraction - swap implementation when Sentry is configured
export function captureException(error: Error, context?: Record<string, unknown>) {
  // TODO: Replace with Sentry.captureException(error, { extra: context })
  if (process.env.NODE_ENV === 'production') {
    // In production, errors should go to error tracking service
    console.error('[ErrorReport]', error.message, context);
  }
}

export function captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info') {
  // TODO: Replace with Sentry.captureMessage(message, level)
  if (process.env.NODE_ENV === 'production') {
    console.log(`[ErrorReport:${level}]`, message);
  }
}
