import { useState } from "react";
import { User, Settings, FileText, Trash2, Save, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const Profile = () => {
  const [username, setUsername] = useState("user_f716c6bc4e8b49b51e77");
  const [email] = useState("user@example.com");
  const [profileImage, setProfileImage] = useState("/default-avatar.png");

  const badges = [
    { id: 1, label: "My Quizzes", count: 12, icon: <User className="w-4 h-4" /> },
    { id: 2, label: "Reports", count: 8, icon: <FileText className="w-4 h-4" /> },
    { id: 3, label: "Settings", count: null, icon: <Settings className="w-4 h-4" /> },
  ];

  const quizCategories = ["All (2)", "AI Generated (1)", "No AI (1)", "Private (2)"];

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="py-8">
      <div className="max-w-4xl mx-auto">
        {/* Profile Header */}
        <div className="flex items-start gap-8 mb-8">
          <div className="relative group">
            <img
              src={profileImage}
              alt="Profile"
              className="w-32 h-32 rounded-full object-cover border-4 border-primary"
            />
            <label className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
              <Upload className="w-6 h-6 text-white" />
              <input
                type="file"
                className="hidden"
                accept="image/*"
                onChange={handleImageUpload}
              />
            </label>
          </div>

          <div className="flex-1">
            <h1 className="text-3xl font-bold mb-4">{username}</h1>
            <div className="flex gap-4 flex-wrap">
              {badges.map((badge) => (
                <Badge
                  key={badge.id}
                  variant="outline"
                  className="px-4 py-2 flex items-center gap-2 text-base"
                >
                  {badge.icon}
                  {badge.label}
                  {badge.count !== null && (
                    <span className="ml-2 bg-primary/10 px-2 rounded-full">
                      {badge.count}
                    </span>
                  )}
                </Badge>
              ))}
            </div>
          </div>
        </div>

        <Tabs defaultValue="quizzes" className="space-y-4">
          <TabsList>
            <TabsTrigger value="quizzes">My Quizzes</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="quizzes" className="space-y-4">
            {/* Quiz Categories */}
            <div className="flex gap-2 flex-wrap">
              {quizCategories.map((category) => (
                <Badge
                  key={category}
                  variant="secondary"
                  className="cursor-pointer hover:bg-secondary/80"
                >
                  {category}
                </Badge>
              ))}
            </div>

            {/* Quiz Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Card className="p-4">
                <div className="aspect-video bg-muted rounded-lg mb-4" />
                <h3 className="font-semibold">Untitled Quiz</h3>
                <p className="text-sm text-muted-foreground">Jul 27, 2025</p>
              </Card>
              <Card className="p-4">
                <div className="aspect-video bg-muted rounded-lg mb-4" />
                <h3 className="font-semibold">Information Technology Skills</h3>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">AI Generated</Badge>
                  <p className="text-sm text-muted-foreground">Jul 25, 2025</p>
                </div>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Profile Settings</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Username</label>
                  <Input
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="max-w-md"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Email</label>
                  <Input
                    value={email}
                    disabled
                    className="max-w-md bg-muted"
                  />
                  <p className="text-sm text-muted-foreground mt-1">Email cannot be changed</p>
                </div>

                <Button variant="outline" className="w-full max-w-md">
                  Reset Password
                </Button>

                <Separator />

                <div className="flex justify-between items-center pt-4">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive">
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete Account
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This action cannot be undone. This will permanently delete your
                          account and remove your data from our servers.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction className="bg-destructive">
                          Delete Account
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>

                  <Button className="gap-2">
                    <Save className="w-4 h-4" />
                    Save Changes
                  </Button>
                </div>
              </div>
            </Card>

            <Alert>
              <AlertDescription>
                Changes to your profile will be saved immediately when you click "Save Changes".
              </AlertDescription>
            </Alert>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Profile; 