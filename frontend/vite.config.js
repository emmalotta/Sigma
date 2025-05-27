import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: 'index.html',
        admin: 'admin.html',
        machine_operator: 'machine_operator.html',
        hall_worker: 'hall_worker.html',
        shift_leader: 'shift_leader.html',
      }
    }
  }
});