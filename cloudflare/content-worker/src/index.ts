interface R2ObjectBody {
  body: ReadableStream;
  httpMetadata?: {
    contentType?: string;
    contentEncoding?: string;
  };
  size: number;
  uploaded: Date;
  writeHttpMetadata(headers: Headers): void;
}

interface R2Bucket {
  get(key: string): Promise<R2ObjectBody | null>;
}

interface Env {
  LEGAL_PACKAGES: R2Bucket;
  CACHE_CONTROL?: string;
}

const DEFAULT_CACHE_CONTROL = 'public, max-age=300, stale-while-revalidate=86400';
const IMMUTABLE_CACHE_CONTROL = 'public, max-age=31536000, immutable';

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return json({ error: 'method_not_allowed' }, 405);
    }

    if (url.pathname === '/health') {
      return json({ ok: true, service: 'lawquest-content-api' });
    }

    if (url.pathname === '/' || url.pathname === '/manifest' || url.pathname === '/manifest.json') {
      return serveR2Object(env, 'manifest.json', {
        cacheControl: env.CACHE_CONTROL ?? DEFAULT_CACHE_CONTROL,
        contentType: 'application/json; charset=utf-8',
        headOnly: request.method === 'HEAD',
      });
    }

    if (url.pathname === '/manifest.json.gz') {
      return serveR2Object(env, 'manifest.json.gz', {
        cacheControl: env.CACHE_CONTROL ?? DEFAULT_CACHE_CONTROL,
        contentEncoding: 'gzip',
        contentType: 'application/json; charset=utf-8',
        headOnly: request.method === 'HEAD',
      });
    }

    const packageMatch = url.pathname.match(
      /^\/packages\/(?<codeId>[^/]+)\/(?<language>[^/]+)\/(?<versionId>[^/]+\.json(?:\.gz)?)$/
    );

    if (packageMatch?.groups) {
      const { codeId, language, versionId } = packageMatch.groups;
      const key = `objects/${codeId}/${language}/${versionId}`;
      const contentType = versionId.endsWith('.gz')
        ? 'application/gzip'
        : 'application/json; charset=utf-8';

      return serveR2Object(env, key, {
        cacheControl: IMMUTABLE_CACHE_CONTROL,
        contentEncoding: undefined,
        contentType,
        headOnly: request.method === 'HEAD',
      });
    }

    const objectMatch = url.pathname.match(/^\/objects\/(?<key>.+)$/);

    if (objectMatch?.groups?.key) {
      const key = objectMatch.groups.key;
      const contentType = key.endsWith('.gz')
        ? 'application/gzip'
        : 'application/json; charset=utf-8';

      return serveR2Object(env, `objects/${key}`, {
        cacheControl: IMMUTABLE_CACHE_CONTROL,
        contentEncoding: undefined,
        contentType,
        headOnly: request.method === 'HEAD',
      });
    }

    return json({ error: 'not_found' }, 404);
  },
};

async function serveR2Object(
  env: Env,
  key: string,
  options: {
    cacheControl: string;
    contentType: string;
    contentEncoding?: string;
    headOnly: boolean;
  }
) {
  const object = await env.LEGAL_PACKAGES.get(key);

  if (!object) {
    return json({ error: 'object_not_found', key }, 404);
  }

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set('Cache-Control', options.cacheControl);
  headers.set('Content-Type', options.contentType);
  headers.set('Content-Length', String(object.size));
  headers.set('Last-Modified', object.uploaded.toUTCString());

  if (options.contentEncoding) {
    headers.set('Content-Encoding', options.contentEncoding);
  }

  return new Response(options.headOnly ? null : object.body, { headers });
}

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}
