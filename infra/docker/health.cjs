const mode = process.argv[2];
async function check() {
  const response = await fetch(mode === 'firebase' ? `http://127.0.0.1:${process.env.WSB_EMULATOR_HUB_PORT || 4418}/emulators` : 'http://127.0.0.1:3000/sign-in', { signal: AbortSignal.timeout(8000) });
  if (!response.ok) throw new Error('Service is starting');
  if (mode === 'firebase') {
    const services = await response.json();
    for (const name of ['auth', 'firestore', 'storage']) if (!services[name]) throw new Error(`${name} is starting`);
    for (const name of ['auth', 'firestore', 'storage']) await fetch(`http://127.0.0.1:${services[name].port}/`, { signal: AbortSignal.timeout(2000) });
  }
}
check().catch(() => { process.exitCode = 1; });
