
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
  DragStartEvent
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

const Index = () => {
  const [items, setItems] = useState<Item[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [itemOrder, setItemOrder] = useState<string[]>([]);
  const [folderOrder, setFolderOrder] = useState<string[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);
  const [socketConnected, setSocketConnected] = useState(false);

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
    
    socketService.on('state-update', handleStateUpdate);
    socketService.on('connect', handleConnect);
    socketService.on('disconnect', handleDisconnect);
    
    // Try to load from local storage if no socket connection
    const savedState = localStorage.getItem('collectionAppState');
    if (savedState) {
      const parsedState = JSON.parse(savedState) as AppState;
      setItems(parsedState.items);
      setFolders(parsedState.folders);
      setItemOrder(parsedState.itemOrder);
      setFolderOrder(parsedState.folderOrder);
      setInitialized(true);
    }
    
    return () => {
      socketService.off('state-update', handleStateUpdate);
      socketService.off('connect', handleConnect);
      socketService.off('disconnect', handleDisconnect);
      socketService.disconnect();
    };
  }, []);

  // Save state to local storage when it changes
  useEffect(() => {
    if (!initialized) return;
    
    const state: AppState = {
      items,
      folders,
      itemOrder,
      folderOrder
    };
    
    localStorage.setItem('collectionAppState', JSON.stringify(state));
    console.log("Updating state to server:", state);
    socketService.updateState(state);
  }, [items, folders, itemOrder, folderOrder, initialized]);

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
    setActiveId(event.active.id as string);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    
    if (!over) return;
    
    const activeId = active.id as string;
    const overId = over.id as string;
    
    // Find if the active item is an item
    const activeItem = items.find(item => item.id === activeId);
    
    // Find if we're over a folder
    const overFolder = folders.find(folder => folder.id === overId);
    
    // Check if we're over the root container (not a folder or item)
    const isOverRootContainer = overId === "root-container" || 
                               (!items.find(item => item.id === overId) && 
                               !folders.find(folder => folder.id === overId));
    
    console.log("Drag over:", { activeId, overId, isOverRootContainer });
    
    // If we're dragging an item over a folder, move it into the folder
    if (activeItem && overFolder) {
      console.log("Moving item to folder:", overFolder.name);
      setItems(
        items.map(item => 
          item.id === activeId 
            ? { ...item, folderId: overFolder.id } 
            : item
        )
      );
    }
    
    // If we're dragging an item and we're not over a folder or item, 
    // move it to the root level (no folder)
    if (activeItem && isOverRootContainer) {
      console.log("Moving item to root level");
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
    
    if (!over) return;
    
    const activeId = active.id as string;
    const overId = over.id as string;
    
    console.log("Drag end:", { activeId, overId });
    
    if (activeId === overId) return;
    
    // Check if we're dragging an item from a folder to the root level
    const activeItem = items.find(item => item.id === activeId);
    if (activeItem && activeItem.folderId) {
      const isOverRootLevel = overId === "root-container" || 
                             (!items.some(item => item.id === overId) && 
                             !folders.some(folder => folder.id === overId));
      
      if (isOverRootLevel) {
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
        <div className="mb-4 p-2 bg-yellow-100 text-yellow-800 rounded-md">
          Server connection not established. Changes won't sync across sessions.
        </div>
      )}
      
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
      </DndContext>
    </div>
  );
};

export default Index;
