#!/bin/bash
node db/migrate.js > /tmp/migration-output.txt 2>&1
echo "Exit: $?" >> /tmp/migration-output.txt
