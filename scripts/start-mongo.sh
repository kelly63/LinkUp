#!/usr/bin/env bash
# Start MongoDB (installed via conda) if not already running.
# Usage: ./scripts/start-mongo.sh

MONGOD=/opt/miniconda3/bin/mongod
DBPATH=/data/db
LOGPATH=/tmp/mongod.log

if ! pgrep -x mongod > /dev/null; then
  echo "Starting MongoDB..."
  mkdir -p "$DBPATH"
  "$MONGOD" --dbpath "$DBPATH" --logpath "$LOGPATH" --fork --port 27017 --bind_ip 127.0.0.1
  sleep 1
  echo "MongoDB started (log: $LOGPATH)"
else
  echo "MongoDB already running"
fi
