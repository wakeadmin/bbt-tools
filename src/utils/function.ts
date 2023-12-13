export function safeRun(fn: () => void): void {
  try {
    fn();
  } catch (e) {
    // noop
  }
}
