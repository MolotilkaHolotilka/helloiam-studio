import http from 'node:http';
import https from 'node:https';

const DASHBOARD_ORIGIN = process.env.DASHBOARD_ORIGIN || 'http://127.0.0.1:3010';
const DASHBOARD_BASE = '/ideas';

export function isDashboardPath(urlPath) {
  return urlPath === DASHBOARD_BASE || urlPath.startsWith(`${DASHBOARD_BASE}/`);
}

export function proxyDashboardRequest(req, res) {
  const upstream = new URL(DASHBOARD_ORIGIN);
  const client = upstream.protocol === 'https:' ? https : http;
  const targetPath = req.url || DASHBOARD_BASE;

  const headers = {...req.headers, host: upstream.host};
  delete headers.connection;

  const proxyReq = client.request(
    {
      protocol: upstream.protocol,
      hostname: upstream.hostname,
      port: upstream.port || (upstream.protocol === 'https:' ? 443 : 80),
      method: req.method,
      path: targetPath,
      headers,
    },
    (proxyRes) => {
      res.writeHead(proxyRes.statusCode || 502, proxyRes.headers);
      proxyRes.pipe(res);
    },
  );

  proxyReq.on('error', (error) => {
    if (!res.headersSent) {
      res.writeHead(502, {'Content-Type': 'text/plain; charset=utf-8'});
    }
    res.end(`Dashboard unavailable: ${error.message}`);
  });

  req.pipe(proxyReq);
}
