import React, { useEffect, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { 
  DndContext, 
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  DragOverlay
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy
} from '@dnd-kit/sortable';
import { AppState, Folder, Item } from '../types';
import CollectionItem from '../components/CollectionItem';
import CollectionFolder from '../components/CollectionFolder';
import AddItemForm from '../components/AddItemForm';
import { socketService } from '../utils/socketService';
import { toast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { ArrowUp, ArrowDown, Book, FolderIcon } from "lucide-react";

const Index = () => {
  const [items, setItems] = useState<Item[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [itemOrder, setItemOrder] = useState<string[]>([]);
  const [folderOrder, setFolderOrder] = useState<string[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeDraggedItem, setActiveDraggedItem] = useState<Item | null>(null);
  const [activeDraggedFolder, setActiveDraggedFolder] = useState<Folder | null>(null);
  const [initialized, setInitialized] = useState(false);
  const [socketConnected, setSocketConnected] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5, // Minimum distance before a drag starts
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Connect to socket and initialize state
  useEffect(() => {
    console.log("Initializing socket connection...");
    socketService.connect();
    
    const handleStateUpdate = (state: AppState) => {
      console.log("Received state update from server:", state);
      setItems(state.items);
      setFolders(state.folders);
      setItemOrder(state.itemOrder);
      setFolderOrder(state.folderOrder);
      setInitialized(true);
    };
    
    const handleConnect = () => {
      console.log("Socket connected");
      setSocketConnected(true);
      setIsReconnecting(false);
      toast({
        title: "Connected to server",
        description: "Real-time sync is now active",
      });
    };
    
    const handleDisconnect = () => {
      console.log("Socket disconnected");
      setSocketConnected(false);
      toast({
        title: "Disconnected from server",
        description: "Real-time sync is not available",
        variant: "destructive",
      });
    };
    
    const handleConnectionError = (error: unknown) => {
      console.error("Connection error:", error);
      setSocketConnected(false);
      toast({
        title: "Connection error",
        description: "Could not connect to the server. Using local mode.",
        variant: "destructive",
      });
    };
    
    socketService.on('state-update', handleStateUpdate);
    socketService.on('connect', handleConnect);
    socketService.on('disconnect', handleDisconnect);
    socketService.on('connection_error', handleConnectionError);
    
    // Try to load from local storage regardless of socket connection
    const savedState = localStorage.getItem('collectionAppState');
    if (savedState) {
      console.log("Loading state from local storage");
      try {
        const parsedState = JSON.parse(savedState) as AppState;
        setItems(parsedState.items);
        setFolders(parsedState.folders);
        setItemOrder(parsedState.itemOrder);
        setFolderOrder(parsedState.folderOrder);
        setInitialized(true);
      } catch (error) {
        console.error("Error parsing saved state:", error);
      }
    }
    
    return () => {
      socketService.off('state-update', handleStateUpdate);
      socketService.off('connect', handleConnect);
      socketService.off('disconnect', handleDisconnect);
      socketService.off('connection_error', handleConnectionError);
    };
  }, []);

  // Save state to local storage when it changes
  useEffect(() => {
    if (!initialized) return;
    
    // Custom deep comparison function to check if state actually changed
    const hasStateChanged = (prevState: string | null, newState: AppState): boolean => {
      if (!prevState) return true;
      
      try {
        const prev = JSON.parse(prevState) as AppState;
        
        // Check if items changed (length or content)
        if (prev.items.length !== newState.items.length) return true;
        if (JSON.stringify(prev.items) !== JSON.stringify(newState.items)) return true;
        
        // Check if folders changed (length or content)
        if (prev.folders.length !== newState.folders.length) return true;
        if (JSON.stringify(prev.folders) !== JSON.stringify(newState.folders)) return true;
        
        // Check if orders changed
        if (JSON.stringify(prev.itemOrder) !== JSON.stringify(newState.itemOrder)) return true;
        if (JSON.stringify(prev.folderOrder) !== JSON.stringify(newState.folderOrder)) return true;
        
        return false;
      } catch (error) {
        console.error("Error comparing states:", error);
        return true; // On error, assume state changed
      }
    };
    
    const state: AppState = {
      items,
      folders,
      itemOrder,
      folderOrder
    };
    
    const currentLocalState = localStorage.getItem('collectionAppState');
    const stateChanged = hasStateChanged(currentLocalState, state);
    
    if (stateChanged) {
      console.log("State changed, updating local storage and server");
      localStorage.setItem('collectionAppState', JSON.stringify(state));
      
      if (socketConnected) {
        socketService.updateState(state);
      } else {
        console.log("Socket not connected, only saving locally");
      }
    }
  }, [items, folders, itemOrder, folderOrder, initialized, socketConnected]);

  const handleAddItem = (title: string, icon: string) => {
    const newItem: Item = {
      id: uuidv4(),
      title,
      icon,
      folderId: null
    };
    
    setItems([...items, newItem]);
    setItemOrder([...itemOrder, newItem.id]);
  };

  const handleAddFolder = (name: string) => {
    const newFolder: Folder = {
      id: uuidv4(),
      name,
      isOpen: true
    };
    
    setFolders([...folders, newFolder]);
    setFolderOrder([...folderOrder, newFolder.id]);
  };

  const handleToggleFolder = (folderId: string) => {
    setFolders(
      folders.map(folder => 
        folder.id === folderId 
          ? { ...folder, isOpen: !folder.isOpen } 
          : folder
      )
    );
  };

  const handleRemoveFromFolder = (itemId: string) => {
    setItems(
      items.map(item => 
        item.id === itemId 
          ? { ...item, folderId: null } 
          : item
      )
    );
  };

  const handleDragStart = (event: DragStartEvent) => {
    console.log("Drag started:", event.active.id);
    const id = event.active.id as string;
    setActiveId(id);
    
    // Check if we're dragging an item or folder
    const draggedItem = items.find(item => item.id === id);
    if (draggedItem) {
      setActiveDraggedItem(draggedItem);
      return;
    }
    
    const draggedFolder = folders.find(folder => folder.id === id);
    if (draggedFolder) {
      setActiveDraggedFolder(draggedFolder);
    }
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    
    if (!over) return;
    
    const activeId = active.id as string;
    const overId = over.id as string;
    
    // Skip if dragging over itself
    if (activeId === overId) return;
    
    // Find if the active item is an item
    const activeItem = items.find(item => item.id === activeId);
    
    // Find if we're over a folder
    const overFolder = folders.find(folder => folder.id === overId);
    
    // Check if we're over the root container (not a folder or item)
    const isOverRootContainer = overId === "root-container";
    
    // Check if we're over an item at root level
    const isOverRootItem = items.find(item => item.id === overId && item.folderId === null);
    
    console.log("Drag over:", { 
      activeId, 
      overId, 
      isOverRootContainer, 
      isOverRootItem: !!isOverRootItem, 
      isOverFolder: !!overFolder 
    });
    
    // If we're dragging an item over a folder, move it into the folder
    if (activeItem && overFolder) {
      // Don't update if the item is already in this folder
      if (activeItem.folderId === overFolder.id) return;
      
      console.log("Moving item to folder:", overFolder.name);
      setItems(
        items.map(item => 
          item.id === activeId 
            ? { ...item, folderId: overFolder.id } 
            : item
        )
      );
    }
    
    // If we're dragging an item and we're over the root container or a root item,
    // move it to the root level (no folder) - but only if it's not already at root
    if (activeItem && activeItem.folderId && (isOverRootContainer || isOverRootItem)) {
      console.log("Moving item to root level from drag over");
      setItems(
        items.map(item => 
          item.id === activeId 
            ? { ...item, folderId: null } 
            : item
        )
      );
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    setActiveDraggedItem(null);
    setActiveDraggedFolder(null);
    
    if (!over) {
      // If no "over" target, this could be a drop outside any specific target
      // so we need to check if we were dragging an item with a folderId
      const activeItem = items.find(item => item.id === active.id);
      if (activeItem && activeItem.folderId) {
        console.log("Dropping item outside specific target, moving to root");
        setItems(
          items.map(item => 
            item.id === active.id 
              ? { ...item, folderId: null } 
              : item
          )
        );
      }
      return;
    }
    
    const activeId = active.id as string;
    const overId = over.id as string;
    
    // Skip if dropping onto itself
    if (activeId === overId) return;
    
    console.log("Drag end:", { activeId, overId });
    
    // Check if we're dragging an item
    const activeItem = items.find(item => item.id === activeId);
    
    if (activeItem) {
      // If we're dropping on the root container, move to root level
      if (overId === "root-container") {
        console.log("Moving item to root level in drag end");
        setItems(
          items.map(item => 
            item.id === activeId 
              ? { ...item, folderId: null } 
              : item
          )
        );
        return;
      }
      
      // Check if dropping on another item
      const overItem = items.find(item => item.id === overId);
      if (overItem) {
        // If dropping on an item at root level, reorder and keep at root
        if (!overItem.folderId && activeItem.folderId) {
          console.log("Moving item from folder to root level");
          // First update the item to be at root level
          setItems(
            items.map(item => 
              item.id === activeId 
                ? { ...item, folderId: null } 
                : item
            )
          );
          
          // Then handle reordering in the itemOrder array
          const activeItemIndex = itemOrder.indexOf(activeId);
          const overItemIndex = itemOrder.indexOf(overId);
          
          if (activeItemIndex !== -1 && overItemIndex !== -1) {
            console.log("Reordering items in root level");
            setItemOrder(arrayMove(itemOrder, activeItemIndex, overItemIndex));
          }
          return;
        }
        
        // If dropping an item from root on an item in folder, move it to that folder
        if (!activeItem.folderId && overItem.folderId) {
          console.log("Moving item from root to folder");
          setItems(
            items.map(item => 
              item.id === activeId 
                ? { ...item, folderId: overItem.folderId } 
                : item
            )
          );
          return;
        }
      }
    }
    
    // Check if we're sorting items
    const activeItemIndex = itemOrder.indexOf(activeId);
    const overItemIndex = itemOrder.indexOf(overId);
    
    if (activeItemIndex !== -1 && overItemIndex !== -1) {
      console.log("Reordering items");
      setItemOrder(arrayMove(itemOrder, activeItemIndex, overItemIndex));
      return;
    }
    
    // Check if we're sorting folders
    const activeFolderIndex = folderOrder.indexOf(activeId);
    const overFolderIndex = folderOrder.indexOf(overId);
    
    if (activeFolderIndex !== -1 && overFolderIndex !== -1) {
      console.log("Reordering folders");
      setFolderOrder(arrayMove(folderOrder, activeFolderIndex, overFolderIndex));
    }
  };

  const handleForceReconnect = () => {
    setIsReconnecting(true);
    toast({
      title: "Reconnecting...",
      description: "Attempting to reconnect to the server",
    });
    socketService.reconnect();
    
    // If we have a pending state, try to send it after reconnection
    const pendingState = localStorage.getItem('collectionAppPendingState');
    if (pendingState) {
      try {
        const state = JSON.parse(pendingState) as AppState;
        setTimeout(() => {
          if (socketService.connected) {
            socketService.updateState(state);
            localStorage.removeItem('collectionAppPendingState');
          }
        }, 1000); // Give a little time for connection to establish
      } catch (error) {
        console.error("Error parsing pending state:", error);
      }
    }
  };

  // Filter root items (not in any folder)
  const rootItems = items
    .filter(item => !item.folderId)
    .sort((a, b) => itemOrder.indexOf(a.id) - itemOrder.indexOf(b.id));

  // Sort folders
  const sortedFolders = folderOrder
    .map(id => folders.find(folder => folder.id === id))
    .filter((folder): folder is Folder => !!folder);

  return (
    <div className="container mx-auto py-8 px-4 max-w-3xl">
      <h1 className="text-2xl font-bold mb-6">Real-time Collection</h1>
      
      {!socketConnected && (
        <div className="mb-4 p-3 bg-yellow-100 text-yellow-800 rounded-md flex items-center justify-between">
          <div>
            Server connection not established. Changes won't sync across sessions.
          </div>
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleForceReconnect}
            disabled={isReconnecting}
            className="ml-2 bg-white hover:bg-gray-100"
          >
            <RefreshCw className={`h-4 w-4 mr-1 ${isReconnecting ? 'animate-spin' : ''}`} />
            {isReconnecting ? 'Connecting...' : 'Reconnect'}
          </Button>
        </div>
      )}
      
      <div className="mb-4 p-3 bg-blue-50 text-blue-700 rounded-md text-sm">
        <p>Tip: You can drag items into folders or drag them out to the main area to organize your collection.</p>
      </div>
      
      <AddItemForm 
        onAddItem={handleAddItem} 
        onAddFolder={handleAddFolder} 
      />
      
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="space-y-4" id="root-container">
          {/* Folders section */}
          <SortableContext items={folderOrder} strategy={verticalListSortingStrategy}>
            {sortedFolders.map(folder => {
              const folderItems = items
                .filter(item => item.folderId === folder.id)
                .sort((a, b) => itemOrder.indexOf(a.id) - itemOrder.indexOf(b.id));
                
              return (
                <CollectionFolder
                  key={folder.id}
                  folder={folder}
                  items={folderItems}
                  onToggleFolder={() => handleToggleFolder(folder.id)}
                  onRemoveFromFolder={handleRemoveFromFolder}
                />
              );
            })}
          </SortableContext>
          
          {/* Root items section */}
          <SortableContext items={rootItems.map(item => item.id)} strategy={verticalListSortingStrategy}>
            <div className="flex flex-col gap-2">
              {rootItems.map(item => (
                <CollectionItem 
                  key={item.id} 
                  item={item}
                  onRemoveFromFolder={() => {}} // Not needed for root items
                />
              ))}
            </div>
          </SortableContext>
        </div>

        {/* Drag Overlay */}
        <DragOverlay adjustScale={true} zIndex={1000}>
          {activeDraggedItem && (
            <div className="bg-white p-3 rounded-md shadow-md flex items-center gap-3 border-2 border-blue-400 opacity-80 w-full max-w-xs">
              <div className="text-gray-600">
                {activeDraggedItem.icon === 'arrow-up' && <ArrowUp className="w-4 h-4" />}
                {activeDraggedItem.icon === 'arrow-down' && <ArrowDown className="w-4 h-4" />}
                {activeDraggedItem.icon === 'book' && <Book className="w-4 h-4" />}
              </div>
              <span className="flex-1 text-sm">{activeDraggedItem.title}</span>
            </div>
          )}
          
          {activeDraggedFolder && (
            <div className="bg-white p-3 rounded-md shadow-md flex items-center gap-3 border-2 border-blue-400 opacity-80 w-full max-w-xs">
              <div className="text-gray-600">
                <FolderIcon className="w-4 h-4" />
              </div>
              <span className="flex-1 text-sm">{activeDraggedFolder.name}</span>
            </div>
          )}
        </DragOverlay>
      </DndContext>
    </div>
  );
};

export default Index;
