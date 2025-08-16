#!/bin/bash
# Deployment script for Cubbicles API

# Go to project directory
cd /home/corpland/id.api.corplandtechnologies.com || exit

# Reset to latest GitHub main branch
git fetch origin main
git reset --hard origin/main

# (Optional) If Node.js / backend project, install dependencies & restart process
yarn install
yarn start