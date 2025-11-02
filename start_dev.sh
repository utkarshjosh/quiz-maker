#!/bin/bash
tmux new-session -d -s game
tmux new-window -t game:1 -n frontend "npm run dev:web"
tmux new-window -t game:2 -n backend "npm run dev:api"
tmux new-window -t game:3 -n socket "npm run dev:socket"
tmux attach-session -t game
