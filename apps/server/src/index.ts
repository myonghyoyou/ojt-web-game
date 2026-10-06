import { createApp } from './app';

const port = Number(process.env.PORT ?? 4000);
const configured = (process.env.WEB_ORIGIN ?? '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);
if (configured.length === 0) console.warn('WEB_ORIGIN is not set: allowing any origin (local development only).');

const { http } = createApp({ origin: configured.length > 0 ? configured : true });
http.listen(port, () => console.log(`realtime server listening on :${port}`));
