import 'dotenv/config';

type ProbeResult = {
  name: string;
  status: number | 'error';
  server: string;
  cfRay: string;
  contentType: string;
  note: string;
};

async function probe(name: string, url: string, init?: RequestInit): Promise<ProbeResult> {
  try {
    const res = await fetch(url, { ...init, signal: AbortSignal.timeout(12_000) });
    const text = await res.text();
    const lower = text.toLowerCase();
    let note = '';

    if (text.includes('<!DOCTYPE') && lower.includes('blocked')) note = 'cloudflare_block';
    else if (res.status === 402) note = 'exa_no_credits';
    else if (res.status === 429) note = 'rate_limit';
    else if (res.status === 401) note = 'invalid_api_key';
    else if (res.status === 200 && text.trim().startsWith('{')) note = 'ok_json';
    else if (res.status >= 200 && res.status < 400) note = 'ok';

    return {
      name,
      status: res.status,
      server: res.headers.get('server') ?? '-',
      cfRay: res.headers.get('cf-ray') ?? '-',
      contentType: res.headers.get('content-type') ?? '-',
      note,
    };
  } catch (error) {
    return {
      name,
      status: 'error',
      server: '-',
      cfRay: '-',
      contentType: '-',
      note: error instanceof Error ? error.message : String(error),
    };
  }
}

async function main() {
  const ipRes = await fetch('https://api.ipify.org?format=json', { signal: AbortSignal.timeout(8000) });
  const { ip } = await ipRes.json() as { ip: string };

  console.log('=== Exa / сеть — диагностика ===\n');
  console.log('Публичный IP:', ip);
  console.log('EXA_API_KEY:', process.env.EXA_API_KEY ? 'задан' : 'НЕ ЗАДАН');
  console.log('');

  const probes = await Promise.all([
    probe('Сайт exa.ai', 'https://exa.ai/', { redirect: 'follow' }),
    probe('API api.exa.ai (корень)', 'https://api.exa.ai/'),
    probe('API /search', 'https://api.exa.ai/search', {
      method: 'POST',
      headers: {
        'x-api-key': process.env.EXA_API_KEY ?? '',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: 'Armenia news test', numResults: 1 }),
    }),
    probe('Dashboard dashboard.exa.ai', 'https://dashboard.exa.ai/', { redirect: 'follow' }),
    probe('Cloudflare (контроль)', 'https://one.one.one.one/', { redirect: 'follow' }),
  ]);

  for (const row of probes) {
    console.log(`[${row.name}]`);
    console.log(`  status: ${row.status}`);
    console.log(`  server: ${row.server}`);
    console.log(`  cf-ray: ${row.cfRay}`);
    console.log(`  type:   ${row.contentType}`);
    console.log(`  note:   ${row.note}`);
    console.log('');
  }

  const api = probes.find((p) => p.name.includes('/search'));
  console.log('=== Вывод ===');

  if (api?.note === 'cloudflare_block') {
    console.log('Блокировка Cloudflare на api.exa.ai — это НЕ квота Exa.');
    console.log('Квота выглядела бы как JSON со статусом 402, rate limit — 429.');
    console.log('');
    console.log('Что проверить с zapret:');
    console.log('1. Остановите zapret (служба zapret / процесс winws).');
    console.log('2. Снова: npm run diagnose:exa');
    console.log('3. Если с zapret OFF всё равно 403 — причина в IP/провайдере, не в zapret.');
    console.log('4. Если только с zapret ON — zapret ломает TLS/маршрут до api.exa.ai.');
    console.log('');
    console.log('Обход: VPN, мобильный интернет, VPS для сбора, письмо в hello@exa.ai с IP и cf-ray.');
  } else if (api?.note === 'exa_no_credits') {
    console.log('Закончилась квота Exa (402). Пополните на dashboard.exa.ai');
  } else if (api?.note === 'ok_json') {
    console.log('API Exa отвечает нормально.');
  } else {
    console.log('Смотрите статусы выше — нестандартный ответ.');
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
