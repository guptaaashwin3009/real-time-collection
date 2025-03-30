import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Item } from '../types';
import { ArrowUp, ArrowDown, Book, X, Folder as FolderIcon } from 'lucide-react';

interface CollectionItemProps {
  item: Item;
  onRemoveFromFolder: () => void;
}

const CollectionItem: React.FC<CollectionItemProps> = ({ item, onRemoveFromFolder }) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: item.id });
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };
  
  // Simple function to get icon component by name
  const getIcon = (iconName: string) => {
    switch(iconName) {
      case 'arrow-up': return <ArrowUp className="w-4 h-4" />;
      case 'arrow-down': return <ArrowDown className="w-4 h-4" />;
      case 'book': return <Book className="w-4 h-4" />;
      default: return <Book className="w-4 h-4" />;
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-white p-3 rounded-md shadow-sm flex items-center gap-3 cursor-move border ${item.folderId ? 'border-blue-200' : 'border-gray-200'}`}
      {...attributes}
      {...listeners}
    >
      <div className="text-gray-600">{getIcon(item.icon)}</div>
      <span className="flex-1 text-sm">{item.title}</span>
      
      {item.folderId && (
        <div className="flex items-center gap-1">
          <FolderIcon className="w-3 h-3 text-blue-400" />
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onRemoveFromFolder();
            }}
            className="text-gray-400 hover:text-red-500 transition-colors"
            title="Remove from folder"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};

export default CollectionItem;
