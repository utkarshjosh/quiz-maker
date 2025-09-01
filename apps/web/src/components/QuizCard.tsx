import { Star, User } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Image, ImageKitProvider } from "@imagekit/react";
import { useAuth } from "@/auth/AuthContext";
import LoginModal from "./LoginModal";

interface QuizCardProps {
  id: string;
  title: string;
  thumbnail: string;
  rating: number;
  creator: string;
  badges?: string[];
  layout?: "vertical" | "horizontal";
}

const QuizCard = ({
  id,
  title,
  thumbnail,
  rating,
  creator,
  badges = [],
  layout = "vertical",
}: QuizCardProps) => {
  const [isHovered, setIsHovered] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const handleCardClick = () => {
    if (isAuthenticated) {
      navigate(`/play/host/${id}`);
    } else {
      setShowLoginModal(true);
    }
  };

  const cardContent = (
    <>
      <div
        className={`relative ${layout === "horizontal" ? "w-48 h-32" : "aspect-video"}`}>
        <ImageKitProvider urlEndpoint="https://ik.imagekit.io/your_imagekit_id">
          <Image
            src={thumbnail}
            alt={title}
            className="w-full h-full object-cover rounded-lg"
            transformation={[
              {
                height: layout === "horizontal" ? "128" : "200",
                width: layout === "horizontal" ? "192" : "300",
                crop: "maintain_ratio",
                cropMode: "pad_resize",
                focus: "auto",
                quality: 80,
                format: "webp",
                progressive: true,
              },
            ]}
            loading="lazy"
          />
        </ImageKitProvider>

        <div
          className={`absolute inset-0 bg-black/40 rounded-lg flex items-center justify-center opacity-0 transition-opacity duration-200 ${isHovered ? "opacity-100" : ""}`}>
          <span className="text-white font-medium">
            {isAuthenticated ? "Start Quiz" : "Sign in to Play"}
          </span>
        </div>
      </div>

      <div className={`${layout === "horizontal" ? "flex-1" : ""}`}>
        <h3 className="font-semibold text-gray-800 line-clamp-2 mt-2">
          {title}
        </h3>

        <div className="flex items-center gap-2 mt-1">
          <div className="flex items-center gap-1 text-yellow-500">
            <Star className="w-4 h-4 fill-current" />
            <span className="text-sm font-medium">{rating.toFixed(1)}</span>
          </div>
          <div className="flex items-center gap-1 text-gray-500">
            <User className="w-4 h-4" />
            <span className="text-sm">{creator}</span>
          </div>
        </div>

        {badges.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {badges.map((badge, index) => (
              <span
                key={index}
                className="px-2 py-1 text-xs font-medium bg-primary/10 text-primary rounded-full">
                {badge}
              </span>
            ))}
          </div>
        )}
      </div>
    </>
  );

  return (
    <>
      <div
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={handleCardClick}
        className={`group cursor-pointer transition-transform duration-200 hover:-translate-y-1 ${
          layout === "horizontal"
            ? "flex gap-4 bg-white/80 p-4 rounded-xl hover:bg-white hover:shadow-lg"
            : "w-[300px]"
        }`}>
        {cardContent}
      </div>

      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        title="Sign in to play this quiz"
        description="Choose your preferred sign in method to start playing"
      />
    </>
  );
};

export default QuizCard;
