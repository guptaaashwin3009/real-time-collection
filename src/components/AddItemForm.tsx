
import React, { useState } from 'react';
import { Book, ArrowUp, ArrowDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface AddItemFormProps {
  onAddItem: (title: string, icon: string) => void;
  onAddFolder: (name: string) => void;
}

const AddItemForm: React.FC<AddItemFormProps> = ({ onAddItem, onAddFolder }) => {
  const [title, setTitle] = useState('');
  const [folderName, setFolderName] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('book');
  
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

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm mb-6 border border-gray-200">
      <h2 className="font-medium text-lg mb-4">Add New Item</h2>
      
      <div className="flex gap-2 mb-4">
        <Input
          type="text"
          placeholder="Item title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="flex-1"
        />
        
        <div className="flex border rounded-md">
          {icons.map((icon) => (
            <button
              key={icon.name}
              type="button"
              onClick={() => setSelectedIcon(icon.name)}
              className={`p-2 ${selectedIcon === icon.name ? 'bg-gray-100' : ''}`}
            >
              {icon.component}
            </button>
          ))}
        </div>
        
        <Button onClick={handleAddItem} disabled={!title.trim()}>
          Add Item
        </Button>
      </div>
      
      <div className="flex gap-2">
        <Input
          type="text"
          placeholder="Folder name"
          value={folderName}
          onChange={(e) => setFolderName(e.target.value)}
          className="flex-1"
        />
        <Button onClick={handleAddFolder} disabled={!folderName.trim()}>
          Add Folder
        </Button>
      </div>
    </div>
  );
};

export default AddItemForm;
