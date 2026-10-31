#!/bin/sh
set -e

echo "Aplicando migrations..."
npx prisma migrate deploy

# Semeia apenas quando o banco está vazio (preserva dados entre reinícios).
COUNT=$(node -e "const {PrismaClient}=require('@prisma/client');const p=new PrismaClient();p.project.count().then(c=>{console.log(c);return p.\$disconnect()}).catch(()=>console.log(0))")
if [ "$COUNT" = "0" ]; then
  echo "Banco vazio — executando seed..."
  node prisma/seed.ts
else
  echo "Banco já populado ($COUNT obras) — seed ignorado."
fi

echo "Iniciando API..."
exec node dist/main.js
