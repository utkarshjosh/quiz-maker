import React, { useEffect, useState } from "react";
import { createAvatar } from "@dicebear/core";
import { avataaars } from "@dicebear/collection";

interface PlayerCardProps {
  player: {
    id: string;
    name: string;
    score?: number;
    role?: 'host' | 'player';
    isHost?: boolean;
  };
  size?: "sm" | "md" | "lg";
  showScore?: boolean;
  animationDelay?: number;
  variant?: "default" | "podium";
  podiumColor?: string;
}

const sizeClasses = {
  sm: "w-12 h-12",
  md: "w-20 h-20",
  lg: "w-32 h-32",
};

/**
 * PlayerCard component displays a player with a generated avatar
 * Uses DiceBear avatars based on player ID for consistency
 * Does NOT use profile images from socket/Auth0 - always generates avatars
 */
const PlayerCard: React.FC<PlayerCardProps> = ({
  player,
  size = "md",
  showScore = false,
  animationDelay = 0,
  variant = "default",
  podiumColor,
}) => {
  const [avatarUrl, setAvatarUrl] = useState<string>("");

  // Generate avatar based on player ID
  useEffect(() => {
    const generateAvatar = async () => {
      try {
        // Use player ID as seed for consistent avatar generation
        const avatar = createAvatar(avataaars, {
          seed: player.id,
          // Customize avatar options here if needed
        });
        const dataUri = await avatar.toDataUri();
        setAvatarUrl(dataUri);
      } catch (error) {
        console.error("Failed to generate avatar:", error);
        // Fallback to a simple placeholder
        setAvatarUrl("");
      }
    };

    generateAvatar();
  }, [player.id]);

  // Determine if player is host
  const isHost = player.role === 'host' || player.isHost;
  const displayName = isHost ? `${player.name} (Host)` : player.name;

  if (variant === "podium") {
    return (
      <div
        className="flex flex-col items-center"
        style={{ animationDelay: `${animationDelay}ms` }}>
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={displayName}
            className={`${sizeClasses[size]} rounded-full border-4 mb-2 transition-transform hover:scale-110`}
            style={{ borderColor: podiumColor || "#FFD700" }}
          />
        ) : (
          <div
            className={`${sizeClasses[size]} rounded-full border-4 mb-2 bg-gray-700 animate-pulse flex items-center justify-center text-white font-bold`}
            style={{ borderColor: podiumColor || "#FFD700" }}>
            {player.name.charAt(0).toUpperCase()}
          </div>
        )}
        <p className="font-semibold text-xl text-white">{displayName}</p>
        {showScore && player.score !== undefined && (
          <p className="text-lg" style={{ color: podiumColor || "#FFD700" }}>
            {player.score} pts
          </p>
        )}
      </div>
    );
  }

  return (
    <div
      className="flex flex-col items-center animate-pop-in"
      style={{ animationDelay: `${animationDelay}ms` }}>
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt={displayName}
          className={`${sizeClasses[size]} rounded-full bg-purple-400/20 mb-2 transition-transform hover:scale-105 ${
            isHost ? 'ring-2 ring-yellow-400' : ''
          }`}
        />
      ) : (
        <div
          className={`${sizeClasses[size]} rounded-full bg-purple-400/20 mb-2 animate-pulse flex items-center justify-center text-white font-bold ${
            isHost ? 'ring-2 ring-yellow-400' : ''
          }`}>
          {player.name.charAt(0).toUpperCase()}
        </div>
      )}
      <p className={`font-semibold text-white bg-black/20 px-3 py-1 rounded-full ${
        isHost ? 'ring-1 ring-yellow-400/50' : ''
      }`}>
        {displayName}
      </p>
      {showScore && player.score !== undefined && (
        <p className="text-sm text-gray-300 mt-1">{player.score} pts</p>
      )}
    </div>
  );
};

export default PlayerCard;




