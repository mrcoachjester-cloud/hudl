import path from 'path';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';
import runtimeErrorOverlay from '@replit/vite-plugin-runtime-error-modal';

const fixGameDataHydration = () => ({
  name: 'fix-game-data-hydration',
  transform(code: string, id: string) {
    if (!id.endsWith('/src/App.tsx')) return null;

    const oldFetch = `        let livePlays: Play[] = [];
        let scoutingPlays: Play[] = [];

        try {
          if (activeGameId) {
            const remoteLive = await getLivePlays(activeGameId);
            if (remoteLive.length > 0) {
              livePlays = remoteLive.map(livePlayToStandard);
            }
          }
        } catch (e) {
          console.warn('Could not fetch remote live plays:', e);
        }
`;

    const newFetch = `        let livePlays: Play[] = [];
        let scoutingPlays: Play[] = [];
        const remoteGameData: Record<string, { scouting: Play[]; live: Play[] }> = {};

        try {
          const results = await Promise.all(games.map(async game => {
            try {
              const remoteLive = await getLivePlays(game.id);
              return [game.id, { scouting: [], live: remoteLive.map(livePlayToStandard) }] as const;
            } catch (e) {
              console.warn(\`Could not fetch live plays for game \${game.id}:\`, e);
              return [game.id, { scouting: [], live: [] }] as const;
            }
          }));
          results.forEach(([gameId, value]) => { remoteGameData[gameId] = value; });
          if (activeGameId && remoteGameData[activeGameId]) {
            livePlays = remoteGameData[activeGameId].live;
            scoutingPlays = remoteGameData[activeGameId].scouting;
          }
        } catch (e) {
          console.warn('Could not fetch remote live plays:', e);
        }
`;

    const oldMerge = `          const gameData = {
            ...(current.gameData || {}),
            [activeGameId]: {
              scouting: current.gameData?.[activeGameId]?.scouting ?? (scoutingPlays.length ? scoutingPlays : current.scouting),
              live: livePlays.length ? livePlays : current.live,
            },
          };
`;

    const newMerge = `          const gameData = {
            ...(current.gameData || {}),
            ...remoteGameData,
            [activeGameId]: {
              scouting: remoteGameData[activeGameId]?.scouting?.length
                ? remoteGameData[activeGameId].scouting
                : (current.gameData?.[activeGameId]?.scouting ?? (scoutingPlays.length ? scoutingPlays : current.scouting)),
              live: remoteGameData[activeGameId]?.live ?? (livePlays.length ? livePlays : current.live),
            },
          };
`;

    if (!code.includes(oldFetch) || !code.includes(oldMerge)) {
      throw new Error('Coach Hudl hydration blocks were not found; refusing to build an unpatched app.');
    }

    return {
      code: code.replace(oldFetch, newFetch).replace(oldMerge, newMerge),
      map: null,
    };
  },
});

export default defineConfig(async ({ command }) => {
  const isServe = command === 'serve';

  let port: number | undefined;
  if (isServe) {
    const rawPort = process.env.PORT;
    if (!rawPort) {
      throw new Error(
        'PORT environment variable is required but was not provided.',
      );
    }
    port = Number(rawPort);
    if (Number.isNaN(port) || port <= 0) {
      throw new Error(`Invalid PORT value: "${rawPort}"`);
    }
  }

  const basePath = process.env.BASE_PATH || '/';

  return {
    base: basePath,
    plugins: [
      react(),
      tailwindcss(),
      runtimeErrorOverlay(),
      fixGameDataHydration(),
      ...(process.env.NODE_ENV !== 'production' &&
      process.env.REPL_ID !== undefined
        ? [
            await import('@replit/vite-plugin-cartographer').then((m) =>
              m.cartographer({
                root: path.resolve(import.meta.dirname, '..'),
              }),
            ),
            await import('@replit/vite-plugin-dev-banner').then((m) =>
              m.devBanner(),
            ),
          ]
        : []),
    ],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, 'src'),
        '@assets': path.resolve(
          import.meta.dirname,
          '..',
          '..',
          'attached_assets',
        ),
      },
      dedupe: ['react', 'react-dom'],
    },
    root: path.resolve(import.meta.dirname),
    build: {
      outDir: path.resolve(import.meta.dirname, 'dist/public'),
      emptyOutDir: true,
      sourcemap: true,
    },
    server: isServe
      ? {
          port,
          strictPort: true,
          host: '0.0.0.0',
          allowedHosts: true,
          fs: {
            strict: true,
          },
        }
      : undefined,
    preview: {
      port: port ?? 4173,
      host: '0.0.0.0',
      allowedHosts: true,
    },
  };
});
