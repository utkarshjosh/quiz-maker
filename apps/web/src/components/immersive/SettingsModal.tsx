import React from 'react';
import { useGameStore } from '@/hooks/immersive/useGameStore';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { gameState, setGameState } = useGameStore();

  if (!isOpen) return null;

  const toggleSound = () => {
    setGameState(state => ({ ...state, settings: { ...state.settings, sound: !state.settings.sound } }));
  };

  const toggleMusic = () => {
    setGameState(state => ({ ...state, settings: { ...state.settings, music: !state.settings.music } }));
  };

  return (
    <div className="modal modal-open">
      <div className="modal-box">
        <h3 className="font-bold text-lg">Settings</h3>
        <div className="py-4">
          <div className="form-control">
            <label className="label cursor-pointer">
              <span className="label-text">Sound Effects</span>
              <input type="checkbox" className="toggle toggle-primary" checked={gameState.settings.sound} onChange={toggleSound} />
            </label>
          </div>
          <div className="form-control">
            <label className="label cursor-pointer">
              <span className="label-text">Music</span>
              <input type="checkbox" className="toggle toggle-primary" checked={gameState.settings.music} onChange={toggleMusic} />
            </label>
          </div>
        </div>
        <div className="modal-action">
          <button onClick={onClose} className="btn">Close</button>
        </div>
      </div>
    </div>
  );
}
