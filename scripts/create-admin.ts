#!/usr/bin/env npx tsx
/**
 * Script para crear el primer usuario admin en produccion.
 *
 * Uso:
 *   npx tsx scripts/create-admin.ts
 *
 * Variables de entorno requeridas:
 *   DATABASE_URL - URL de la base de datos PostgreSQL
 *
 * El script solicita email, nombre y password por consola.
 * Si ya existe un admin, muestra un warning pero permite crear otro.
 */

import { PrismaClient } from '@prisma/client';
import * as readline from 'readline';

const prisma = new PrismaClient();

function prompt(question: string, hidden = false): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    if (hidden && process.stdin.isTTY) {
      // For password input, we use a workaround
      process.stdout.write(question);
      let input = '';

      const stdin = process.stdin;
      stdin.setRawMode(true);
      stdin.resume();
      stdin.setEncoding('utf8');

      const onData = (char: string) => {
        if (char === '\n' || char === '\r' || char === '\u0004') {
          stdin.setRawMode(false);
          stdin.removeListener('data', onData);
          rl.close();
          process.stdout.write('\n');
          resolve(input);
        } else if (char === '\u0003') {
          // Ctrl+C
          process.exit(1);
        } else if (char === '\u007F' || char === '\b') {
          // Backspace
          if (input.length > 0) {
            input = input.slice(0, -1);
            process.stdout.write('\b \b');
          }
        } else {
          input += char;
          process.stdout.write('*');
        }
      };

      stdin.on('data', onData);
    } else {
      rl.question(question, (answer) => {
        rl.close();
        resolve(answer.trim());
      });
    }
  });
}

async function main() {
  console.log('\n🔐 Crear usuario Admin para produccion\n');

  // Check existing admins
  const existingAdmins = await prisma.user.findMany({
    where: { role: 'ADMIN' },
    select: { email: true, name: true },
  });

  if (existingAdmins.length > 0) {
    console.log(`⚠️  Ya existen ${existingAdmins.length} admin(s):`);
    existingAdmins.forEach((a) => console.log(`   - ${a.email} (${a.name})`));
    console.log('');
  }

  // Collect info
  const email = await prompt('Email: ');
  if (!email || !email.includes('@')) {
    console.error('❌ Email invalido');
    process.exit(1);
  }

  // Check if email already exists
  const existingUser = await prisma.user.findFirst({
    where: { email },
  });
  if (existingUser) {
    console.error(`❌ Ya existe un usuario con email ${email}`);
    process.exit(1);
  }

  const name = await prompt('Nombre completo: ');
  if (!name) {
    console.error('❌ Nombre requerido');
    process.exit(1);
  }

  const password = await prompt('Password (min 12 caracteres): ', true);
  if (!password || password.length < 12) {
    console.error('❌ Password debe tener al menos 12 caracteres');
    process.exit(1);
  }

  const confirmPassword = await prompt('Confirmar password: ', true);
  if (password !== confirmPassword) {
    console.error('❌ Los passwords no coinciden');
    process.exit(1);
  }

  // Hash password
  const bcrypt = await import('bcryptjs');
  const hashedPassword = await bcrypt.hash(password, 12);

  // Create user
  const user = await prisma.user.create({
    data: {
      email,
      name,
      role: 'ADMIN',
      emailVerified: true,
    },
  });

  // Create account (Better Auth format)
  await prisma.account.create({
    data: {
      userId: user.id,
      accountId: user.id,
      providerId: 'credential',
      password: hashedPassword,
    },
  });

  console.log(`\n✅ Admin creado exitosamente:`);
  console.log(`   Email: ${email}`);
  console.log(`   Nombre: ${name}`);
  console.log(`   ID: ${user.id}`);
  console.log(`\nYa podes iniciar sesion en la aplicacion.\n`);
}

main()
  .catch((error) => {
    console.error('❌ Error:', error.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
