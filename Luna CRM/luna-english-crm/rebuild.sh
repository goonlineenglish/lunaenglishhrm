#!/bin/bash
cd /opt/luna-crm
docker compose down
export $(grep NEXT_PUBLIC .env.production | xargs)
docker compose build --no-cache
docker compose up -d
sleep 35
docker compose ps
