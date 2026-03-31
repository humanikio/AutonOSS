'use client';

import { memo } from 'react';
import { Plus } from 'lucide-react';

interface AddNodeData {
  label: string;
  onAdd?: () => void;
}

interface AddNodeProps {
  data: AddNodeData;
}

const AddNode = ({ data }: AddNodeProps) => {
  return (
    <div
      onClick={data.onAdd}
      className="
        w-48 h-16
        border-2 border-dashed border-blue-300
        bg-blue-50
        rounded-lg
        flex items-center justify-center
        cursor-pointer
        hover:border-blue-400 hover:bg-blue-100
        transition-colors
      "
    >
      <Plus className="h-5 w-5 text-blue-600 mr-2" />
      <span className="text-blue-600 font-medium text-sm">{data.label}</span>
    </div>
  );
};

export default memo(AddNode);
