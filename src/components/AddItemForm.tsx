import React, { useState, KeyboardEvent } from 'react';
import { Book, ArrowUp, ArrowDown, Plus, FolderPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface AddItemFormProps {
  onAddItem: (title: string, icon: string) => void;
  onAddFolder: (name: string) => void;
}

const AddItemForm: React.FC<AddItemFormProps> = ({ onAddItem, onAddFolder }) => {
  const [title, setTitle] = useState('');
  const [folderName, setFolderName] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('book');
  const [activeTab, setActiveTab] = useState('item');
  
  const icons = [
    { name: 'book', component: <Book className="w-4 h-4" /> },
    { name: 'arrow-up', component: <ArrowUp className="w-4 h-4" /> },
    { name: 'arrow-down', component: <ArrowDown className="w-4 h-4" /> },
  ];

  const handleAddItem = () => {
    if (!title.trim()) return;
    onAddItem(title, selectedIcon);
    setTitle('');
  };

  const handleAddFolder = () => {
    if (!folderName.trim()) return;
    onAddFolder(folderName);
    setFolderName('');
  };
  
  const handleItemKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleAddItem();
    }
  };
  
  const handleFolderKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleAddFolder();
    }
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm mb-6 border border-gray-200">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-2">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="item">Add Item</TabsTrigger>
          <TabsTrigger value="folder">Add Folder</TabsTrigger>
        </TabsList>
        
        <TabsContent value="item" className="mt-4">
          <div className="flex flex-col gap-4">
            <Input
              type="text"
              placeholder="Item title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={handleItemKeyDown}
              className="flex-1"
              autoFocus={activeTab === 'item'}
            />
            
            <div className="flex justify-between items-center">
              <div className="flex flex-col gap-1">
                <span className="text-xs text-gray-500 mb-1">Choose icon for your file:</span>
                <div className="flex border rounded-md">
                  {icons.map((icon) => (
                    <button
                      key={icon.name}
                      type="button"
                      onClick={() => setSelectedIcon(icon.name)}
                      className={`p-2 transition-colors ${selectedIcon === icon.name ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-50'}`}
                    >
                      {icon.component}
                    </button>
                  ))}
                </div>
              </div>
              
              <Button 
                onClick={handleAddItem} 
                disabled={!title.trim()}
                className="gap-1"
              >
                <Plus className="w-4 h-4" />
                Add Item
              </Button>
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="folder" className="mt-4">
          <div className="flex flex-col gap-4">
            <Input
              type="text"
              placeholder="Folder name"
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              onKeyDown={handleFolderKeyDown}
              className="flex-1"
              autoFocus={activeTab === 'folder'}
            />
            
            <div className="flex justify-end">
              <Button 
                onClick={handleAddFolder} 
                disabled={!folderName.trim()}
                className="gap-1"
              >
                <FolderPlus className="w-4 h-4" />
                Add Folder
              </Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AddItemForm;
