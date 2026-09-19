import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import { getMyProfile, updateMyProfile, type UpdateProfileInput } from "@/lib/tracking.functions";

export const MY_PROFILE_KEY = ["myProfile"] as const;

/** The signed-in person's own profile and preferences. */
export function useMyProfile(enabled: boolean) {
  const fetchProfile = useServerFn(getMyProfile);

  return useQuery({
    queryKey: MY_PROFILE_KEY,
    queryFn: () => fetchProfile(),
    enabled,
    staleTime: 60 * 1000,
  });
}

/** Save profile and preference changes. */
export function useUpdateProfile() {
  const queryClient = useQueryClient();
  const save = useServerFn(updateMyProfile);

  return useMutation({
    mutationFn: (input: UpdateProfileInput) => save({ data: input }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: MY_PROFILE_KEY });
    },
  });
}
