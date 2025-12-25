# Coop Sudoku - Real-time Collaborative Sudoku

A real-time multiplayer Sudoku game where you can solve puzzles cooperatively with friends. Built with React, Node.js, and Socket.io.

**Created by [LMF](https://lmf.logge.top)**

![Coop Sudoku Screenshot](https://via.placeholder.com/800x450?text=Coop+Sudoku+Preview)

## Features

- **Real-time Collaboration**: See other players' moves and cursors instantly.
- **Multiplayer Rooms**: Create private rooms or join existing ones via code or link.
- **Smart Highlighting**: Selected numbers, rows, columns, and boxes are highlighted for better visibility.
- **Notes Mode**: Toggle notes to keep track of potential candidates.
- **Scoring System**: Earn points for correct moves, lose points for mistakes.
- **Undo Support**: Ctrl+Z to undo your last moves.
- **Themes**: Dark and Light mode support.
- **Responsive Design**: Works on desktop and mobile devices.

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS 4
- **Backend**: Node.js, Express, Socket.io
- **State Management**: React Hooks + Socket.io events
- **Styling**: Tailwind CSS with custom branding colors

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/coop-sudoku.git
   cd coop-sudoku
   ```

2. Install dependencies for both client and server:
   ```bash
   # Install server dependencies
   cd server
   npm install

   # Install client dependencies
   cd ../client
   npm install
   ```

### Running the Application

You need to run both the server and client terminals.

**Terminal 1 (Server):**
```bash
cd server
npm run dev
```

**Terminal 2 (Client):**
```bash
cd client
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) to play.

## Project Structure

```
coop-sudoku/
├── client/                 # React Frontend
│   ├── src/
│   │   ├── components/     # UI Components (Board, Cell, Lobby, etc.)
│   │   ├── hooks/          # Custom hooks (useSocket)
│   │   └── context/        # React Context (Theme)
│   └── ...
├── server/                 # Node.js Backend
│   ├── src/
│   │   ├── game/           # Sudoku generation logic
│   │   └── rooms/          # Room management logic
│   └── ...
└── shared/                 # Shared TypeScript types
    └── types.ts
```

## Credits

Created by **LMF** ([lmf.logge.top](https://lmf.logge.top)).
Based on the Coop Sudoku project.

## License

MIT
