import { useState, useEffect } from "react";
import { useAuth } from "@/auth/AuthContext";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  User,
  Mail,
  Shield,
  Calendar,
  CheckCircle,
  Loader2,
  ExternalLink,
} from "lucide-react";
import { userService } from "@/lib/services/userService";
import { useToast } from "@/hooks/use-toast";

const Profile = () => {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Profile data comes from useAuth, no separate loading needed
    setIsLoading(false);
  }, [user]);

  const getInitials = (name?: string, email?: string) => {
    if (name) {
      return name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    if (email) {
      return email[0].toUpperCase();
    }
    return "U";
  };

  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex items-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading profile...</span>
        </div>
      </div>
    );
  }

  const displayUser = user;

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">Profile</h1>
          <p className="text-gray-600 mt-2">
            Manage your account and preferences
          </p>
        </div>

        {/* Profile Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl">Personal Information</CardTitle>
                <CardDescription>
                  Your profile information is managed by Auth0
                </CardDescription>
              </div>
              <Button
                variant="outline"
                className="flex items-center gap-2"
                onClick={() =>
                  window.open("https://manage.auth0.com/dashboard", "_blank")
                }>
                <ExternalLink className="h-4 w-4" />
                Manage Account
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Avatar Section */}
            <div className="flex items-center gap-6">
              <Avatar className="h-24 w-24">
                <AvatarImage
                  src={displayUser?.picture}
                  alt={displayUser?.name || displayUser?.email}
                />
                <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
                  {getInitials(displayUser?.name, displayUser?.email)}
                </AvatarFallback>
              </Avatar>
              <div className="space-y-2">
                <h3 className="text-xl font-semibold">
                  {displayUser?.name || "User"}
                </h3>
                <p className="text-gray-600">{displayUser?.email}</p>
                <div className="flex items-center gap-2">
                  <Badge
                    variant="secondary"
                    className="flex items-center gap-1">
                    <Shield className="h-3 w-3" />
                    {displayUser?.emailVerified ? "Verified" : "Unverified"}
                  </Badge>
                  {displayUser?.emailVerified && (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  )}
                </div>
              </div>
            </div>

            <Separator />

            {/* Profile Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Full Name
                </Label>
                <p className="text-gray-900 py-2">
                  {displayUser?.name || "Not provided"}
                </p>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Email Address
                </Label>
                <p className="text-gray-900 py-2">
                  {displayUser?.email || "Not provided"}
                </p>
                <p className="text-sm text-gray-500">Managed by Auth0</p>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Member Since
                </Label>
                <p className="text-gray-900 py-2">
                  {displayUser?.createdAt
                    ? new Date(displayUser.createdAt).toLocaleDateString()
                    : new Date().toLocaleDateString()}
                </p>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Account Status
                </Label>
                <p className="text-gray-900 py-2">
                  {displayUser?.emailVerified
                    ? "Active"
                    : "Pending Verification"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Auth0 Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Account Management
            </CardTitle>
            <CardDescription>
              Your account is managed by Auth0. Use the link above to manage
              your profile, password, and security settings.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 border rounded-lg bg-blue-50">
              <div className="flex items-start gap-3">
                <Shield className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-blue-900">Auth0 Account</h4>
                  <p className="text-sm text-blue-700 mt-1">
                    Your profile information, password, and security settings
                    are managed through Auth0. Click "Manage Account" above to
                    access your Auth0 dashboard where you can update your
                    information.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Profile;
