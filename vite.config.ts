import { defineConfig } from 'vite';
import { resolve } from 'path';
import { viteStaticCopy } from 'vite-plugin-static-copy';

const plugins = [
  viteStaticCopy({
    targets: [
      {
        src: 'src/sd-wp.css', // Specify the path to your CSS file
        dest: '', // Leave blank or specify folder inside 'dist' if you want to copy into a subfolder
      },
      {
        src: 'src/sd-wp.php',
        dest: '',
      },
    ],
  }),
];

// https://vitejs.dev/config/
export default defineConfig({
  plugins,
  server: {
    open: true,
    port: 3001,
  },
  build: {
    rollupOptions: {
      input: {
        plugin: resolve(__dirname, 'index.html'),
      },
      output: {
        // Specifies the format of the output, e.g., 'es', 'cjs', or 'iife'.
        format: 'iife', // or 'iife' if you want a self-executing bundle
        // Specifies the entry point file.
        entryFileNames: 'sd-wp.js', // Your custom filename here
        // Ensures all output is bundled into a single file
        manualChunks: undefined, // Disable code-splitting to bundle everything in one file
      },
    },

    sourcemap: true,
  },
});
