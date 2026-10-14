import { Suspense } from 'react';
import { connection } from 'next/server';
import { prisma } from '@/lib/prisma';

async function DBStatus() {
  await connection();
  await prisma.$queryRaw`SELECT 1`;
  return <p>Base de données connectée</p>;
}

export default function Home() {
  return (
    <main className="p-8">
      <h1 className="text-2xl font-semibold">Hushyboard</h1>
      <Suspense fallback={<p>Connexion à la base…</p>}>
        <DBStatus />
      </Suspense>
    </main>
  );
}
