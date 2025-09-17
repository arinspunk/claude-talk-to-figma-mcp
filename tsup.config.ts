import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/talk_to_figma_mcp/server.ts', 'src/socket.ts'],
  format: ['cjs', 'esm'],
  dts: false,
  clean: true,
  outDir: 'dist',
  target: 'node18',
  sourcemap: true,
  minify: false,
  splitting: false,
  bundle: true,
}); 