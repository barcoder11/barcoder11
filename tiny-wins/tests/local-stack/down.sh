#!/usr/bin/env bash
LOGDIR=${STACK_LOG_DIR:-/tmp/tinywins-stack}
for p in stack gotrue; do
  [ -f "$LOGDIR/$p.pid" ] && kill "$(cat "$LOGDIR/$p.pid")" 2>/dev/null && rm -f "$LOGDIR/$p.pid"
done
echo "Stack stopped."
