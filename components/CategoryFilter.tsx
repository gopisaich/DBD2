
import React from 'react';

interface Props {
  selected: string;
  onSelect: (category: string) => void;
  categories: string[];
}

const CategoryFilter: React.FC<Props> = ({ selected, onSelect, categories }) => {
  return (
    <div className="w-full overflow-x-auto pb-2 scrollbar-hide -mx-2 px-2">
      <div className="flex gap-2.5">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => onSelect(cat)}
            className={`px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap border-2 ${
              selected === cat 
                ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-200 scale-105' 
                : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>
    </div>
  );
};

export default CategoryFilter;
