# Immersive Quiz Components

## Architecture Overview

This directory contains reusable components for the immersive quiz experience (lobby, game, leaderboard).

### PlayerCard Component

The `PlayerCard` component is a reusable UI element that displays player information with a generated avatar.

**Key Features:**
- Generates consistent avatars using DiceBear (avataaars style) based on player ID
- Does NOT use profile images from Auth0/WebSocket - always generates avatars for consistency
- Supports multiple sizes: `sm`, `md`, `lg`
- Two display variants:
  - `default`: Standard player card with avatar and name
  - `podium`: Enhanced card for leaderboard podium display
- Optional score display
- Animation delay support for staggered entrance effects

**Usage:**

```tsx
import PlayerCard from "@/components/immersive/PlayerCard";

// Basic usage
<PlayerCard
  player={{ id: "user123", name: "John Doe", score: 100 }}
  size="md"
  showScore={false}
/>

// Podium variant
<PlayerCard
  player={{ id: "user123", name: "Jane Smith", score: 500 }}
  size="lg"
  showScore={true}
  variant="podium"
  podiumColor="gold"
/>
```

**Design Decision:**
We chose to use generated avatars instead of user profile pictures to:
1. Maintain visual consistency across all players
2. Avoid loading external images which could fail or be slow
3. Provide a fun, game-like aesthetic
4. Ensure privacy (no real photos in game view)

### Future Enhancements

#### Room Settings (TODO)
The host lobby should include a settings panel in the future with options for:
- Question duration
- Show/hide correctness feedback
- Show/hide leaderboard between questions
- Allow/disallow reconnection
- Player limit
- Custom game modes

This can be implemented as a separate `RoomSettingsPanel` component that wraps the host view.

#### Potential Component Split

If the host and join views diverge significantly, consider splitting into:
- `HostLobby.tsx`: Host-specific view with room settings
- `JoinLobby.tsx`: Player-specific view with PIN entry
- Shared `PlayerList.tsx`: Reusable player list using PlayerCard

Currently, `LobbyScene.tsx` handles both views with conditional rendering, which works well for now.




