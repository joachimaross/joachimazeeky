import React from 'react';
import { FiMoreHorizontal, FiRefreshCw } from 'react-icons/fi';

const LiveTile = ({ title, children }) => {
  return (
    <div className="w-full h-full flex flex-col p-2">
      <div className="flex justify-between items-center text-sm font-bold text-gray-500 dark:text-gray-400 mb-2">
        <h3>{title}</h3>
        <div className="flex space-x-2"><FiRefreshCw className="cursor-pointer hover:text-blue-500" /><FiMoreHorizontal className="cursor-pointer hover:text-blue-500" /></div>
      </div>
      <div className="flex-1 bg-white dark:bg-gray-700 rounded-md overflow-hidden">
        {children || <div className="p-2">Content for the tile goes here</div>}
      </div>
    </div>
  );
};

export default LiveTile;
