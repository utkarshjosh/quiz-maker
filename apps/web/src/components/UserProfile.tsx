import { useAuth } from "@/auth/AuthContext";

const UserProfile = () => {
  const { user, logout, isLoading, fetchUserProfile } = useAuth();

  const handleRefreshProfile = async () => {
    await fetchUserProfile();
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2">
        <div className="loading loading-spinner loading-sm"></div>
        <span>Loading...</span>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="dropdown dropdown-end">
      <div
        tabIndex={0}
        role="button"
        className="btn btn-ghost btn-circle avatar">
        <div className="w-10 rounded-full">
          {user.picture ? (
            <img src={user.picture} alt={user.name || "User"} />
          ) : (
            <div className="bg-neutral text-neutral-content rounded-full w-10 h-10 flex items-center justify-center">
              {user.name?.charAt(0) || user.email?.charAt(0) || "U"}
            </div>
          )}
        </div>
      </div>

      <ul
        tabIndex={0}
        className="mt-3 z-[1] p-2 shadow menu menu-sm dropdown-content bg-base-100 rounded-box w-64">
        <li className="menu-title">
          <span>Account</span>
        </li>

        <li>
          <div className="flex flex-col gap-1 p-2">
            <span className="font-medium">{user.name || "No name"}</span>
            <span className="text-sm text-gray-500">{user.email}</span>
            {user.emailVerified && (
              <span className="badge badge-success badge-sm">Verified</span>
            )}
          </div>
        </li>

        <div className="divider my-1"></div>

        <li>
          <button onClick={handleRefreshProfile} className="text-sm">
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            Refresh Profile
          </button>
        </li>

        <li>
          <button onClick={logout} className="text-error text-sm">
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
              />
            </svg>
            Sign Out
          </button>
        </li>
      </ul>
    </div>
  );
};

export default UserProfile;
