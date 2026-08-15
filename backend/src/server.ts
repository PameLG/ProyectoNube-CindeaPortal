import { createApp } from './app';
import { env } from './config/env';
import { pool } from './database/connection';

async function checkPostgres(): Promise<boolean> {
  try {
    await pool.query('SELECT 1');
    return true;
  } catch {
    return false;
  }
}

async function start() {
  const dbReady = await checkPostgres();
  const googleReady = !!(env.google.clientId && env.google.clientSecret);
  const microsoftReady = !!(
    env.microsoft.clientId &&
    env.microsoft.clientSecret &&
    env.microsoft.tenant
  );

  const app = createApp();

  app.listen(env.port, () => {
    const OK = '[OK]';
    const BAD = '[FAIL]';
    const WARN = '[--]';

    console.log('');
    console.log('==========================================');
    console.log('       Proyectonube_Docente');
    console.log('==========================================');
    console.log('');
    console.log(`${OK} Backend iniciado`);
    console.log(`   API:        http://localhost:${env.port}`);
    console.log(`   Health:     http://localhost:${env.port}/health`);
    console.log('');
    console.log('Base de datos');
    console.log(
      `   PostgreSQL: ${dbReady ? OK + ' Conectado' : BAD + ' No se pudo conectar'} (${env.db.host}:${env.db.port})`
    );
    console.log('   Adminer:    http://localhost:8080');
    console.log('');
    console.log('Autenticacion');
    console.log(`   JWT: ${OK}`);
    console.log('');
    console.log('Integraciones');
    console.log(`   Google:    ${googleReady ? OK + ' Configurado' : WARN + ' Pendiente'}`);
    console.log(`   Microsoft: ${microsoftReady ? OK + ' Configurado' : WARN + ' Pendiente'}`);
    console.log('');
    console.log('==========================================');
    console.log('Servidor listo para recibir peticiones');
    console.log('==========================================');
    console.log('');
  });
}

start().catch((err) => {
  console.error('Error fatal al arrancar el servidor:', err);
  process.exit(1);
});
