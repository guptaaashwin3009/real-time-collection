import React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Folder, Item } from "../types";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import CollectionItem from "./CollectionItem";
import {
  FolderOpen,
  Folder as FolderIcon,
  ChevronDown,
  ChevronRight,
} from "lucide-react";

interface CollectionFolderProps {
  folder: Folder;
  items: Item[];
  onToggleFolder: () => void;
  onRemoveFromFolder: (itemId: string) => void;
}

const CollectionFolder: React.FC<CollectionFolderProps> = ({
  folder,
  items,
  onToggleFolder,
  onRemoveFromFolder,
}) => {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: folder.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const itemIds = items.map((item) => item.id);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-gray-50 rounded-md border border-gray-200 mb-2 overflow-hidden"
    >
      <div
        className="p-3 flex items-center gap-2 cursor-move bg-white"
        {...attributes}
        {...listeners}
      >
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleFolder();
          }}
          className="text-gray-600 hover:text-gray-800"
        >
          {folder.isOpen ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
        </button>
        <div className="text-gray-600">
          {folder.isOpen ? (
            <FolderOpen className="w-4 h-4" />
          ) : (
            <FolderIcon className="w-4 h-4" />
          )}
        </div>
        <span className="font-medium text-sm flex-1">{folder.name}</span>
      </div>

      {folder.isOpen && items.length > 0 && (
        <div className="p-2">
          <SortableContext
            items={itemIds}
            strategy={verticalListSortingStrategy}
          >
            <div className="flex flex-col gap-2">
              {items.map((item) => (
                <CollectionItem
                  key={item.id}
                  item={item}
                  onRemoveFromFolder={() => onRemoveFromFolder(item.id)}
                />
              ))}
            </div>
          </SortableContext>
        </div>
      )}
    </div>
  );
};

export default CollectionFolder;
