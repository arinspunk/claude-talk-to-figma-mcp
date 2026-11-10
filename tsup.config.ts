import { defineConfig } from 'tsup';
import fs from 'fs';

export default defineConfig({
  entry: ['src/talk_to_figma_mcp/server.ts', 'src/socket.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  clean: true,
  outDir: 'dist',
  target: 'node18',
  sourcemap: true,
  minify: false,
  splitting: false,
  bundle: true,
  onSuccess: async () => {
    if (process.platform !== 'win32') {
      try {
        fs.chmodSync('dist/talk_to_figma_mcp/server.js', 0o755);
        fs.chmodSync('dist/socket.js', 0o755);
      } catch (err) {
        // ignore if files are not present
      }
    }
  },
});
