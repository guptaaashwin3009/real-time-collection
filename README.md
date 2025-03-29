
# Real-time Collection App

A lightweight real-time web application for organizing items and folders with drag-and-drop functionality.

## Features

- Add items with icons and titles
- Create folders to group items
- Drag and drop to reorder items and folders
- Move items between folders
- Toggle folders between open and closed states
- Real-time synchronization between multiple sessions
- Persistence of state between sessions

## Running the Application

### Start the server

```bash
node server.js
```

### Start the client

```bash
npm run dev
```

The application should now be running locally. Open http://localhost:8080 in your browser to use the app.

## How It Works

- The client uses React with TypeScript for the UI
- Drag and drop functionality is implemented with @dnd-kit
- Real-time synchronization uses Socket.IO
- State is persisted both on the server and in the client's local storage
- Multiple sessions can be opened and will stay in sync

## Technologies Used

- React
- TypeScript
- Socket.IO
- DnD Kit (drag and drop)
- Express (server)
