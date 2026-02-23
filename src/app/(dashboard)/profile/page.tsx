import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { getMyProfile } from "@/actions/profile";
import { ProfileForm } from "@/components/profile/profile-form";

export default async function ProfilePage() {
  const session = await auth();
  if (!session) redirect("/login");

  const profile = await getMyProfile();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Profile"
        description="Manage your account settings"
      />
      <ProfileForm profile={JSON.parse(JSON.stringify(profile))} />
    </div>
  );
}
