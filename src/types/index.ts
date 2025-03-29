
export interface Item {
  id: string;
  title: string;
  icon: string;
  folderId: string | null;
}

export interface Folder {
  id: string;
  name: string;
  isOpen: boolean;
}

export interface AppState {
  items: Item[];
  folders: Folder[];
  itemOrder: string[];
  folderOrder: string[];
}
