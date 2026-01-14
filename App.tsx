import React, { useState, useEffect, useCallback } from 'react';
import { GamePhase, PlayerStats, LogEntry, TraitType } from './types';
import { resolveTurn, generateBattleIllustration } from './services/geminiService';
import { HealthBar } from './components/HealthBar';
import { ActionCard } from './components/ActionCard';
import { BattleLog } from './components/BattleLog';

// Trait Constants
const TRAITS = {
  TOUGH: {
    label: '豆腐メンタルマッチョ',
    sub: '身体は強いが心は脆い',
    desc: '物理◎ / 精神✕',
    hp: 120,
    avatar: '🦍'
  },
  MENTAL: {
    label: '鋼メンタルもやし',
    sub: '身体は弱いが心は強い',
    desc: '物理✕ / 精神◎',
    hp: 80,
    avatar: '🧠'
  }
};

const App: React.FC = () => {
  // Game State
  const [phase, setPhase] = useState<GamePhase>(GamePhase.SETUP);
  const [turnCount, setTurnCount] = useState(1);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  
  // Players
  const [p1, setP1] = useState<PlayerStats>({
    id: 'p1', name: 'Player 1', hp: 100, maxHp: 100, avatar: '🦍', themeColor: 'text-blue-400', trait: 'TOUGH'
  });
  const [p2, setP2] = useState<PlayerStats>({
    id: 'p2', name: 'Player 2', hp: 100, maxHp: 100, avatar: '🧠', themeColor: 'text-red-400', trait: 'MENTAL'
  });

  // Inputs
  const [p1Input, setP1Input] = useState('');
  const [p2Input, setP2Input] = useState('');
  const [inputError, setInputError] = useState('');

  // Visual effects state
  const [damageTarget, setDamageTarget] = useState<'p1' | 'p2' | 'both' | null>(null);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);

  // Helper to set trait
  const setPlayerTrait = (pid: 'p1' | 'p2', trait: TraitType) => {
    const data = TRAITS[trait];
    const updater = pid === 'p1' ? setP1 : setP2;
    updater(prev => ({
      ...prev,
      trait: trait,
      hp: data.hp,
      maxHp: data.hp,
      avatar: data.avatar
    }));
  };

  const handleStartGame = () => {
    setPhase(GamePhase.P1_INPUT);
  };

  const handleP1Submit = () => {
    if (!p1Input.trim()) {
      setInputError('行動を入力してください / Please enter an action');
      return;
    }
    setInputError('');
    setPhase(GamePhase.P2_INPUT);
  };

  const handleP2Submit = () => {
    if (!p2Input.trim()) {
      setInputError('行動を入力してください / Please enter an action');
      return;
    }
    setInputError('');
    processTurn();
  };

  const processTurn = useCallback(async () => {
    setPhase(GamePhase.PROCESSING);
    setIsGeneratingImage(true);
    
    // Construct a brief history summary for context
    const historyText = logs.slice(-3).map(l => 
      `Turn ${l.turn}: ${l.result.winner === 'p1' ? p1.name : p2.name} won. ${l.result.narration}`
    ).join('; ');

    // 1. Resolve Text Outcome with Traits
    const result = await resolveTurn(
      p1.name, p1Input, p1.trait,
      p2.name, p2Input, p2.trait,
      historyText
    );

    // Update Logs immediately with text result
    setLogs(prev => [...prev, { turn: turnCount, result }]);

    // Apply Logic
    setDamageTarget(result.winner === 'p1' ? 'p2' : result.winner === 'p2' ? 'p1' : 'both');

    setTimeout(async () => {
        // Calculate new HP
        let newP1Hp = p1.hp;
        let newP2Hp = p2.hp;

        if (result.winner === 'p2') newP1Hp -= result.damage;
        else if (result.winner === 'p1') newP2Hp -= result.damage;
        else { // Draw
            newP1Hp -= result.damage;
            newP2Hp -= result.damage;
        }

        setP1(prev => ({ ...prev, hp: Math.max(0, newP1Hp) }));
        setP2(prev => ({ ...prev, hp: Math.max(0, newP2Hp) }));

        setPhase(GamePhase.RESULT);
        setDamageTarget(null);
        
        // 2. Generate Image (Async)
        try {
          const imageUrl = await generateBattleIllustration(
            p1.name, p1Input, p2.name, p2Input, result.narration
          );
          
          if (imageUrl) {
            setLogs(prevLogs => {
              const newLogs = [...prevLogs];
              const lastIdx = newLogs.length - 1;
              if (lastIdx >= 0 && newLogs[lastIdx].turn === turnCount) {
                 newLogs[lastIdx] = {
                   ...newLogs[lastIdx],
                   result: { ...newLogs[lastIdx].result, imageUrl }
                 };
              }
              return newLogs;
            });
          }
        } finally {
          setIsGeneratingImage(false);
        }

        // Check Game Over
        if (newP1Hp <= 0 || newP2Hp <= 0) {
            setTimeout(() => setPhase(GamePhase.GAME_OVER), 4000);
        }
    }, 500); // Short delay for animation start
  }, [p1, p2, p1Input, p2Input, logs, turnCount]);

  const nextTurn = () => {
      setTurnCount(prev => prev + 1);
      setP1Input('');
      setP2Input('');
      setPhase(GamePhase.P1_INPUT);
  };

  const resetGame = () => {
    // Reset to defaults (keeping names if possible or full reset? Let's full reset to allow trait re-selection)
    setP1({ ...p1, hp: TRAITS.TOUGH.hp, maxHp: TRAITS.TOUGH.hp, trait: 'TOUGH', avatar: TRAITS.TOUGH.avatar });
    setP2({ ...p2, hp: TRAITS.MENTAL.hp, maxHp: TRAITS.MENTAL.hp, trait: 'MENTAL', avatar: TRAITS.MENTAL.avatar });
    setLogs([]);
    setTurnCount(1);
    setP1Input('');
    setP2Input('');
    setPhase(GamePhase.SETUP);
  };

  const TraitSelector = ({ pid, currentTrait }: { pid: 'p1' | 'p2', currentTrait: TraitType }) => (
    <div className="flex gap-2 justify-center mt-2">
      {(['TOUGH', 'MENTAL'] as TraitType[]).map((t) => (
        <button
          key={t}
          onClick={() => setPlayerTrait(pid, t)}
          className={`flex-1 p-2 rounded-lg border-2 text-xs md:text-sm transition-all ${
            currentTrait === t 
              ? 'border-yellow-400 bg-yellow-500/20 text-white' 
              : 'border-slate-700 bg-slate-800/50 text-slate-400 hover:border-slate-500'
          }`}
        >
          <div className="text-xl mb-1">{TRAITS[t].avatar}</div>
          <div className="font-bold">{TRAITS[t].label}</div>
          <div className="text-[10px] opacity-80">{TRAITS[t].desc}</div>
        </button>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-4 md:p-8 flex flex-col items-center overflow-x-hidden font-sans relative">
      {/* Background Ambience */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-blue-600/10 blur-[100px] rounded-full"></div>
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-purple-600/10 blur-[100px] rounded-full"></div>
      </div>

      {/* Header */}
      <header className="mb-8 z-10 text-center">
        <h1 className="text-4xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 tracking-tighter drop-shadow-lg neon-text">
          言霊バトル
        </h1>
        <p className="text-slate-400 text-sm md:text-base tracking-widest mt-2 uppercase">
          Kotodama Duel Arena
        </p>
      </header>

      {/* Game Area */}
      <div className="w-full max-w-4xl z-10 flex flex-col gap-8">
        
        {/* HUD - Always Visible during game */}
        {(phase !== GamePhase.SETUP) && (
          <div className="grid grid-cols-2 gap-4 md:gap-12 items-center">
            <HealthBar player={p1} isActive={phase === GamePhase.P1_INPUT} isTakingDamage={damageTarget === 'p1' || damageTarget === 'both'} />
            <HealthBar player={p2} isActive={phase === GamePhase.P2_INPUT} isTakingDamage={damageTarget === 'p2' || damageTarget === 'both'} />
          </div>
        )}

        {/* Phase: SETUP */}
        {phase === GamePhase.SETUP && (
          <ActionCard title="Setup Battle" className="text-center animate-fadeIn">
            <p className="mb-6 text-slate-300">
              プレイヤー名とタイプを選択してください。
            </p>
            
            <div className="grid md:grid-cols-2 gap-8 mb-8">
              {/* Player 1 Setup */}
              <div className="bg-slate-900/50 p-4 rounded-xl border border-blue-900/50">
                <h4 className="text-blue-400 font-bold mb-2">PLAYER 1</h4>
                <input 
                  type="text" 
                  value={p1.name} 
                  onChange={(e) => setP1({...p1, name: e.target.value})}
                  className="w-full bg-slate-800 border border-slate-700 p-2 rounded text-center text-blue-300 placeholder-slate-600 focus:border-blue-500 outline-none mb-4"
                  placeholder="Name"
                />
                <TraitSelector pid="p1" currentTrait={p1.trait} />
              </div>

              {/* Player 2 Setup */}
              <div className="bg-slate-900/50 p-4 rounded-xl border border-red-900/50">
                <h4 className="text-red-400 font-bold mb-2">PLAYER 2</h4>
                <input 
                  type="text" 
                  value={p2.name} 
                  onChange={(e) => setP2({...p2, name: e.target.value})}
                  className="w-full bg-slate-800 border border-slate-700 p-2 rounded text-center text-red-300 placeholder-slate-600 focus:border-red-500 outline-none mb-4"
                  placeholder="Name"
                />
                <TraitSelector pid="p2" currentTrait={p2.trait} />
              </div>
            </div>

            <button
              onClick={handleStartGame}
              className="px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full font-bold text-white hover:scale-105 transition-transform shadow-lg shadow-purple-500/30"
            >
              BATTLE START
            </button>
          </ActionCard>
        )}

        {/* Phase: P1 INPUT */}
        {phase === GamePhase.P1_INPUT && (
          <ActionCard title={`${p1.name}'s Turn`} borderColor="border-blue-500/50" className="animate-slideIn">
             <div className="flex justify-between items-center mb-2">
                <span className="text-xs px-2 py-1 rounded bg-slate-700 text-slate-300">
                   Type: {TRAITS[p1.trait].label}
                </span>
                <span className="text-xs text-slate-500">※ Player 2 should look away.</span>
             </div>
            <textarea
              value={p1Input}
              onChange={(e) => setP1Input(e.target.value)}
              className="w-full h-32 bg-slate-900/50 border border-slate-700 rounded-lg p-4 text-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-colors resize-none"
              placeholder={`Action (${p1.trait === 'TOUGH' ? 'Physical attacks recommended!' : 'Mental attacks recommended!'})`}
              autoFocus
            />
            {inputError && <p className="text-red-400 text-sm mt-2">{inputError}</p>}
            <div className="mt-4 flex justify-end">
              <button
                onClick={handleP1Submit}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-500 rounded text-white font-bold transition-colors"
              >
                Confirm Action
              </button>
            </div>
          </ActionCard>
        )}

        {/* Phase: P2 INPUT */}
        {phase === GamePhase.P2_INPUT && (
          <ActionCard title={`${p2.name}'s Turn`} borderColor="border-red-500/50" className="animate-slideIn">
             <div className="flex justify-between items-center mb-2">
                <span className="text-xs px-2 py-1 rounded bg-slate-700 text-slate-300">
                   Type: {TRAITS[p2.trait].label}
                </span>
                <span className="text-xs text-slate-500">※ Don't peek at Player 1's move!</span>
             </div>
            <textarea
              value={p2Input}
              onChange={(e) => setP2Input(e.target.value)}
              className="w-full h-32 bg-slate-900/50 border border-slate-700 rounded-lg p-4 text-lg focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none transition-colors resize-none"
              placeholder={`Action (${p2.trait === 'TOUGH' ? 'Physical attacks recommended!' : 'Mental attacks recommended!'})`}
              autoFocus
            />
            {inputError && <p className="text-red-400 text-sm mt-2">{inputError}</p>}
            <div className="mt-4 flex justify-end">
              <button
                onClick={handleP2Submit}
                className="px-6 py-2 bg-red-600 hover:bg-red-500 rounded text-white font-bold transition-colors"
              >
                CLASH!
              </button>
            </div>
          </ActionCard>
        )}

        {/* Phase: PROCESSING */}
        {phase === GamePhase.PROCESSING && (
          <div className="flex flex-col items-center justify-center py-12 animate-pulse">
            <div className="text-6xl mb-4">⚔️</div>
            <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-red-400">
              Judging the Clash...
            </h2>
            <p className="text-slate-500 mt-2">AI Referee is analyzing types & actions...</p>
          </div>
        )}

        {/* Phase: RESULT (Turn Result) */}
        {phase === GamePhase.RESULT && logs.length > 0 && (
          <ActionCard title="Turn Result" className="animate-popIn text-center border-yellow-500/30 bg-slate-800/90 max-w-3xl">
             <div className="mb-4">
                {logs[logs.length-1].result.winner === 'p1' ? (
                    <div className="text-4xl mb-2">🧙‍♂️ <span className="text-blue-400 font-bold">{p1.name} Wins!</span></div>
                ) : logs[logs.length-1].result.winner === 'p2' ? (
                    <div className="text-4xl mb-2">🥷 <span className="text-red-400 font-bold">{p2.name} Wins!</span></div>
                ) : (
                    <div className="text-4xl mb-2 text-yellow-400 font-bold">DRAW!</div>
                )}
             </div>

             {/* Illustration Area */}
             <div className="w-full aspect-video bg-black rounded-lg mb-6 overflow-hidden relative border border-slate-700 shadow-2xl">
                 {logs[logs.length-1].result.imageUrl ? (
                     <img 
                        src={logs[logs.length-1].result.imageUrl} 
                        alt="Battle Scene" 
                        className="w-full h-full object-cover animate-fadeIn"
                     />
                 ) : (
                     <div className="flex flex-col items-center justify-center h-full text-slate-500 gap-2">
                         <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                         <p className="text-xs uppercase tracking-widest">Visualizing Impact...</p>
                     </div>
                 )}
             </div>

             <div className="bg-black/30 p-6 rounded-lg border border-slate-700 mb-6">
                <p className="text-lg md:text-xl leading-relaxed text-slate-200 font-serif italic">
                    "{logs[logs.length-1].result.narration}"
                </p>
             </div>

             <div className="text-3xl font-black text-red-500 mb-2">
                -{logs[logs.length-1].result.damage} HP
             </div>
             <p className="text-slate-500 text-sm mb-6">
                 to {logs[logs.length-1].result.winner === 'p1' ? p2.name : logs[logs.length-1].result.winner === 'p2' ? p1.name : 'Both Players'}
             </p>

            {!(p1.hp <= 0 || p2.hp <= 0) && (
             <button
                onClick={nextTurn}
                disabled={isGeneratingImage}
                className="px-10 py-3 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 rounded-full text-white font-bold transition-colors"
             >
                {isGeneratingImage ? 'Generating Scene...' : 'Next Turn'}
             </button>
            )}
          </ActionCard>
        )}

        {/* Phase: GAME OVER */}
        {phase === GamePhase.GAME_OVER && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/90 backdrop-blur-sm p-4">
            <div className="bg-gradient-to-b from-slate-800 to-slate-900 border-2 border-yellow-500/50 p-8 rounded-2xl shadow-2xl max-w-lg w-full text-center transform animate-popIn">
              <h2 className="text-5xl font-black text-white mb-2 drop-shadow-lg">GAME SET</h2>
              <div className="text-6xl my-8">
                 {p1.hp > 0 ? '🏆' : p2.hp > 0 ? '🏆' : '💀'}
              </div>
              <h3 className="text-3xl font-bold mb-6 text-yellow-400">
                {p1.hp > 0 ? `${p1.name} Wins!` : p2.hp > 0 ? `${p2.name} Wins!` : 'Double KO!'}
              </h3>
              <button
                onClick={resetGame}
                className="px-8 py-3 bg-slate-100 text-slate-900 rounded-full font-bold hover:bg-white hover:scale-105 transition-all"
              >
                Play Again
              </button>
            </div>
          </div>
        )}

        {/* Battle Log (Always Visible below) */}
        <BattleLog logs={logs} />
      </div>
    </div>
  );
};

export default App;