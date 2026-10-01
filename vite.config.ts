/// <reference types="vitest/config" />
import path from 'path';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';

import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import type { AddressInfo } from 'node:net';
import { fileURLToPath } from 'node:url';
import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';
import { playwright } from '@vitest/browser-playwright';

const dirname =
  typeof __dirname !== 'undefined' ? __dirname : path.dirname(fileURLToPath(import.meta.url));

/** A 16x16 solid rgb(0, 200, 255) PNG: the raster crest the fixture serves. */
const FIXTURE_CREST_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAIAAACQkWg2AAAAFUlEQVR42mNgOPGfNDSqYVTD8NUAAOTJxxBN+mLRAAAAAElFTkSuQmCC',
  'base64'
);
const FIXTURE_CREST_ETAG = '"viz-crest-fixture"';
const LOOPBACK_ORIGIN = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/;

/**
 * Answers the way cdn.breakingthelines.app (an R2 custom domain) does. A plain
 * request gets a cacheable PNG with no CORS headers and no `Vary: Origin`. A
 * request with an allowed `Origin` also gets `Access-Control-Allow-Origin`, and
 * a conditional request gets a 304 carrying the same CORS headers.
 */
function serveFixtureCrest(req: IncomingMessage, res: ServerResponse): void {
  const origin = req.headers.origin;
  res.setHeader('Cache-Control', 'max-age=14400');
  res.setHeader('ETag', FIXTURE_CREST_ETAG);
  res.setHeader('Vary', origin ? 'Origin, Accept-Encoding' : 'Accept-Encoding');
  if (origin && LOOPBACK_ORIGIN.test(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  if (req.headers['if-none-match'] === FIXTURE_CREST_ETAG) {
    res.statusCode = 304;
    res.end();
    return;
  }
  res.setHeader('Content-Type', 'image/png');
  res.setHeader('Content-Length', FIXTURE_CREST_PNG.length);
  res.end(FIXTURE_CREST_PNG);
}

/**
 * A stand-in for the crest CDN on its own loopback port, so the page loads it
 * cross-origin. `GET /__viz-fixtures/cdn-origin` starts it on first use and
 * returns its origin. Used by src/utils/crest-capture.stories.tsx. Dev server
 * only: a static Storybook build has no fixture.
 */
function cdnFixture(): Plugin {
  let fixture: Server | undefined;
  let origin: Promise<string> | undefined;
  const start = () =>
    new Promise<string>((resolve, reject) => {
      const server = createServer(serveFixtureCrest);
      fixture = server;
      server.once('error', reject);
      server.listen(0, '127.0.0.1', () => {
        server.unref();
        resolve(`http://127.0.0.1:${(server.address() as AddressInfo).port}`);
      });
    });
  return {
    name: 'viz-cdn-fixture',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/__viz-fixtures/cdn-origin', (_req, res) => {
        origin ??= start();
        origin.then(
          (value) => {
            res.setHeader('Content-Type', 'text/plain');
            res.setHeader('Cache-Control', 'no-store');
            res.end(value);
          },
          (error: unknown) => {
            res.statusCode = 500;
            res.end(String(error));
          }
        );
      });
    },
    closeBundle() {
      fixture?.closeAllConnections();
      fixture?.close();
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), cdnFixture()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    projects: [
      {
        // Pure-logic tests (type guards, coordinate maths). Node, no browser.
        extends: true,
        test: {
          name: 'unit',
          environment: 'node',
          include: ['src/**/*.test.ts'],
        },
      },
      {
        extends: true,
        plugins: [
          storybookTest({
            configDir: path.join(dirname, '.storybook'),
          }),
        ],
        test: {
          name: 'storybook',
          browser: {
            enabled: true,
            headless: true,
            provider: playwright({}),
            instances: [
              {
                browser: 'chromium',
              },
            ],
          },
          setupFiles: ['.storybook/vitest.setup.ts'],
        },
      },
    ],
  },
});
