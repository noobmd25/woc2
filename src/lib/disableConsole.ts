// Central console silencer for production.
// If you need to re-enable verbose logging, set NEXT_PUBLIC_DEBUG=true.
if (typeof window !== 'undefined') {
  const debugEnabled = process.env.NEXT_PUBLIC_DEBUG === 'true';
  if (!debugEnabled) {
    const noop = () => {};
    // Silence noisy methods while keeping errors.
    console.log = noop;
    console.debug = noop;
    console.info = noop;
    console.warn = noop; // comment this out if you want warnings visible
  }
}
