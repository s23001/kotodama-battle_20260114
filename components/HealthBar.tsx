import React from 'react';
import { PlayerStats } from '../types';

interface HealthBarProps {
  player: PlayerStats;
  isActive: boolean;
  isTakingDamage: boolean;
}

export const HealthBar: React.FC<HealthBarProps> = ({ player, isActive, isTakingDamage }) => {
  const percent = Math.max(0, (player.hp / player.maxHp) * 100);
  
  // Dynamic color based on HP
  let barColor = 'bg-green-500';
  if (percent < 50) barColor = 'bg-yellow-500';
  if (percent < 25) barColor = 'bg-red-600';

  return (
    <div className={`flex flex-col w-full max-w-md transition-all duration-300 ${isActive ? 'scale-105 opacity-100' : 'opacity-80 scale-100'} ${isTakingDamage ? 'animate-shake' : ''}`}>
      <div className="flex justify-between items-end mb-1 px-1">
        <div className="flex items-center gap-2">
           <span className="text-2xl">{player.avatar}</span>
           <span className="font-bold text-lg md:text-xl tracking-wider text-white drop-shadow-md">
             {player.name}
           </span>
        </div>
        <span className="font-mono text-xl font-bold text-white">
          {player.hp} / {player.maxHp}
        </span>
      </div>
      
      <div className="h-6 w-full bg-slate-800 rounded-full overflow-hidden border-2 border-slate-700 shadow-inner relative">
         {/* Background pattern */}
         <div className="absolute inset-0 opacity-20 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPgo8cmVjdCB3aWR0aD0iNCIgaGVpZ2h0PSI0IiBmaWxsPSIjZmZmIi8+CjxyZWN0IHdpZHRoPSIxIiBoZWlnaHQ9IjEiIGZpbGw9IiMwMDAiLz4KPC9zdmc+')]"></div>
         
         {/* HP Bar */}
         <div 
            className={`h-full transition-all duration-700 ease-out ${barColor} relative`}
            style={{ width: `${percent}%` }}
         >
            <div className="absolute inset-0 bg-gradient-to-b from-white/30 to-transparent"></div>
         </div>
      </div>
    </div>
  );
};