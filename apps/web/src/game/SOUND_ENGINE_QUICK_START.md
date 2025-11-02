# Sound Engine Quick Start 🔊

## ✅ What Was Fixed

The **HTTP 416 (Range Not Satisfiable)** and **NotSupportedError** are now completely resolved!

### Problems Solved:
- ❌ HTTP 416 errors from range requests
- ❌ NotSupportedError from dynamic path loading  
- ❌ New Audio() instances on every play
- ❌ No centralized sound management

### Solutions Implemented:
- ✅ Web Audio API with preloaded ArrayBuffers
- ✅ Singleton SoundEngine attached to GameManager
- ✅ Single AudioContext for efficiency
- ✅ Type-safe sound keys
- ✅ Volume control & mute functionality

## 🚀 How to Use (3 Steps)

### 1. Import the hook

```typescript
import { useGameActions } from '@/game/hooks/useGameManager';
```

### 2. Get playSound function

```typescript
function MyComponent() {
  const { playSound } = useGameActions();
  
  // ... rest of component
}
```

### 3. Play sounds using keys

```typescript
// Click sound
playSound('CLICK');

// Correct answer
playSound('CORRECT');

// Wrong answer  
playSound('INCORRECT');
```

## 📁 Available Sounds

| Sound Key | Description | File |
|-----------|-------------|------|
| `CLICK` | UI interactions | `click.mp3` |
| `CORRECT` | Right answer | `correct.mp3` |
| `INCORRECT` | Wrong answer | `incorrect.mp3` |

## 🎚️ Volume Control

```typescript
const { 
  playSound, 
  setMasterVolume, 
  setSoundEnabled, 
  isSoundEnabled 
} = useGameActions();

// Set volume (0.0 to 1.0)
setMasterVolume(0.5);

// Mute all sounds
setSoundEnabled(false);

// Unmute
setSoundEnabled(true);

// Check if enabled
console.log(isSoundEnabled()); // true/false
```

## ➕ Adding New Sounds

### Step 1: Add audio file
Place your `.mp3` file in `/apps/web/src/assets/sounds/`

### Step 2: Update config
Edit `/apps/web/src/game/config/soundConfig.ts`:

```typescript
export const SOUND_CONFIG = {
  // Existing sounds...
  
  MY_SOUND: {
    key: 'my-sound',
    path: '/src/assets/sounds/my-sound.mp3',
    volume: 0.7, // 0.0 to 1.0
    loop: false, // true for looping sounds
  },
} as const;
```

### Step 3: Use it!
```typescript
playSound('MY_SOUND');
```

## 🔧 Complete Example

```typescript
import { useGameActions } from '@/game/hooks/useGameManager';
import { Button } from '@/components/ui/button';

function GameButton({ onAnswer }: { onAnswer: (correct: boolean) => void }) {
  const { playSound } = useGameActions();

  const handleClick = (isCorrect: boolean) => {
    // Play click sound
    playSound('CLICK');
    
    // Handle answer
    onAnswer(isCorrect);
    
    // Play feedback sound
    setTimeout(() => {
      playSound(isCorrect ? 'CORRECT' : 'INCORRECT');
    }, 300);
  };

  return (
    <div>
      <Button onClick={() => handleClick(true)}>
        Right Answer
      </Button>
      <Button onClick={() => handleClick(false)}>
        Wrong Answer
      </Button>
    </div>
  );
}
```

## 📚 Full Documentation

- **Usage Guide**: `/apps/web/src/game/managers/README.md`
- **Implementation Details**: `/SOUND_ENGINE_IMPLEMENTATION.md`
- **Source Code**: `/apps/web/src/game/managers/SoundEngine.ts`

## 🐛 Troubleshooting

### Sound not playing?

1. **Check initialization**: Sound engine loads on first user interaction
2. **Check enabled state**: `isSoundEnabled()` should return `true`
3. **Check volume**: Master volume should be > 0
4. **Check console**: Look for any error messages

### Still getting HTTP 416?

You shouldn't! But if you do:
- Clear browser cache
- Hard refresh (Ctrl+Shift+R)
- Check that you're using the new sound keys (e.g., `'CLICK'` not `'click.mp3'`)

## ⚠️ Breaking Changes

If you used the old `useSound` hook, update your code:

```typescript
// ❌ OLD (deprecated)
import { useSound } from '@/hooks/immersive/useSound';
const { playSound } = useSound();
playSound('click.mp3'); // File path

// ✅ NEW 
import { useGameActions } from '@/game/hooks/useGameManager';
const { playSound } = useGameActions();
playSound('CLICK'); // Sound key
```

## 🎉 That's It!

You now have a professional-grade sound system with:
- ⚡ Instant playback (preloaded)
- 🎚️ Volume control
- 🔇 Mute/unmute
- 📦 No HTTP errors
- 🎯 Type-safe API
- 🧩 Centralized management

**Ready to rock! 🎸**


