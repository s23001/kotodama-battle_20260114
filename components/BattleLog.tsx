import React, { useRef, useEffect } from 'react';
import { LogEntry } from '../types';

interface BattleLogProps {
  logs: LogEntry[];
}

export const BattleLog: React.FC<BattleLogProps> = ({ logs }) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  if (logs.length === 0) return null;

  return (
    <div className="w-full max-w-3xl mt-8 mx-auto">
      <h3 className="text-center text-slate-500 text-sm font-bold mb-2">BATTLE LOG</h3>
      <div className="bg-slate-900/50 rounded-lg p-4 max-h-64 overflow-y-auto border border-slate-800 space-y-4 scrollbar-thin scrollbar-thumb-slate-700">
        {logs.map((log) => (
          <div key={log.turn} className="border-l-4 border-slate-700 pl-4 py-1 animate-fadeIn">
            <div className="flex justify-between text-xs text-slate-400 mb-1">
              <span className="font-bold">TURN {log.turn}</span>
              <span>
                 {log.result.winner === 'p1' ? 'P1 WIN' : log.result.winner === 'p2' ? 'P2 WIN' : 'DRAW'}
                 {log.result.crit && <span className="ml-2 text-yellow-400 font-bold">CRITICAL!</span>}
              </span>
            </div>
            <p className="text-sm text-slate-200 leading-relaxed font-medium">
              {log.result.narration}
            </p>
            <div className="mt-2 text-xs text-slate-500 grid grid-cols-2 gap-2">
               <div className="bg-slate-800/50 p-1 rounded px-2">P1: {log.result.p1Action}</div>
               <div className="bg-slate-800/50 p-1 rounded px-2">P2: {log.result.p2Action}</div>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
};