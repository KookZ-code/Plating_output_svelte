// svelte.config.js
//
// ใช้ sveltekit-adapter-iis เพื่อ deploy บน IIS Windows Server
// adapter นี้สร้าง web.config อัตโนมัติ

import 'dotenv/config'; // โหลด .env เข้า process.env (สำหรับ ORIGIN, BASE_PATH)
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import IISAdapter from 'sveltekit-adapter-iis';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess(),

  kit: {
    adapter: IISAdapter({
      // origin ที่ IIS จะ host (แก้ตอน deploy จริง)
      // หรือแก้ใน web.config หลัง build
      origin: process.env.ORIGIN || 'http://localhost:3000',
    }),

    // Sub-path support — ตั้ง BASE_PATH ตอน build เช่น "/myapp"
    // ห้ามลงท้ายด้วย "/" — ถ้า deploy ที่ root site ปล่อยว่างไว้
    paths: {
      base: process.env.BASE_PATH ?? '',
    },

    // Path alias — import จาก $lib ได้ทุกที่
    alias: {
      $lib: './src/lib',
      $types: './src/lib/types',
    },
  },
};

export default config;
