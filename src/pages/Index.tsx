
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

const Index = () => {
  const [items, setItems] = useState<Item[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [itemOrder, setItemOrder] = useState<string[]>([]);
  const [folderOrder, setFolderOrder] = useState<string[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Connect to socket and initialize state
  useEffect(() => {
    socketService.connect();
    
    const handleStateUpdate = (state: AppState) => {
      setItems(state.items);
      setFolders(state.folders);
      setItemOrder(state.itemOrder);
      setFolderOrder(state.folderOrder);
      setInitialized(true);
    };
    
    socketService.on('state-update', handleStateUpdate);
    
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
    
    if (activeItem && overFolder) {
      setItems(
        items.map(item => 
          item.id === activeId 
            ? { ...item, folderId: overFolder.id } 
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
    
    if (activeId === overId) return;
    
    // Check if we're sorting items
    const activeItemIndex = itemOrder.indexOf(activeId);
    const overItemIndex = itemOrder.indexOf(overId);
    
    if (activeItemIndex !== -1 && overItemIndex !== -1) {
      setItemOrder(arrayMove(itemOrder, activeItemIndex, overItemIndex));
      return;
    }
    
    // Check if we're sorting folders
    const activeFolderIndex = folderOrder.indexOf(activeId);
    const overFolderIndex = folderOrder.indexOf(overId);
    
    if (activeFolderIndex !== -1 && overFolderIndex !== -1) {
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
        <div className="space-y-4">
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
