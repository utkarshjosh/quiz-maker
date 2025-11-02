# Sound Engine Usage Guide

## Overview

The SoundEngine is a singleton class that manages all audio in the game using the Web Audio API. It provides:

- **Preloading**: All sounds are loaded at initialization for instant playback
- **Single AudioContext**: Efficient resource usage with one audio context
- **Volume Control**: Per-sound and master volume control
- **Enable/Disable**: Toggle sound on/off globally
- **Error Handling**: Graceful fallback if audio fails to load

## Quick Start

### Basic Usage

The SoundEngine is automatically integrated with GameManager. Use the `useGameActions` hook to play sounds:

```typescript
import { useGameActions } from '@/game/hooks/useGameManager';

function MyComponent() {
  const { playSound } = useGameActions();

  const handleClick = () => {
    playSound('CLICK');
  };

  return <button onClick={handleClick}>Click Me</button>;
}
```

### Available Sound Keys

Sound keys are defined in `game/config/soundConfig.ts`:

- `CLICK` - UI interaction sounds
- `CORRECT` - Correct answer feedback
- `INCORRECT` - Incorrect answer feedback

### Adding New Sounds

1. Add your audio file to `src/assets/sounds/`
2. Update `soundConfig.ts`:

```typescript
export const SOUND_CONFIG = {
  // ... existing sounds
  
  MY_NEW_SOUND: {
    key: 'my-new-sound',
    path: '/src/assets/sounds/my-sound.mp3',
    volume: 0.8,
    loop: false, // Optional: set to true for looping sounds
  },
} as const;
```

3. Play it using the sound key:

```typescript
playSound('MY_NEW_SOUND');
```

## Advanced Usage

### Direct Access to Sound Engine

If you need more control, access the SoundEngine directly:

```typescript
import { getSoundEngine } from '@/game/managers/SoundEngine';

const soundEngine = getSoundEngine();

// Enable/disable all sounds
soundEngine.setEnabled(false);

// Set master volume (0.0 to 1.0)
soundEngine.setMasterVolume(0.5);

// Check initialization status
if (soundEngine.getInitialized()) {
  soundEngine.play('CLICK');
}
```

### Volume Control in Components

```typescript
function VolumeControl() {
  const { setMasterVolume, isSoundEnabled, setSoundEnabled } = useGameActions();
  const [volume, setVolume] = useState(1.0);

  const handleVolumeChange = (value: number) => {
    setVolume(value);
    setMasterVolume(value);
  };

  return (
    <div>
      <input
        type="range"
        min="0"
        max="1"
        step="0.1"
        value={volume}
        onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
      />
      <button onClick={() => setSoundEnabled(!isSoundEnabled())}>
        {isSoundEnabled() ? 'Mute' : 'Unmute'}
      </button>
    </div>
  );
}
```

## Integration with Game Events

Play sounds in response to game events:

```typescript
// In your game component
useEffect(() => {
  if (answerStatus === 'correct') {
    playSound('CORRECT');
  } else if (answerStatus === 'incorrect') {
    playSound('INCORRECT');
  }
}, [answerStatus, playSound]);
```

## Technical Details

### Why Web Audio API?

We use the Web Audio API instead of HTML5 Audio elements because:

1. **Better Performance**: Single AudioContext shared across all sounds
2. **No HTTP Range Issues**: Sounds are fully loaded as buffers, avoiding 416 errors
3. **Precise Timing**: Sample-accurate playback timing
4. **Advanced Control**: Volume nodes, effects, and routing

### Browser Autoplay Policy

Modern browsers require user interaction before playing audio. The SoundEngine:

- Initializes after user interaction (when GameManager initializes)
- Automatically resumes suspended AudioContext when playing sounds
- Handles errors gracefully if audio fails to play

### Memory Management

- Sounds are loaded once and cached as AudioBuffers
- Each playback creates a temporary BufferSource that is garbage collected
- The AudioContext persists across game sessions as a singleton

## Troubleshooting

### Sound Not Playing

1. **Check initialization**: `soundEngine.getInitialized()` should return `true`
2. **Check enabled state**: `soundEngine.getEnabled()` should return `true`
3. **Check volume**: Master volume and sound volume should be > 0
4. **Check browser console**: Look for loading errors
5. **Check file path**: Ensure sound files exist in `src/assets/sounds/`

### HTTP 416 Error (Range Not Satisfiable)

This error is **solved** by using the Web Audio API with fetch + ArrayBuffer instead of direct Audio element paths.

### NotSupportedError

This error is **solved** by:
- Preloading all sounds at initialization
- Using decoded AudioBuffers instead of direct file playback
- Proper error handling during load

## Performance Best Practices

1. **Preload at Startup**: All sounds are preloaded during GameManager initialization
2. **Reuse Buffers**: AudioBuffers are cached and reused for each playback
3. **Volume Ramping**: For smooth volume changes, use gain nodes (already implemented)
4. **Cleanup**: SoundEngine persists as singleton; no manual cleanup needed

## Example: Complete Button Component

```typescript
import { useGameActions } from '@/game/hooks/useGameManager';
import { Button } from '@/components/ui/button';

function GameButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  const { playSound } = useGameActions();

  const handleClick = () => {
    playSound('CLICK');
    onClick();
  };

  return <Button onClick={handleClick}>{children}</Button>;
}
```

## Example: Answer Feedback

```typescript
function AnswerOption({ option, onSelect }: AnswerOptionProps) {
  const { playSound, submitAnswer } = useGameActions();
  const [isSelected, setIsSelected] = useState(false);

  const handleSelect = async () => {
    setIsSelected(true);
    
    // Submit answer
    const isCorrect = await submitAnswer(option);
    
    // Play feedback sound
    playSound(isCorrect ? 'CORRECT' : 'INCORRECT');
  };

  return (
    <button
      onClick={handleSelect}
      className={isSelected ? 'selected' : ''}
    >
      {option}
    </button>
  );
}
```

