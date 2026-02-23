"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Image from "next/image";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Camera, Loader2, Trash2 } from "lucide-react";
import {
  updateMyProfile,
  updateMyImage,
  changeMyPassword,
} from "@/actions/profile";

interface ProfileData {
  id: string;
  name: string;
  email: string;
  image: string | null;
  createdAt: string;
  lastLoginAt: string | null;
  role: { name: string };
}

function getInitials(name: string): string {
  const parts = name.split(" ").filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

export function ProfileForm({ profile }: { profile: ProfileData }) {
  const router = useRouter();
  const [name, setName] = useState(profile.name);
  const [savingName, setSavingName] = useState(false);
  const [imageUrl, setImageUrl] = useState(profile.image);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", "avatars");

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const contentType = res.headers.get("content-type") ?? "";
      if (!contentType.includes("application/json")) {
        toast.error("Upload failed — session may have expired");
        return;
      }

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Upload failed");
        return;
      }

      // Save to database
      const result = await updateMyImage(data.url);
      if ("error" in result) {
        toast.error(result.error);
        return;
      }

      setImageUrl(data.url);
      toast.success("Profile picture updated");
      router.refresh();
    } catch {
      toast.error("Failed to upload image");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleRemoveImage() {
    try {
      const result = await updateMyImage(null);
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      setImageUrl(null);
      toast.success("Profile picture removed");
      router.refresh();
    } catch {
      toast.error("Failed to remove image");
    }
  }

  async function handleUpdateName(e: React.FormEvent) {
    e.preventDefault();
    setSavingName(true);
    try {
      const result = await updateMyProfile({ name });
      if ("error" in result) {
        toast.error(result.error);
      } else {
        toast.success("Profile updated");
        router.refresh();
      }
    } catch {
      toast.error("Failed to update profile");
    } finally {
      setSavingName(false);
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    setSavingPassword(true);
    try {
      const result = await changeMyPassword({
        currentPassword,
        newPassword,
      });
      if ("error" in result) {
        toast.error(result.error);
      } else {
        toast.success("Password changed successfully");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      }
    } catch {
      toast.error("Failed to change password");
    } finally {
      setSavingPassword(false);
    }
  }

  return (
    <div className="grid gap-6 max-w-2xl">
      {/* Profile Picture Card */}
      <Card>
        <CardHeader>
          <CardTitle>Profile Picture</CardTitle>
          <CardDescription>
            Upload a profile picture to personalize your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-6">
            <div className="relative">
              <Avatar className="size-20">
                {imageUrl && (
                  <AvatarImage src={imageUrl} alt={name} />
                )}
                <AvatarFallback className="text-lg">
                  {getInitials(name)}
                </AvatarFallback>
              </Avatar>
              {uploading && (
                <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50">
                  <Loader2 className="size-6 animate-spin text-white" />
                </div>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  <Camera className="mr-2 size-4" />
                  {imageUrl ? "Change Picture" : "Upload Picture"}
                </Button>
                {imageUrl && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleRemoveImage}
                    disabled={uploading}
                  >
                    <Trash2 className="mr-2 size-4" />
                    Remove
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                JPEG, PNG, WebP, or GIF. Max 5MB.
              </p>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={handleImageUpload}
            />
          </div>
        </CardContent>
      </Card>

      {/* Profile Info Card */}
      <Card>
        <CardHeader>
          <CardTitle>Profile Information</CardTitle>
          <CardDescription>Update your display name</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpdateName} className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="profile-name">Name</Label>
              <Input
                id="profile-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="profile-email">Email</Label>
              <Input
                id="profile-email"
                value={profile.email}
                disabled
                className="text-muted-foreground"
              />
            </div>

            <div className="grid gap-2">
              <Label>Role</Label>
              <div>
                <Badge variant="outline">{profile.role.name}</Badge>
              </div>
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={savingName || name === profile.name}>
                {savingName ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Change Password Card */}
      <Card>
        <CardHeader>
          <CardTitle>Change Password</CardTitle>
          <CardDescription>
            Update your password. You&apos;ll need to enter your current password.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="current-password">Current Password</Label>
              <Input
                id="current-password"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="new-password">New Password</Label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Min. 8 characters"
                required
                minLength={8}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="confirm-password">Confirm New Password</Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
              />
            </div>

            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={savingPassword || !currentPassword || !newPassword || !confirmPassword}
              >
                {savingPassword ? "Changing..." : "Change Password"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
